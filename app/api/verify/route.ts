import { currentUser, json, unauthorized } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CAMPUS_DOMAIN, VERIFY_ADDRESS, issueCode } from "@/lib/verify";

// GET  — current verification state, plus the code to send (poll this while
//        the student is sending their email).
// POST — issue a fresh code.

export async function GET() {
  const me = await currentUser();
  if (!me) return unauthorized();

  const db = supabaseAdmin();
  const { data: profile } = await db
    .from("profiles")
    .select("verified, campus_email")
    .eq("id", me.id)
    .maybeSingle();

  const { data: code } = await db
    .from("verification_codes")
    .select("code, expires_at")
    .eq("user_id", me.id)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const live = code && new Date(code.expires_at as string).getTime() > Date.now() ? code : null;

  return json({
    verified: !!profile?.verified,
    campusEmail: profile?.campus_email ?? null,
    sendTo: VERIFY_ADDRESS,
    domain: CAMPUS_DOMAIN,
    code: live?.code ?? null,
    expiresAt: live ? new Date(live.expires_at as string).getTime() : null,
  });
}

export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  const { code, expiresAt } = await issueCode(me.id);
  return json({ code, expiresAt, sendTo: VERIFY_ADDRESS, domain: CAMPUS_DOMAIN });
}
