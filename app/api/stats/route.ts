import { json, requireVerified } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Real campus headcount from Supabase; the activity counters light up as each
// feature is ported.
export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const { count } = await supabaseAdmin().from("profiles").select("*", { count: "exact", head: true }).eq("onboarded", true);
  return json({
    students: count ?? 0,
    studySessions: 0,
    mealsPaired: 0,
    datesBrewing: 0,
    datesMet: 0,
  });
}
