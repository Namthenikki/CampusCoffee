import { SLOTS_PER_DAY, type GroupPost, type Match, type Message, type User } from "../types";

// Maps between Postgres rows (snake_case) and the app's User shape (camelCase),
// so the rest of the codebase and the frontend never see snake_case.

type Row = Record<string, unknown>;

const DEFAULT_WEIGHTS = { interest: 0.45, proximity: 0.2, prompt: 0.2, reliability: 0.15 };
const emptyTimetable = () => Array.from({ length: 6 }, () => Array(SLOTS_PER_DAY).fill(false));

export function rowToUser(row: Row, email: string): User {
  const timetable = row.timetable as boolean[][] | undefined;
  return {
    id: row.id as string,
    email,
    name: row.name as string,
    fullName: (row.full_name as string) ?? "",
    bio: (row.bio as string) ?? "",
    gender: row.gender as User["gender"],
    branch: row.branch as string,
    year: row.year as number,
    diet: row.diet as User["diet"],
    messSlot: row.mess_slot as User["messSlot"],
    mealFreq: row.meal_freq as number,
    interests: (row.interests as string[]) ?? [],
    subjects: (row.subjects as string[]) ?? [],
    studyStyle: row.study_style as User["studyStyle"],
    prompt: (row.prompt as User["prompt"]) ?? null,
    timetable: Array.isArray(timetable) && timetable.length ? timetable : emptyTimetable(),
    examMode: !!row.exam_mode,
    blindOptIn: !!row.blind_opt_in,
    openOptIn: !!row.open_opt_in,
    showBranchInBlind: row.show_branch_in_blind !== false,
    // Reliability + weights deliberately never come from a profile read — they
    // live in private_stats and only the matching engine (service role) loads
    // them. These defaults are placeholders for the non-matching paths.
    reliability: 0.85,
    weights: DEFAULT_WEIGHTS,
    bot: !!row.bot,
    createdAt: row.created_at ? new Date(row.created_at as string).getTime() : Date.now(),
    onboarded: !!row.onboarded,
    verified: !!row.verified,
  };
}

// Only these fields can be written from the client, mapped to their columns.
const EDITABLE: Record<string, string> = {
  fullName: "full_name",
  bio: "bio",
  gender: "gender",
  branch: "branch",
  year: "year",
  diet: "diet",
  messSlot: "mess_slot",
  mealFreq: "meal_freq",
  interests: "interests",
  subjects: "subjects",
  studyStyle: "study_style",
  prompt: "prompt",
  timetable: "timetable",
  examMode: "exam_mode",
  blindOptIn: "blind_opt_in",
  openOptIn: "open_opt_in",
  showBranchInBlind: "show_branch_in_blind",
  onboarded: "onboarded",
};

export function profileUpdate(patch: Record<string, unknown>): Row {
  const out: Row = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k in EDITABLE) out[EDITABLE[k]] = v;
  }
  return out;
}

const ms = (v: unknown) => (v ? new Date(v as string).getTime() : null);

export function rowToMatch(row: Row): Match {
  return {
    id: row.id as string,
    serial: row.serial as string,
    kind: row.kind as Match["kind"],
    users: [row.user_a as string, row.user_b as string],
    state: row.state as Match["state"],
    createdAt: ms(row.created_at) ?? Date.now(),
    expiresAt: ms(row.expires_at),
    slot: (row.slot as Match["slot"]) ?? null,
    studySlot: (row.study_slot as Match["studySlot"]) ?? null,
    decisions: (row.decisions as Match["decisions"]) ?? {},
    cancels: (row.cancels as Match["cancels"]) ?? {},
    checkin: (row.checkin as Match["checkin"]) ?? { accumMs: 0, lastCreditAt: 0, pings: {}, success: false },
    reveal: (row.reveal as Match["reveal"]) ?? { photos: {}, outcome: null, votes: {} },
    mealCount: (row.meal_count as number) ?? 0,
    lastMealAt: ms(row.last_meal_at),
  };
}

// Only the mutable parts of a match — id/kind/users never change after creation.
export function matchUpdate(m: Match): Row {
  return {
    state: m.state,
    expires_at: m.expiresAt ? new Date(m.expiresAt).toISOString() : null,
    slot: m.slot,
    study_slot: m.studySlot,
    decisions: m.decisions,
    cancels: m.cancels,
    checkin: m.checkin,
    reveal: m.reveal,
    meal_count: m.mealCount,
    last_meal_at: m.lastMealAt ? new Date(m.lastMealAt).toISOString() : null,
  };
}

export function rowToMessage(row: Row): Message {
  return {
    id: row.id as string,
    matchId: row.match_id as string,
    from: row.sender as string,
    text: row.text as string,
    at: ms(row.created_at) ?? Date.now(),
  };
}

export function rowToPost(row: Row): GroupPost {
  return {
    id: row.id as string,
    kind: row.kind as GroupPost["kind"],
    by: row.author as string,
    text: row.text as string,
    slotLabel: row.slot_label as string,
    needed: row.needed as number,
    joined: (row.joined as string[]) ?? [],
    at: ms(row.created_at) ?? Date.now(),
  };
}
