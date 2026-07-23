import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS. This is where the matching engines and
// the reliability/weights logic run: it's the only client allowed to read
// private_stats and to see every profile (in order to rank and then hand back
// an anonymized/whitelisted view). NEVER import this into a client component;
// the "server-only" guard above turns that mistake into a build error.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
