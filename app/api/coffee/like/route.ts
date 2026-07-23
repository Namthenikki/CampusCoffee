import { currentUser, json, unauthorized } from "@/lib/session";

// Pending migration to Supabase — ports with Blind Coffee / Coffee Date.
export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "The coffee side is coming online shortly." }, { status: 503 });
}
