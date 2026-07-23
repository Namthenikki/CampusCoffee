import { getDb, persist } from "@/lib/db";
import { createMatch } from "@/lib/matchflow";
import { currentUser, json, unauthorized } from "@/lib/session";

// "Send a brew" — an intentional single request, not a swipe. A match forms
// only when both sides brewed each other. Demo bots accept most brews so the
// campus feels alive before real traction.
export async function POST(req: Request) {
  const me = await currentUser(req);
  if (!me) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const mode: "blind" | "open" = body.mode === "blind" ? "blind" : "open";
  const db = await getDb();
  const other = db.users.find((u) => u.id === body.userId);
  if (!other) return json({ error: "User not found" }, { status: 404 });

  if (!db.likes.some((l) => l.from === me.id && l.to === other.id && l.mode === mode)) {
    db.likes.push({ from: me.id, to: other.id, mode, at: Date.now() });
  }
  const reciprocal =
    db.likes.some((l) => l.from === other.id && l.to === me.id && l.mode === mode) ||
    (other.bot && Math.random() < 0.85);

  if (!reciprocal) {
    await persist();
    return json({ matched: false }); // quiet — no rejection ever surfaces
  }
  const existing = db.matches.find(
    (m) => m.kind === mode && m.users.includes(me.id) && m.users.includes(other.id),
  );
  if (existing) return json({ matched: true, matchId: existing.id });
  const match = await createMatch(db, mode, me.id, other.id);
  await persist();
  return json({ matched: true, matchId: match.id });
}
