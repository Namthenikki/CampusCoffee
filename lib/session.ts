import { rowToUser } from "./data/map";
import { supabaseServer } from "./supabase/server";
import type { User } from "./types";

// The signed-in student, resolved from the Supabase auth session (cookies) and
// their profile row. The optional arg is ignored — kept so existing call sites
// that pass the request still compile during the migration.
export async function currentUser(_req?: Request): Promise<User | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) return null;
  return rowToUser(profile, user.email ?? "");
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}

export function unauthorized(): Response {
  return json({ error: "Not signed in" }, { status: 401 });
}

/**
 * The signed-in student, but only if they've proved they're a student.
 *
 * The redirects in the pages are a convenience, not a control — anyone can
 * call an API route directly with a session cookie. Every route that reads or
 * writes real student data goes through this, so an unverified account is
 * refused at the server regardless of what the client does.
 *
 * Returns either the user or the Response to send back.
 */
export async function requireVerified(): Promise<{ me: User } | { deny: Response }> {
  const me = await currentUser();
  if (!me) return { deny: unauthorized() };
  if (!me.verified) {
    return {
      deny: json(
        { error: "Verify your college email first", needsVerification: true },
        { status: 403 },
      ),
    };
  }
  return { me };
}
