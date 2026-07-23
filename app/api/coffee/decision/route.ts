import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase — ported with the Blind Coffee feature.
export async function POST() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "Coffee Date is coming online shortly." }, { status: 503 });
}
