import { allProfiles, myMatches } from "@/lib/data/repo";
import { messCandidates } from "@/lib/matching/mess";
import { publicUser } from "@/lib/serialize";
import { json, requireVerified } from "@/lib/session";

export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const [profiles, matches] = await Promise.all([allProfiles(), myMatches(me.id)]);
  const candidates = messCandidates(me, profiles, matches)
    .slice(0, 12)
    .map((c) => ({ user: publicUser(c.user), recurring: c.recurring, streak: c.streak }));
  return json({ candidates });
}
