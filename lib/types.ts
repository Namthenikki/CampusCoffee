export type Diet = "veg" | "egg" | "nonveg";
export type MessSlot = "early" | "mid" | "late";
export type StudyStyle = "silent" | "discussion" | "mixed";
export type MatchKind = "mess" | "library" | "blind" | "open";
export type Gender = "male" | "female" | "other";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const SLOTS_PER_DAY = 14; // 08:00 → 22:00, hourly
export const SLOT_LABELS = Array.from({ length: SLOTS_PER_DAY }, (_, i) => {
  const h = 8 + i;
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
});

export interface User {
  id: string;
  email: string;
  name: string;
  gender: Gender;
  interestedIn: Gender | "everyone";
  branch: string;
  year: number;
  hostel: string;
  diet: Diet;
  messSlot: MessSlot;
  mealFreq: number; // mess meals per week, 0–21
  interests: string[];
  subjects: string[];
  studyStyle: StudyStyle;
  prompt: { q: string; a: string } | null;
  timetable: boolean[][]; // [day][slot] — true means FREE
  examMode: boolean;
  blindOptIn: boolean;
  openOptIn: boolean;
  showBranchInBlind: boolean;
  reliability: number; // 0–1, strictly private
  weights: { interest: number; proximity: number; prompt: number; reliability: number };
  bot: boolean;
  createdAt: number;
  onboarded: boolean;
}

export type MatchState =
  | "active" // chatting (mess/library/blind/open)
  | "decision" // blind window expired, both privately answer "meet?"
  | "meet_scheduled" // both said yes, slot + cafe locked
  | "met" // checkin succeeded
  | "dissolved" // quiet dissolve — other side never sees a rejection
  | "expired";

export interface Match {
  id: string;
  serial: string; // token serial, e.g. CC-0042
  kind: MatchKind;
  users: [string, string];
  state: MatchState;
  createdAt: number;
  expiresAt: number | null; // blind: createdAt + 48h
  slot: { label: string; cafe: string; startsAt: number; endsAt: number } | null;
  studySlot: { day: number; slot: number } | null; // library locked slot
  decisions: Record<string, "yes" | "no">;
  cancels: Record<string, { at: number; honest: boolean }>;
  checkin: {
    accumMs: number;
    lastCreditAt: number;
    pings: Record<string, { t: number; lat: number; lng: number }>;
    success: boolean;
  };
  reveal: {
    photos: Record<string, { dataUrl: string; blurred: boolean; kind: "shared" | "solo" }>;
    outcome: "match" | "not_match" | null;
    votes: Record<string, "well" | "not">;
  };
  mealCount: number; // mess recurring-pair streak
  lastMealAt: number | null;
}

export interface Message {
  id: string;
  matchId: string;
  from: string;
  text: string;
  at: number;
}

export interface GroupPost {
  id: string;
  kind: "mess" | "library";
  by: string;
  text: string;
  slotLabel: string;
  needed: number;
  joined: string[];
  at: number;
}

export interface Like {
  from: string;
  to: string;
  mode: "blind" | "open";
  at: number;
}

export interface DB {
  users: User[];
  matches: Match[];
  messages: Message[];
  posts: GroupPost[];
  likes: Like[];
  seq: number;
}

export const BRANCHES = ["CSE", "ECE", "EE", "ME", "CE", "IT", "BT", "MBA"];
export const HOSTELS = ["Block A", "Block B", "Block C", "Block D", "Block E", "Day Scholar"];
export const INTEREST_POOL = [
  "anime", "cricket", "football", "gym", "indie music", "bollywood", "standup",
  "photography", "coding", "startups", "poetry", "gaming", "trekking", "F1",
  "cooking", "chess", "sketching", "k-drama", "old hindi songs", "badminton",
  "reading", "filmmaking", "quizzing", "dance",
];
export const SUBJECT_POOL = [
  "DSA", "OS", "DBMS", "Networks", "Maths III", "Signals", "Thermo",
  "Machine Design", "Circuits", "Eco", "ML", "COA", "Fluid Mech", "Control Systems",
];
export const PROMPTS = [
  "My most controversial campus opinion is…",
  "The song I loop during exams is…",
  "Best 3am spot on campus is…",
  "I will never shut up about…",
  "My mess-food survival hack is…",
];
export const CAFES = [
  "Kaka's Tapri, Main Gate",
  "Night Canteen",
  "Nescafé Kiosk, Academic Block",
  "Amul Parlour, Sports Complex",
  "CCD, North Gate",
];

// Blind Coffee window + checkin constants
export const BLIND_WINDOW_MS = 48 * 60 * 60 * 1000;
export const CHECKIN_RADIUS_M = 30;
export const CHECKIN_REQUIRED_MS = 10 * 60 * 1000;
export const HONEST_CANCEL_NOTICE_MS = 2 * 60 * 60 * 1000;
