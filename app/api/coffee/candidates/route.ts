import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase (next step). Still reports opt-in state so the
// tab shows the right screen (join-the-queue vs empty pot).
export async function GET(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const mode = new URL(req.url).searchParams.get("mode") === "blind" ? "blind" : "open";
  const optedIn = mode === "blind" ? me.blindOptIn : me.openOptIn;
  return json({ optedIn, candidates: [], queueSize: 0, migrating: true });
}
