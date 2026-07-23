import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// User-scoped server client for route handlers and Server Components. Reads the
// signed-in user's session from cookies; every query it runs is subject to RLS,
// so it can only ever see what that specific student is allowed to see.
export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component render — safe to ignore; the
            // session refresh will be re-applied by middleware / the next write.
          }
        },
      },
    },
  );
}
