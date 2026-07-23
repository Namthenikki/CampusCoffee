import { json, requireVerified } from "@/lib/session";

// Pending migration to Supabase — the shared checkin/reveal/reliability module
// ports across with Blind Coffee and Coffee Date.
export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "Meetups are coming online shortly." }, { status: 503 });
}

export async function POST() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "Meetups are coming online shortly." }, { status: 503 });
}
