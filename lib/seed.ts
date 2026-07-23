import {
  BRANCHES, HOSTELS, INTEREST_POOL, PROMPTS, SLOTS_PER_DAY, SUBJECT_POOL,
  type DB, type Diet, type Gender, type MessSlot, type StudyStyle, type User,
} from "./types";

// Deterministic RNG so every fresh install seeds the same campus.
function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FEMALE = ["Ananya", "Priya", "Sneha", "Ishita", "Meera", "Riya", "Tanvi", "Zoya", "Kavya", "Nandini", "Shreya", "Aisha"];
const MALE = ["Arjun", "Rohan", "Aditya", "Karan", "Vikram", "Sameer", "Dev", "Harsh", "Nikhil", "Pranav", "Rahul", "Yash"];

export function seedDb(): DB {
  const rnd = mulberry32(20260722);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
  const sample = <T,>(arr: readonly T[], n: number): T[] => {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
    return out;
  };

  const timetable = () =>
    Array.from({ length: 6 }, () =>
      Array.from({ length: SLOTS_PER_DAY }, (_, s) => {
        // Mornings mostly in class, evenings mostly free — like a real timetable.
        const freeChance = s < 5 ? 0.2 : s < 8 ? 0.45 : 0.75;
        return rnd() < freeChance;
      }),
    );

  const users: User[] = [...FEMALE.map((n) => ({ n, g: "female" as Gender })), ...MALE.map((n) => ({ n, g: "male" as Gender }))]
    .map(({ n, g }, i) => ({
      id: `bot-${i + 1}`,
      email: `${n.toLowerCase()}@campus.demo`,
      name: n,
      gender: g,
      interestedIn: (rnd() < 0.9 ? (g === "female" ? "male" : "female") : "everyone") as User["interestedIn"],
      branch: pick(BRANCHES),
      year: 1 + Math.floor(rnd() * 4),
      hostel: pick(HOSTELS),
      diet: pick(["veg", "veg", "egg", "nonveg", "nonveg"] as Diet[]),
      messSlot: pick(["early", "mid", "mid", "late"] as MessSlot[]),
      mealFreq: 6 + Math.floor(rnd() * 15),
      interests: sample(INTEREST_POOL, 3 + Math.floor(rnd() * 3)),
      subjects: sample(SUBJECT_POOL, 2 + Math.floor(rnd() * 3)),
      studyStyle: pick(["silent", "silent", "discussion", "mixed", "mixed"] as StudyStyle[]),
      prompt: { q: pick(PROMPTS), a: pick(PROMPT_ANSWERS) },
      timetable: timetable(),
      examMode: rnd() < 0.3,
      blindOptIn: rnd() < 0.8,
      openOptIn: rnd() < 0.8,
      showBranchInBlind: rnd() < 0.7,
      reliability: 0.45 + rnd() * 0.55,
      weights: { interest: 0.45, proximity: 0.2, prompt: 0.2, reliability: 0.15 },
      bot: true,
      createdAt: Date.now() - Math.floor(rnd() * 30 * 864e5),
      onboarded: true,
    }));

  return { users, matches: [], messages: [], posts: [], likes: [], seq: 0 };
}

const PROMPT_ANSWERS = [
  "maggi at 2am fixes everything, no debate",
  "the rooftop of the old academic block",
  "lo-fi until 4am, then regret",
  "campus dogs deserve student IDs",
  "mess dal is a personality test",
  "one earphone shared = instant friendship",
  "I rate every chai tapri out of 10 in my notes app",
  "third bench, left row — best seat in every class",
];
