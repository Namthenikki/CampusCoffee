import type { Match, User } from "./types";

// Everything the client sees goes through here. Reliability scores, emails,
// and learned weights NEVER leave the server. Blind partners stay anonymous
// until the match earns the reveal.

export interface PublicUser {
  id: string;
  name: string; // first initial only while blind
  branch: string | null;
  year: number | null;
  fullName: string;
  bio: string;
  diet: User["diet"];
  messSlot: User["messSlot"];
  mealFreq: number;
  interests: string[];
  subjects: string[];
  studyStyle: User["studyStyle"];
  prompt: { q: string; a: string } | null;
  anonymous: boolean;
}

export function publicUser(u: User, opts?: { anonymous?: boolean }): PublicUser {
  const anon = opts?.anonymous ?? false;
  return {
    id: u.id,
    name: anon ? `${u.name[0]}.` : u.name,
    branch: anon && !u.showBranchInBlind ? null : u.branch,
    year: u.year,
    // Blind partners stay a first initial with no bio — the bio is exactly
    // the kind of detail that would give them away.
    fullName: anon ? "" : u.fullName,
    bio: anon ? "" : u.bio,
    diet: u.diet,
    messSlot: u.messSlot,
    mealFreq: u.mealFreq,
    interests: u.interests.slice(0, anon ? 3 : 8),
    subjects: u.subjects,
    studyStyle: u.studyStyle,
    prompt: u.prompt,
    anonymous: anon,
  };
}

// Blind partners stay anonymous through chat + decision + the meet itself;
// first name unlocks once you've actually met, full reveal only on mutual
// "went well".
export function partnerIsAnonymous(match: Match, forState = match.state): boolean {
  if (match.kind !== "blind") return false;
  if (match.reveal.outcome === "match") return false;
  if (forState === "met") return false;
  return true;
}

// `other` is the partner's profile, loaded by the caller from the database.
export function matchView(match: Match, other: User | null, me: User) {
  const otherId = match.users[0] === me.id ? match.users[1] : match.users[0];
  const anon = partnerIsAnonymous(match);
  const photos = Object.fromEntries(
    Object.entries(match.reveal.photos).map(([owner, p]) => [
      owner,
      // Blur is applied at view time from stored state — never baked in.
      // Your own photo you always see clear; others' respect their toggle.
      { owner, kind: p.kind, blurred: p.blurred, dataUrl: owner === me.id || !p.blurred ? p.dataUrl : null },
    ]),
  );
  return {
    id: match.id,
    serial: match.serial,
    kind: match.kind,
    state: match.state,
    createdAt: match.createdAt,
    expiresAt: match.expiresAt,
    slot: match.slot,
    studySlot: match.studySlot,
    myDecision: match.decisions[me.id] ?? null,
    partner: other ? publicUser(other, { anonymous: anon }) : null,
    partnerIsBot: other?.bot ?? false,
    checkin: {
      accumMs: match.checkin.accumMs,
      success: match.checkin.success,
      partnerPinging: !!(match.checkin.pings[otherId] && Date.now() - match.checkin.pings[otherId].t < 45_000),
    },
    reveal: {
      outcome: match.reveal.outcome,
      myVote: match.reveal.votes[me.id] ?? null,
      voted: Object.keys(match.reveal.votes).length,
      photos,
    },
    mealCount: match.mealCount,
  };
}
