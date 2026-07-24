import type { Match, User } from "../types";

// Diet compatibility: veg↔veg, veg↔egg, egg↔anyone, nonveg↔nonveg/egg.
// Veg and nonveg don't hard-pair — the single biggest real-world mess friction.
function dietCompatible(a: User, b: User): boolean {
  if (a.diet === "egg" || b.diet === "egg") return true;
  return a.diet === b.diet;
}

// Hostel proximity used to be a third hard filter. We no longer ask students
// where they live, so slot + diet carry the filtering and the mess itself is
// the meeting point anyway.

export interface MessCandidate {
  user: User;
  score: number;
  recurring: boolean; // proven pair — auto-suggested before fresh matches
  streak: number;
}

// Spec-faithful: hard filters are a WHERE clause, soft ranking is ORDER BY.
export function messCandidates(me: User, all: User[], matches: Match[]): MessCandidate[] {
  const provenPartners = new Map<string, number>(); // partnerId -> meal streak
  for (const m of matches) {
    if (m.kind !== "mess" || !m.users.includes(me.id)) continue;
    if (m.mealCount >= 2) {
      const other = m.users[0] === me.id ? m.users[1] : m.users[0];
      provenPartners.set(other, m.mealCount);
    }
  }
  const alreadyActive = new Set(
    matches
      .filter((m) => m.kind === "mess" && m.users.includes(me.id) && m.state === "active")
      .map((m) => (m.users[0] === me.id ? m.users[1] : m.users[0])),
  );

  return all
    .filter((u) => u.id !== me.id && u.onboarded && u.messReady && !alreadyActive.has(u.id))
    // HARD FILTERS — excluded entirely, not ranked low
    .filter((u) => u.messSlot === me.messSlot)
    .filter((u) => dietCompatible(me, u))
    .map((u) => {
      // SOFT RANKING
      const freqSim = 1 - Math.abs(me.mealFreq - u.mealFreq) / 21;
      const score =
        0.7 * freqSim +
        0.18 * (u.branch === me.branch ? 1 : 0) +
        0.12 * (u.year === me.year ? 1 : 0);
      return {
        user: u,
        score,
        recurring: provenPartners.has(u.id),
        streak: provenPartners.get(u.id) ?? 0,
      };
    })
    // Proven pairs float to the top regardless of raw score
    .sort((a, b) => Number(b.recurring) - Number(a.recurring) || b.score - a.score);
}
