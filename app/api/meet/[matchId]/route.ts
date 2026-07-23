import { currentUser, json, unauthorized } from "@/lib/session";

// Pending migration to Supabase — the shared checkin/reveal/reliability module
// ports across with Blind Coffee and Coffee Date.
export async function GET() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "Meetups are coming online shortly." }, { status: 503 });
}

export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "Meetups are coming online shortly." }, { status: 503 });
}
