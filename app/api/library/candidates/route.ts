import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase (next step).
export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ candidates: [], examMode: me.examMode, migrating: true });
}
