import { createBrowserClient } from "@supabase/ssr";

// Browser client — used only for the OTP auth flow and for subscribing to
// Realtime chat. It carries the public anon key, so RLS is what keeps it
// honest: it can read a student's own profile and the messages in their own
// matches, and nothing else.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
