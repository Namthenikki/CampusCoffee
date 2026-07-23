import { currentUser, json, unauthorized } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { CAMPUS_DOMAIN, VERIFY_ADDRESS, issueCode } from "@/lib/verify";

// GET  — verification state plus the pending code, if any. The /verify page
//        polls this so it flips by itself when the email lands.
// POST — claim a college address and get a code bound to it.

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
    .select("code, claimed_email, expires_at")
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
    claimedEmail: live?.claimed_email ?? null,
    expiresAt: live ? new Date(live.expires_at as string).getTime() : null,
  });
}

export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();

  const local = String((await req.json().catch(() => ({})))?.local ?? "")
    .split("@")[0]
    .trim()
    .toLowerCase();

  // MUJ addresses are firstname.regno — check the shape before we let someone
  // burn a code on a typo.
  if (!/^[a-z][a-z0-9._-]*\.[0-9]{6,}$/.test(local)) {
    return json(
      { error: "That doesn't look like your college address. It should be firstname.regno" },
      { status: 400 },
    );
  }

  const claimedEmail = `${local}@${CAMPUS_DOMAIN}`;

  // If another account already verified this address, stop here rather than
  // letting them send an email that can never succeed.
  const { data: taken } = await supabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("campus_email", claimedEmail)
    .maybeSingle();
  if (taken && taken.id !== me.id) {
    return json({ error: "That college address is already on Campus Coffee." }, { status: 409 });
  }

  const { code, expiresAt } = await issueCode(me.id, claimedEmail);
  return json({ code, expiresAt, claimedEmail, sendTo: VERIFY_ADDRESS, domain: CAMPUS_DOMAIN });
}
