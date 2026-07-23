import { json } from "@/lib/session";

// Retired: login now runs through Supabase Auth email OTP directly from the
// client (see app/welcome). This stub stays only so old clients get a clear
// signal instead of a 404.
export async function POST() {
  return json({ error: "Login moved to email OTP — reload the app." }, { status: 410 });
}
