import { json } from "@/lib/session";
import { redeemCode } from "@/lib/verify";

// Brevo posts every message sent to verify@reply.campuscoffee.online here.
// Shared-secret guarded: the webhook URL carries ?token=<VERIFY_WEBHOOK_SECRET>
// so nobody can forge verifications by calling this endpoint directly.

type Bag = Record<string, unknown>;

/** Header lookup that survives Brevo's inconsistent capitalisation. */
function header(headers: Bag, name: string): string {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key] ?? "") : "";
}

/**
 * Did this mail genuinely come from the college, or is the From header forged?
 *
 * A From header costs nothing to fake, so the verdict has to come from the
 * receiving edge. Brevo exposes it as ordinary mail headers: the ARC/
 * Authentication-Results line carries "spf=pass"/"dkim=pass"/"dmarc=pass",
 * and Received-SPF carries a bare "Pass".
 */
function senderIsAuthentic(item: Bag): boolean {
  const headers = (item.Headers ?? item.headers ?? {}) as Bag;
  const results = [
    header(headers, "Authentication-Results"),
    header(headers, "ARC-Authentication-Results"),
  ]
    .join(" ")
    .toLowerCase();

  if (/\b(spf|dkim|dmarc)=pass\b/.test(results)) return true;

  // Fall back to the standalone SPF header, whose value starts with the verdict.
  return /^\s*pass\b/i.test(header(headers, "Received-SPF"));
}

export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.VERIFY_WEBHOOK_SECRET || token !== process.env.VERIFY_WEBHOOK_SECRET) {
    return json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => null)) as Bag | null;
  if (!payload) return json({ error: "Bad payload" }, { status: 400 });

  const items: Bag[] = Array.isArray(payload.items) ? (payload.items as Bag[]) : [payload];

  const results: string[] = [];
  for (const item of items) {
    const from =
      ((item.From ?? item.from) as Bag | undefined)?.Address ??
      ((item.From ?? item.from) as Bag | undefined)?.address ??
      (typeof item.from === "string" ? item.from : "");

    // Students put the code wherever they like — subject, body, or both.
    const text = [
      item.Subject,
      item.ExtractedMarkdownMessage,
      item.RawTextBody,
      item.RawHtmlBody,
    ]
      .filter(Boolean)
      .join(" ");

    results.push(await redeemCode(String(from ?? ""), text, senderIsAuthentic(item)));
  }

  // Always 200 — a non-2xx makes Brevo retry, and a malformed message would
  // then retry forever. The verdict is recorded either way.
  return json({ ok: true, results });
}
