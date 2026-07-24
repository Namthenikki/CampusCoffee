"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Btn, Chip, Seg } from "@/components/ui";
import { TokenMark } from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BRANCHES } from "@/lib/types";

type Me = {
  name: string; fullName: string; bio: string; dob: string | null;
  gender: string; branch: string; year: number;
  onboarded: boolean; verified: boolean;
};

// The menu strip: the four features, shown as stamp dots — accents stay inside
// token devices on mixed screens.
const MENU = [
  { dot: "bg-honey", label: "MESS" },
  { dot: "bg-matcha", label: "LIBRARY" },
  { dot: "bg-rosemilk", label: "BLIND COFFEE" },
  { dot: "bg-spice", label: "DATE" },
];

// Supabase speaks in API errors; students shouldn't have to.
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("rate limit")) return "Too many codes requested. Wait a couple of minutes, then try again.";
  if (m.includes("seconds")) return "Give it a few seconds before asking for another code.";
  if (m.includes("expired") || m.includes("invalid")) return "That code didn't work. Check it, or send a fresh one.";
  if (m.includes("signups not allowed")) return "Sign-ups are switched off for this campus right now.";
  return msg;
}

export default function Welcome() {
  const router = useRouter();
  // Built on first use, in the browser only. Constructing it during render
  // would run at prerender time on the server, where no keys exist.
  const supabaseRef = useRef<ReturnType<typeof supabaseBrowser> | null>(null);
  const supabase = () => (supabaseRef.current ??= supabaseBrowser());
  const [stage, setStage] = useState<"loading" | "email" | "wizard">("loading");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [me, setMe] = useState<Me | null>(null);

  // Already signed in? Skip straight to onboarding or home.
  useEffect(() => {
    api<{ me: Me }>("/api/me")
      .then(({ me }) => {
        // Student status comes before anything else — no profile, no browsing.
        if (!me.verified) router.replace("/verify");
        else if (me.onboarded) router.replace("/today");
        else { setMe(me); setStage("wizard"); }
      })
      .catch(() => setStage("email"));
  }, [router]);

  // Surface anything the OAuth callback bounced back with.
  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get("error");
    if (reason) {
      setErr(reason);
      window.history.replaceState({}, "", "/welcome");
    }
  }, []);

  // Sign in with a personal Google account. Student status is proved
  // separately, by emailing us from the college address (see /verify) —
  // MUJ blocks inbound mail, so the login can't depend on it.
  const signInWithGoogle = async () => {
    setErr("");
    setBusy(true);
    const { error } = await supabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setBusy(false); setErr(friendly(error.message)); }
  };

  const patch = (p: Partial<Me>) => setMe((m) => (m ? { ...m, ...p } : m));

  const finish = async () => {
    if (!me) return;
    const { fullName, bio, dob, gender, branch, year } = me;
    await api("/api/me", {
      method: "PATCH",
      body: JSON.stringify({ fullName, bio, dob, gender, branch, year, onboarded: true }),
    });
    router.replace("/profile/photos");
  };

  if (stage === "loading") {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="serial">BREWING…</p>
      </main>
    );
  }

  if (stage === "email") {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-7 px-6 py-10">
        <div className="pour-in">
          <TokenMark size={56} variant="ghost" className="mb-4" />
          <h1 className="font-display text-[52px] font-bold leading-[0.95] tracking-tight">
            Campus<br /><span className="text-butter">Coffee</span>
          </h1>
          <p className="mt-4 max-w-[32ch] text-[15px] leading-relaxed text-khaki">
            Someone to eat with. Someone to study with. Someone to meet.
            <br />
            <span className="font-semibold text-crema">No swiping. Ever.</span>
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            {MENU.map((m) => (
              <span key={m.label} className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} aria-hidden />
                <span className="font-mono text-[10px] tracking-[0.18em] text-crema">{m.label}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="token pour-in flex flex-col gap-3 p-5" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between">
            <span className="serial">№ CC-0000</span>
            <span className="stamp text-butter">Students only</span>
          </div>
          <Btn full onClick={signInWithGoogle} disabled={busy}>Continue with Google</Btn>
          {err && <p className="text-center text-sm text-spice-pastel">{err}</p>}
          <p className="text-center text-xs text-sediment">
            You&apos;ll prove you&apos;re an MUJ student in the next step.
          </p>
        </div>
      </main>
    );
  }

  if (!me) return null;

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 py-8">
      <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">Who&apos;s ordering?</h2>

          <div>
            <label className="text-sm text-khaki">Your display name</label>
            <div className="mt-1 flex items-center justify-between rounded-xl border border-line bg-bean2/60 px-4 py-3">
              <span className="font-display text-lg font-bold">{me.name}</span>
              <span className="stamp text-matcha-pastel">Verified</span>
            </div>
            <p className="mt-1.5 text-xs text-sediment">
              Taken from your college email, so it can&apos;t be changed. That&apos;s what makes it worth trusting.
            </p>
          </div>

          <div>
            <label className="text-sm text-khaki">Your full name</label>
            <input
              className="mt-1 w-full rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-sediment focus:border-honey/60"
              placeholder="As it appears on your ID"
              maxLength={60}
              value={me.fullName}
              onChange={(e) => patch({ fullName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm text-khaki">Date of birth</label>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-line bg-bean2 px-4 py-3 text-crema focus:border-honey/60"
              value={me.dob ?? ""}
              max={new Date(Date.now() - 16 * 365.25 * 864e5).toISOString().slice(0, 10)}
              onChange={(e) => patch({ dob: e.target.value || null })}
            />
            <p className="mt-1.5 text-xs text-sediment">
              Others only ever see your age, never the date.
            </p>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-sm text-khaki">Say something about yourself</label>
              <span className={`font-mono text-[11px] ${me.bio.length > 230 ? "text-spice-pastel" : "text-sediment"}`}>
                {me.bio.length}/250
              </span>
            </div>
            <textarea
              className="mt-1 h-24 w-full resize-none rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-sediment focus:border-honey/60"
              placeholder="Third bench, left row. Will argue about football and share my notes."
              maxLength={250}
              value={me.bio}
              onChange={(e) => patch({ bio: e.target.value.slice(0, 250) })}
            />
            <p className="mt-1.5 text-xs text-sediment">
              This shows next to your name and photo. Make it sound like you.
            </p>
          </div>

          <label className="text-sm text-khaki">I am</label>
          <Seg
            options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }]}
            value={me.gender as "female"} onChange={(v) => patch({ gender: v })}
          />

          <label className="text-sm text-khaki">Branch</label>
          <div className="flex flex-wrap gap-2">
            {BRANCHES.map((b) => (
              <button key={b} onClick={() => patch({ branch: b })} className="press">
                <Chip tone={me.branch === b ? "honey" : "line"}>{b}</Chip>
              </button>
            ))}
            <button onClick={() => patch({ branch: "" })} className="press">
              <Chip tone={!BRANCHES.includes(me.branch) ? "honey" : "line"}>Other</Chip>
            </button>
          </div>
          {!BRANCHES.includes(me.branch) && (
            <input
              autoFocus
              className="w-full rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-sediment focus:border-honey/60"
              placeholder="Type your branch"
              maxLength={40}
              value={me.branch}
              onChange={(e) => patch({ branch: e.target.value })}
            />
          )}

          <label className="text-sm text-khaki">Year</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((y) => (
              <button key={y} onClick={() => patch({ year: y })} className="press">
                <Chip tone={me.year === y ? "honey" : "line"}>Year {y}</Chip>
              </button>
            ))}
          </div>
        </section>

      <div className="mt-auto pt-4">
        <Btn full onClick={finish} disabled={!me.fullName.trim() || !me.branch.trim() || !me.dob}>
          Next: your photos
        </Btn>
      </div>
    </main>
  );
}
