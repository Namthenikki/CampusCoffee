import { addMessage, getMatchFor, getProfile, listMessages, saveMatch } from "@/lib/data/repo";
import { tickMatch } from "@/lib/matchflow";
import { matchView } from "@/lib/serialize";
import { currentUser, json, unauthorized } from "@/lib/session";

type Ctx = { params: Promise<{ matchId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const { matchId } = await ctx.params;
  const match = await getMatchFor(matchId, me.id);
  if (!match) return json({ error: "Match not found" }, { status: 404 });

  const before = match.state;
  tickMatch(match);
  if (match.state !== before) await saveMatch(match);

  const otherId = match.users[0] === me.id ? match.users[1] : match.users[0];
  const [other, messages] = await Promise.all([getProfile(otherId), listMessages(match.id)]);
  return json({ match: matchView(match, other, me), messages });
}

// During the blind phase the mystery is the whole point, so contact details
// stay sealed until the pair has actually met.
const CONTACT = /(https?:\/\/|www\.|\.com|\.in\b|\.me\b|@[a-z0-9_.]{3,}|insta|snapchat|whatsapp|\+?\d{10})/i;

export async function POST(req: Request, ctx: Ctx) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const { matchId } = await ctx.params;
  const text = String((await req.json().catch(() => ({}))).text ?? "").trim().slice(0, 500);
  if (!text) return json({ error: "Empty message" }, { status: 400 });

  const match = await getMatchFor(matchId, me.id);
  if (!match) return json({ error: "Match not found" }, { status: 404 });

  const before = match.state;
  tickMatch(match);
  if (match.state !== before) await saveMatch(match);

  if (match.state === "decision") {
    return json({ error: "The blind window is over — answer the coffee question first" }, { status: 403 });
  }
  if (match.state === "dissolved" || match.state === "expired") {
    return json({ error: "This chat has closed" }, { status: 403 });
  }
  // No slot, no chat — the library rule, enforced server-side.
  if (match.kind === "library" && !match.studySlot) {
    return json({ error: "Lock a study slot to open chat" }, { status: 403 });
  }
  if (match.kind === "blind" && match.state === "active" && CONTACT.test(text)) {
    return json({ error: "Links, handles and numbers stay sealed during the blind phase ☕" }, { status: 400 });
  }

  await addMessage(match.id, me.id, text);
  return json({ ok: true });
}
