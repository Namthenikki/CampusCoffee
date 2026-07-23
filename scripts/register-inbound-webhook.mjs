// Registers the Brevo inbound-parsing webhook. Run once, after deploying.
//
//   node scripts/register-inbound-webhook.mjs https://your-app.vercel.app
//
// Reads BREVO_API_KEY, VERIFY_WEBHOOK_SECRET and NEXT_PUBLIC_INBOUND_DOMAIN
// from .env.local.
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const base = process.argv[2];
if (!base) {
  console.error("Usage: node scripts/register-inbound-webhook.mjs https://your-app.vercel.app");
  process.exit(1);
}
for (const key of ["BREVO_API_KEY", "VERIFY_WEBHOOK_SECRET", "NEXT_PUBLIC_INBOUND_DOMAIN"]) {
  if (!env[key]) { console.error(`Missing ${key} in .env.local`); process.exit(1); }
}

const url = `${base.replace(/\/$/, "")}/api/verify/inbound?token=${encodeURIComponent(env.VERIFY_WEBHOOK_SECRET)}`;

const res = await fetch("https://api.brevo.com/v3/webhooks", {
  method: "POST",
  headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json" },
  body: JSON.stringify({
    type: "inbound",
    events: ["inboundEmailProcessed"],
    url,
    domain: env.NEXT_PUBLIC_INBOUND_DOMAIN,
    description: "Campus Coffee student verification",
  }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.log(`FAILED (${res.status})`);
  console.log(JSON.stringify(body, null, 2));
  if (String(body?.message ?? "").includes("domain")) {
    console.log("\n=> Usually means the MX records haven't propagated yet. Wait and retry.");
  }
  process.exit(1);
}
console.log("Webhook registered.");
console.log(`  id     : ${body.id}`);
console.log(`  domain : ${env.NEXT_PUBLIC_INBOUND_DOMAIN}`);
console.log(`  posts to: ${base.replace(/\/$/, "")}/api/verify/inbound`);
