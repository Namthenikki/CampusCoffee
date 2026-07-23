import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase — ports with Blind Coffee / Coffee Date.
export async function POST() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "The coffee side is coming online shortly." }, { status: 503 });
}
