import { currentUser, json, unauthorized } from "@/lib/session";

// Pending migration to Supabase — ported with the Blind Coffee feature.
export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "Coffee Date is coming online shortly." }, { status: 503 });
}
