import { getDb, persist } from "@/lib/db";
import { freeOverlap } from "@/lib/matching/library";
import { createMatch } from "@/lib/matchflow";
import { currentUser, json, unauthorized } from "@/lib/session";

// Chat unlocks ONLY after a real overlapping free slot is locked — a library
// match cannot exist without one. The slot is validated against both
// timetables server-side, not trusted from the client.
export async function POST(req: Request) {
  const me = await currentUser(req);
  if (!me) return unauthorized();
  const { userId, day, slot } = await req.json().catch(() => ({}));
  const db = await getDb();
  const other = db.users.find((u) => u.id === userId);
  if (!other) return json({ error: "User not found" }, { status: 404 });
  const overlap = freeOverlap(me, other);
  const valid = overlap.some((o) => o.day === day && o.slot === slot);
  if (!valid) return json({ error: "That slot isn't free for both of you" }, { status: 400 });
  const existing = db.matches.find(
    (m) => m.kind === "library" && m.users.includes(me.id) && m.users.includes(other.id) && m.state === "active",
  );
  if (existing) return json({ matchId: existing.id });
  const match = await createMatch(db, "library", me.id, other.id);
  match.studySlot = { day, slot };
  await persist();
  return json({ matchId: match.id });
}
