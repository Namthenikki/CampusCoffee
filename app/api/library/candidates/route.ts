import { currentUser, json, unauthorized } from "@/lib/session";

// Pending migration to Supabase (next step).
export async function GET() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ candidates: [], examMode: me.examMode, migrating: true });
}
