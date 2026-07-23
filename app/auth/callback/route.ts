import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

// Where OAuth providers land after the student approves sign-in. Exchanges the
// one-time code for a session cookie, then hands off to "/" which routes to
// onboarding or home depending on whether the profile is finished.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error_description") ?? searchParams.get("error");

  const bounce = (message: string) =>
    NextResponse.redirect(`${origin}/welcome?error=${encodeURIComponent(message)}`);

  if (oauthError) return bounce(oauthError);
  if (!code) return NextResponse.redirect(`${origin}/welcome`);

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // The campus-domain trigger rejects non-college accounts at signup, which
    // surfaces here. Say so in plain language rather than leaking SQL.
    const blocked = /only open to|check_violation|database error/i.test(error.message);
    return bounce(
      blocked
        ? "That account isn't a college account. Use your muj.manipal.edu login."
        : error.message,
    );
  }
  return NextResponse.redirect(`${origin}/`);
}
