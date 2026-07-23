import type { User } from "./types";

// Private score, EWMA. Honest cancellations and inconclusive checkins are
// neutral by design — only silent no-shows hurt.
export type ReliabilityOutcome = "showed" | "noshow" | "honest_cancel" | "inconclusive";

export function updateReliability(user: User, outcome: ReliabilityOutcome): void {
  if (outcome === "honest_cancel" || outcome === "inconclusive") return;
  const value = outcome === "showed" ? 1 : 0;
  user.reliability = Math.min(1, Math.max(0, 0.8 * user.reliability + 0.2 * value));
}

// Below this, a user is deprioritized (filtered) from dating queues.
// Cold-start campuses (<100 users) use a forgiving threshold.
export function reliabilityThreshold(totalUsers: number): number {
  return totalUsers < 100 ? 0.25 : 0.4;
}
