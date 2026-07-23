import { currentUser, json, unauthorized } from "@/lib/session";

// Pending migration to Supabase — ports with the Library Partner feature.
export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "Library Partner is coming online shortly." }, { status: 503 });
}
