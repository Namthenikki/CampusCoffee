import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase — ports with the Library Partner feature.
export async function POST() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "Library Partner is coming online shortly." }, { status: 503 });
}
