import { json } from "@/lib/session";
import { redeemCode } from "@/lib/verify";

// Brevo posts every message sent to verify@campuscoffee.online here.
// Shared-secret guarded: configure the webhook URL with ?token=<VERIFY_WEBHOOK_SECRET>
// so nobody can forge verifications by calling this endpoint directly.
export async function POST(req: Request) {
  const token = new URL(req.url).searchParams.get("token");
  if (!process.env.VERIFY_WEBHOOK_SECRET || token !== process.env.VERIFY_WEBHOOK_SECRET) {
    return json({ error: "Not authorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  if (!payload) return json({ error: "Bad payload" }, { status: 400 });

  // Brevo batches messages under `items`; tolerate a single object too.
  const items: Record<string, unknown>[] = Array.isArray(payload?.items)
    ? payload.items
    : [payload];

  const results: string[] = [];
  for (const item of items) {
    const from =
      (item.From as { Address?: string })?.Address ??
      (item.from as { address?: string })?.address ??
      (typeof item.from === "string" ? item.from : "") ??
      "";

    // The code may be in the subject or the body — students put it wherever.
    const text = [
      item.Subject ?? item.subject ?? "",
      item.RawTextBody ?? item.text ?? "",
      item.RawHtmlBody ?? item.html ?? "",
    ].join(" ");

    // Trust the receiving edge's SPF/DKIM verdict, never the From header alone.
    const auth = (item.Authentication ?? item.authentication ?? {}) as Record<string, unknown>;
    const verdict = JSON.stringify(auth).toLowerCase();
    const authenticated =
      verdict.includes('"pass"') || verdict.includes("spf=pass") || verdict.includes("dkim=pass");

    results.push(await redeemCode(String(from), String(text), authenticated));
  }

  // Always 200 — a non-2xx makes Brevo retry, and a malformed message would
  // retry forever. The verdict is recorded either way.
  return json({ ok: true, results });
}
