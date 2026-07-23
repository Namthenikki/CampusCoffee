import type { DB, Match, User } from "./types";
import { uid } from "./db";

// Seeded demo users behave like a live campus: they reply in chat, accept
// brew requests, and answer the meet prompt. Clearly demo-only — delete this
// module when real students arrive.

const REPLIES: Record<string, string[]> = {
  mess: [
    "dinner at 8? I'll grab the corner table",
    "if it's paneer day I'm there early, fair warning",
    "cool cool, see you at the mess gate",
    "I always sit near the water cooler side, find me there",
  ],
  library: [
    "2nd floor silent zone works for me",
    "I'll bring my DSA notes, you get the OS ones?",
    "locked. don't be late or the good seats are gone",
    "okay but 10 min chai break in the middle, non-negotiable",
  ],
  blind: [
    "okay that's actually a hot take, respect",
    "no way, I thought I was the only one",
    "you're either really fun or really good at texting, unclear yet",
    "not telling you my branch yet, that's the whole point na",
    "alright you get one hint: my hostel has the worst wifi on campus",
  ],
  open: [
    "your playlist better be as good as your bio claims",
    "okay I know that tapri, their cutting chai is elite",
    "so are we doing this coffee thing or just vibing in chat forever",
    "fair warning: I will judge you by your maggi order",
  ],
};

export function maybeBotReply(db: DB, match: Match, me: User): void {
  const otherId = match.users[0] === me.id ? match.users[1] : match.users[0];
  const other = db.users.find((u) => u.id === otherId);
  if (!other?.bot) return;
  const msgs = db.messages.filter((m) => m.matchId === match.id).sort((a, b) => a.at - b.at);
  const last = msgs[msgs.length - 1];
  // Reply once the human's last message is ~4s old and unanswered.
  if (!last || last.from !== me.id || Date.now() - last.at < 4000) return;
  const pool = REPLIES[match.kind] ?? REPLIES.open;
  const used = new Set(msgs.filter((m) => m.from === otherId).map((m) => m.text));
  const fresh = pool.filter((t) => !used.has(t));
  const text = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
  db.messages.push({ id: uid(), matchId: match.id, from: otherId, text, at: Date.now() });
}
