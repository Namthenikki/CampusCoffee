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
