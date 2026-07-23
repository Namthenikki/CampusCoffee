import { allProfiles, myMatches } from "@/lib/data/repo";
import { messCandidates } from "@/lib/matching/mess";
import { publicUser } from "@/lib/serialize";
import { currentUser, json, unauthorized } from "@/lib/session";

export async function GET() {
  const me = await currentUser();
  if (!me) return unauthorized();
  const [profiles, matches] = await Promise.all([allProfiles(), myMatches(me.id)]);
  const candidates = messCandidates(me, profiles, matches)
    .slice(0, 12)
    .map((c) => ({ user: publicUser(c.user), recurring: c.recurring, streak: c.streak }));
  return json({ candidates });
}
