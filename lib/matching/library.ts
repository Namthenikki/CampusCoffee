import type { Match, User } from "../types";
import { SLOTS_PER_DAY } from "../types";

export interface LibraryCandidate {
  user: User;
  score: number;
  overlap: { day: number; slot: number }[];
  subjectsShared: string[];
  examBoost: boolean;
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length && !b.length) return 0;
  const sa = new Set(a);
  const inter = b.filter((x) => sa.has(x)).length;
  return inter / (new Set([...a, ...b]).size || 1);
}

// silent+silent and discussion+discussion are ideal; mixed bridges both;
// silent+discussion is a genuinely bad session.
function styleCompat(a: User["studyStyle"], b: User["studyStyle"]): number {
  if (a === b) return 1;
  if (a === "mixed" || b === "mixed") return 0.7;
  return 0.2;
}

export function freeOverlap(a: User, b: User): { day: number; slot: number }[] {
  const out: { day: number; slot: number }[] = [];
  for (let d = 0; d < 6; d++)
    for (let s = 0; s < SLOTS_PER_DAY; s++)
      if (a.timetable[d]?.[s] && b.timetable[d]?.[s]) out.push({ day: d, slot: s });
  return out;
}

export function libraryCandidates(me: User, all: User[], matches: Match[]): LibraryCandidate[] {
  // Past successful sessions between pairs — the tiebreaker signal.
  const sessionsWith = new Map<string, number>();
  for (const m of matches) {
    if (m.kind !== "library" || !m.users.includes(me.id) || m.state !== "met") continue;
    const other = m.users[0] === me.id ? m.users[1] : m.users[0];
    sessionsWith.set(other, (sessionsWith.get(other) ?? 0) + 1);
  }
  const activeWith = new Set(
    matches
      .filter((m) => m.kind === "library" && m.users.includes(me.id) && m.state === "active")
      .map((m) => (m.users[0] === me.id ? m.users[1] : m.users[0])),
  );

  return all
    .filter((u) => u.id !== me.id && u.onboarded && !activeWith.has(u.id))
    .map((u) => ({ u, overlap: freeOverlap(me, u) }))
    // HARD FILTER: zero real overlap = excluded entirely, not ranked low
    .filter(({ overlap }) => overlap.length > 0)
    .map(({ u, overlap }) => {
      const shared = u.subjects.filter((s) => me.subjects.includes(s));
      const history = Math.min(1, (sessionsWith.get(u.id) ?? 0) / 3);
      const examBoost = me.examMode && u.examMode;
      const score =
        0.5 * jaccard(me.subjects, u.subjects) +
        0.3 * styleCompat(me.studyStyle, u.studyStyle) +
        0.2 * history +
        (examBoost ? 0.15 : 0); // exam-week urgency stacks on top
      return { user: u, score, overlap, subjectsShared: shared, examBoost };
    })
    .sort((a, b) => b.score - a.score);
}
