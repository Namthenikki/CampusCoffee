import { json, requireVerified } from "@/lib/session";

// The demo-only controls existed to drive the seeded bot accounts in the old
// local store. Real accounts don't need them, so this stays disabled.
export async function POST() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  return json({ error: "Demo controls are disabled." }, { status: 410 });
}
