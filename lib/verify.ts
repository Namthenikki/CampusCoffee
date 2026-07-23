import "server-only";
import { supabaseAdmin } from "./supabase/admin";

export const CAMPUS_DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN ?? "muj.manipal.edu";
// Brevo requires inbound mail on a subdomain distinct from the sending domain,
// so students write to reply.campuscoffee.online while we send from the root.
export const VERIFY_ADDRESS = `verify@${process.env.NEXT_PUBLIC_INBOUND_DOMAIN ?? "reply.campuscoffee.online"}`;
const CODE_TTL_MS = 60 * 60 * 1000; // an hour is plenty to send one email

// Unambiguous alphabet — no O/0, I/1. Students read this off a screen and type
// it into a mail app, so every avoidable ambiguity is a failed verification.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "CC-" + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/**
 * Issues a fresh code bound to one specific college address, retiring any
 * earlier unused ones for this student.
 */
export async function issueCode(
  userId: string,
  claimedEmail: string,
): Promise<{ code: string; expiresAt: number }> {
  const db = supabaseAdmin();
  await db.from("verification_codes").delete().eq("user_id", userId).is("used_at", null);

  const code = newCode();
  const expiresAt = Date.now() + CODE_TTL_MS;
  const { error } = await db.from("verification_codes").insert({
    code,
    user_id: userId,
    claimed_email: claimedEmail.trim().toLowerCase(),
    expires_at: new Date(expiresAt).toISOString(),
  });
  if (error) throw new Error(error.message);
  return { code, expiresAt };
}

export type Outcome =
  | "verified"
  | "bad_domain"
  | "bad_code"
  | "expired"
  | "duplicate"
  | "unauthenticated";

/**
 * Resolves one inbound email into a verdict. Pure decision logic — the caller
 * owns the transport, so this is equally usable from a webhook or a test.
 */
export async function redeemCode(
  fromEmail: string,
  rawText: string,
  senderAuthenticated: boolean,
): Promise<Outcome> {
  const db = supabaseAdmin();
  const from = fromEmail.trim().toLowerCase();
  const code = rawText.toUpperCase().match(/CC-[A-Z2-9]{8}/)?.[0] ?? null;

  const record = async (outcome: Outcome) => {
    await db.from("verification_attempts").insert({ from_email: from, code, outcome });
    return outcome;
  };

  // A From header alone is forgeable. Only trust senders whose mail actually
  // passed SPF/DKIM at the receiving edge.
  if (!senderAuthenticated) return record("unauthenticated");
  if (from.split("@")[1] !== CAMPUS_DOMAIN) return record("bad_domain");
  if (!code) return record("bad_code");

  const { data: row } = await db.from("verification_codes").select("*").eq("code", code).maybeSingle();
  if (!row || row.used_at) return record("bad_code");
  if (new Date(row.expires_at as string).getTime() < Date.now()) return record("expired");

  // The code only works from the exact address the student claimed, so a code
  // glimpsed on someone else's screen is worthless without their mailbox.
  // A code with no claimed address is never redeemable — treating a missing
  // binding as "any campus sender will do" would defeat the whole check.
  const claimed = (row.claimed_email as string | null)?.trim().toLowerCase();
  if (!claimed || claimed !== from) return record("bad_code");

  // Consume the code atomically. Brevo retries deliveries — we've seen the same
  // message arrive twice — so two handlers can run this concurrently. The
  // `is("used_at", null)` filter means exactly one of them updates a row; the
  // loser gets nothing back and stops here.
  const { data: consumed } = await db
    .from("verification_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_at", null)
    .select("user_id")
    .maybeSingle();
  if (!consumed) return record("bad_code");

  // The display name comes from the verified college address, not from
  // anything the student typed. It's the one identity field they can't change
  // afterwards, which is what makes it meaningful next to their face.
  const firstName = from.split("@")[0].split(".")[0];
  const displayName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  // One college mailbox, one account — enforced by a unique index, so even a
  // race between two signups can't produce duplicates.
  const { data: updated, error: claimErr } = await db
    .from("profiles")
    .update({
      verified: true,
      verified_at: new Date().toISOString(),
      campus_email: from,
      name: displayName,
    })
    .eq("id", consumed.user_id as string)
    .select("id")
    .maybeSingle();

  // No error but no row means the account vanished between issuing and
  // redeeming — don't report success for a profile we didn't actually mark.
  if (claimErr || !updated) return record("duplicate");
  return record("verified");
}
