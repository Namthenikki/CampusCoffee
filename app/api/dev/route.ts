import { currentUser, json, unauthorized } from "@/lib/session";

// The demo-only controls existed to drive the seeded bot accounts in the old
// local store. Real accounts don't need them, so this stays disabled.
export async function POST() {
  const me = await currentUser();
  if (!me) return unauthorized();
  return json({ error: "Demo controls are disabled." }, { status: 410 });
}
