import { getMatchFor, saveMatch } from "@/lib/data/repo";
import { currentUser, json, unauthorized } from "@/lib/session";

// "We ate together" — feeds the recurring-pair streak so proven pairs get
// auto-suggested instead of re-matching from scratch.
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const { matchId } = await req.json().catch(() => ({}));
  const match = await getMatchFor(String(matchId), me.id);
  if (!match || match.kind !== "mess") return json({ error: "Match not found" }, { status: 404 });

  // One credit per 4 hours, so a single dinner can't be farmed into a streak.
  if (match.lastMealAt && Date.now() - match.lastMealAt < 4 * 60 * 60 * 1000) {
    return json({ mealCount: match.mealCount, counted: false });
  }
  match.mealCount += 1;
  match.lastMealAt = Date.now();
  await saveMatch(match);
  return json({ mealCount: match.mealCount, counted: true });
}
