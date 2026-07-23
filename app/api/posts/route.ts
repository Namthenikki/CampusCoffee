import { insertPost, joinPost, listPosts, profilesByIds } from "@/lib/data/repo";
import { publicUser } from "@/lib/serialize";
import { json, requireVerified } from "@/lib/session";

// Group posts: "need 2 more for dinner tonight" — mess and library both.
export async function GET(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const kind = new URL(req.url).searchParams.get("kind") === "library" ? "library" : "mess";
  const posts = await listPosts(kind);

  const ids = [...new Set(posts.flatMap((p) => [p.by, ...p.joined]))];
  const people = await profilesByIds(ids);

  return json({
    posts: posts.map((p) => {
      const author = people.get(p.by);
      return {
        ...p,
        author: author ? publicUser(author) : null,
        joinedUsers: p.joined.map((id) => people.get(id)).filter(Boolean).map((u) => publicUser(u!)),
        mine: p.by === me.id,
        joinedByMe: p.joined.includes(me.id),
      };
    }),
  });
}

export async function POST(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const body = await req.json().catch(() => ({}));

  if (body.join) {
    await joinPost(String(body.join), me.id);
    return json({ ok: true });
  }

  const text = String(body.text ?? "").slice(0, 140).trim();
  if (!text) return json({ error: "Say what you need" }, { status: 400 });
  const needed = Math.min(6, Math.max(1, Number(body.needed) || 2));
  const slotLabel = String(body.slotLabel ?? "tonight").slice(0, 40);
  const kind = body.kind === "library" ? "library" : "mess";

  await insertPost(kind, me.id, text, slotLabel, needed);
  return json({ ok: true });
}
