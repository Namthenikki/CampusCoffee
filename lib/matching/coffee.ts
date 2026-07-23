import type { Match, User } from "../types";
import { reliabilityThreshold } from "../reliability";

// Shared engine for Blind Coffee and Coffee Date. Identical scoring — the only
// difference between the two products is presentation (anonymous vs visible).

export interface CoffeeCandidate {
  user: User;
  score: number;
  parts: { interest: number; proximity: number; prompt: number; reliability: number };
  sharedInterests: string[];
}

function jaccard<T>(a: T[], b: T[]): number {
  if (!a.length && !b.length) return 0;
  const sa = new Set(a);
  const inter = b.filter((x) => sa.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
}

const STOPWORDS = new Set(["the", "a", "an", "is", "i", "my", "at", "of", "to", "and", "in", "on", "it"]);
function tokens(s: string): string[] {
  return s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

export function scorePair(me: User, u: User): CoffeeCandidate {
  const parts = {
    interest: jaccard(me.interests, u.interests),
    proximity: 0.5 * (u.branch === me.branch ? 1 : 0) + 0.5 * (1 - Math.min(3, Math.abs(u.year - me.year)) / 3),
    prompt: me.prompt && u.prompt ? jaccard(tokens(me.prompt.a), tokens(u.prompt.a)) : 0,
    reliability: u.reliability,
  };
  // Per-user learned weights (feedback loop below nudges these over time)
  const w = me.weights;
  const wSum = w.interest + w.proximity + w.prompt + w.reliability || 1;
  const score =
    (w.interest * parts.interest +
      w.proximity * parts.proximity +
      w.prompt * parts.prompt +
      w.reliability * parts.reliability) / wSum;
  return {
    user: u,
    score,
    parts,
    sharedInterests: u.interests.filter((i) => me.interests.includes(i)),
  };
}

// The dating side pairs across genders only — never two people of the same
// gender. Mess and Library stay open to everyone; this rule is specific to
// Blind Coffee and Coffee Date, so it lives here rather than in shared code.
function differentGender(a: User, b: User): boolean {
  return a.gender !== b.gender;
}

export function coffeeCandidates(
  me: User,
  all: User[],
  matches: Match[],
  mode: "blind" | "open",
): CoffeeCandidate[] {
  const threshold = reliabilityThreshold(all.length);
  // Never re-surface someone you already have (or had) a dating thread with.
  const seen = new Set<string>();
  for (const m of matches) {
    if ((m.kind === "blind" || m.kind === "open") && m.users.includes(me.id)) {
      seen.add(m.users[0] === me.id ? m.users[1] : m.users[0]);
    }
  }

  const eligible = all.filter(
    (u) =>
      u.id !== me.id &&
      u.onboarded &&
      (mode === "blind" ? u.blindOptIn : u.openOptIn) &&
      !seen.has(u.id) &&
      differentGender(me, u) &&
      u.reliability >= threshold, // serial no-shows quietly deprioritized
  );

  const scored = eligible.map((u) => scorePair(me, u)).sort((a, b) => b.score - a.score);

  // Cold start (<100 users): don't over-engineer — filters above did the work,
  // rank by whatever signal exists and let the feedback loop take over later.
  if (all.length < 100) return scored;
  return scored;
}

// CONTROLLED RANDOMNESS — surface from the top 5, softmax-weighted, so the
// queue isn't a deterministic leaderboard but never serves a bad match.
export function servePool(candidates: CoffeeCandidate[], n = 3): CoffeeCandidate[] {
  const top = candidates.slice(0, 5);
  const out: CoffeeCandidate[] = [];
  const pool = [...top];
  const T = 0.15; // temperature: mostly-best with real variety
  while (out.length < Math.min(n, top.length) && pool.length) {
    const weights = pool.map((c) => Math.exp(c.score / T));
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      r -= weights[idx];
      if (r <= 0) break;
    }
    out.push(pool.splice(Math.min(idx, pool.length - 1), 1)[0]);
  }
  return out;
}

// FEEDBACK LOOP — the real lever. After a date resolves, nudge each user's
// weight vector toward the components that predicted this partner if it went
// well, away from them if it didn't. Small learning rate; renormalized.
export function applyOutcomeFeedback(user: User, partner: User, wentWell: boolean): void {
  const { parts } = scorePair(user, partner);
  const lr = wentWell ? 0.15 : -0.06;
  const w = user.weights;
  const keys = ["interest", "proximity", "prompt", "reliability"] as const;
  for (const k of keys) {
    // Components that scored high for this pair get credit/blame.
    w[k] = Math.max(0.05, w[k] + lr * parts[k] * w[k]);
  }
  const sum = keys.reduce((s, k) => s + w[k], 0);
  for (const k of keys) w[k] = w[k] / sum;
}
