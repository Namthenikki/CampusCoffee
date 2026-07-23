import { lastMessages, myMatches, profilesByIds } from "@/lib/data/repo";
import { tickMatch } from "@/lib/matchflow";
import { matchView } from "@/lib/serialize";
import { json, requireVerified } from "@/lib/session";
import { saveMatch } from "@/lib/data/repo";

export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const matches = await myMatches(me.id);

  // Roll any expired blind windows over to the decision stage.
  for (const m of matches) {
    const before = m.state;
    tickMatch(m);
    if (m.state !== before) await saveMatch(m);
  }

  const visible = matches.filter((m) => m.state !== "dissolved" || m.decisions[me.id] === "no");
  const partnerIds = visible.map((m) => (m.users[0] === me.id ? m.users[1] : m.users[0]));
  const [partners, latest] = await Promise.all([
    profilesByIds(partnerIds),
    lastMessages(visible.map((m) => m.id)),
  ]);

  const views = visible
    .map((m) => {
      const otherId = m.users[0] === me.id ? m.users[1] : m.users[0];
      const lastMessage = latest.get(m.id) ?? null;
      return { ...matchView(m, partners.get(otherId) ?? null, me), lastMessage };
    })
    .sort((a, b) => (b.lastMessage?.at ?? b.createdAt) - (a.lastMessage?.at ?? a.createdAt));

  return json({ matches: views });
}
