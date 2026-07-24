import { profileUpdate } from "@/lib/data/map";
import { photosComplete } from "@/lib/media";
import { currentUser, json, unauthorized } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { INTEREST_POOL, PROMPTS, SUBJECT_POOL, type User } from "@/lib/types";

// The gate needs to know if photos are done without a second round-trip.
async function photosDone(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin().from("profile_media").select("kind, has_face").eq("user_id", userId);
  return photosComplete(data ?? []).ok;
}

// Reliability, learned weights, and email never leave the server — not even to
// the account's own client.
function ownView(u: User) {
  const { reliability: _r, weights: _w, email: _e, ...rest } = u;
  void _r; void _w; void _e;
  return rest;
}

export async function GET() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({
    me: { ...ownView(me), photosComplete: me.verified ? await photosDone(me.id) : false },
    pools: { interests: INTEREST_POOL, subjects: SUBJECT_POOL, prompts: PROMPTS },
  });
}

export async function PATCH(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const body = await req.json().catch(() => ({}));
  const update = profileUpdate(body);
  if (Object.keys(update).length) {
    const supabase = await supabaseServer();
    const { error } = await supabase.from("profiles").update(update).eq("id", me.id);
    if (error) return json({ error: error.message }, { status: 400 });
  }
  const updated = await currentUser();
  return json({ me: updated ? ownView(updated) : null });
}
