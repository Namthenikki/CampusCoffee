import { findMatch, getProfile, insertMatch } from "@/lib/data/repo";
import { json, requireVerified } from "@/lib/session";

export async function POST(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const { userId } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || userId === me.id) {
    return json({ error: "Pick someone to pair with" }, { status: 400 });
  }
  const other = await getProfile(userId);
  if (!other) return json({ error: "That student isn't on Campus Coffee" }, { status: 404 });

  const existing = await findMatch("mess", me.id, other.id);
  if (existing && existing.state !== "dissolved") return json({ matchId: existing.id });

  const match = await insertMatch("mess", me.id, other.id);
  return json({ matchId: match.id });
}
