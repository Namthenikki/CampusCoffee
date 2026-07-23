"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TimetableGrid from "@/components/TimetableGrid";
import { api, Btn, Chip, Seg } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BRANCHES, HOSTELS, SLOTS_PER_DAY } from "@/lib/types";

type Me = {
  name: string; gender: string; interestedIn: string; branch: string; year: number;
  hostel: string; diet: string; messSlot: string; mealFreq: number; interests: string[];
  subjects: string[]; studyStyle: string; prompt: { q: string; a: string } | null;
  timetable: boolean[][]; blindOptIn: boolean; openOptIn: boolean; showBranchInBlind: boolean;
  onboarded: boolean;
  verified: boolean;
};
type Pools = { interests: string[]; subjects: string[]; prompts: string[] };

const DOMAIN = process.env.NEXT_PUBLIC_EMAIL_DOMAIN ?? "muj.manipal.edu";
const OTP_MAX = 8; // Supabase codes are 6–8 digits depending on project settings
const STEPS = ["you", "mess", "interests", "study", "timetable", "coffee"] as const;

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
  const [stage, setStage] = useState<"loading" | "email" | "otp" | "wizard">("loading");
  const [step, setStep] = useState(0);
  const [local, setLocal] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [err, setErr] = useState("");
  const triedCode = useRef("");
  const [me, setMe] = useState<Me | null>(null);
  const [pools, setPools] = useState<Pools>({ interests: [], subjects: [], prompts: [] });

  const email = `${local.trim().toLowerCase()}@${DOMAIN}`;

  // Already signed in? Skip straight to onboarding or home.
  useEffect(() => {
    api<{ me: Me; pools: Pools }>("/api/me")
      .then(({ me, pools }) => {
        // Student status comes before anything else — no profile, no browsing.
        if (!me.verified) router.replace("/verify");
        else if (me.onboarded) router.replace("/today");
        else { setMe(me); setPools(pools); setStage("wizard"); }
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

  // Resend cooldown ticker — Supabase throttles code requests, so the button
  // tells you when it's ready instead of erroring after the fact.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

  const sendCode = async () => {
    setErr("");
    if (!/^[a-z0-9][a-z0-9._-]*$/i.test(local.trim())) {
      setErr("Enter the part of your college email before the @");
      return;
    }
    setBusy(true);
    const { error } = await supabase().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setBusy(false);
    if (error) { setErr(friendly(error.message)); return; }
    setCode("");
    triedCode.current = "";
    setCooldown(45);
    setStage("otp");
  };

  const verify = async (token = code) => {
    const t = token.trim();
    if (t.length < 6 || busy) return;
    setErr("");
    setBusy(true);
    const { error } = await supabase().auth.verifyOtp({ email, token: t, type: "email" });
    if (error) { setBusy(false); setErr(friendly(error.message)); return; }
    const { me, pools } = await api<{ me: Me; pools: Pools }>("/api/me");
    setBusy(false);
    if (me.onboarded) { router.replace("/today"); return; }
    setMe(me); setPools(pools); setStage("wizard");
  };

  // Submit as soon as the sixth digit lands — no extra tap.
  useEffect(() => {
    // Supabase OTP length varies by project setting (6 or 8), so submit only
    // when the field is full; shorter codes go via the Verify button.
    if (stage === "otp" && code.length === OTP_MAX && triedCode.current !== code) {
      triedCode.current = code;
      verify(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, stage]);

  const patch = (p: Partial<Me>) => setMe((m) => (m ? { ...m, ...p } : m));
  const toggleIn = (key: "interests" | "subjects", v: string, max: number) => {
    if (!me) return;
    const has = me[key].includes(v);
    if (!has && me[key].length >= max) return;
    patch({ [key]: has ? me[key].filter((x) => x !== v) : [...me[key], v] } as Partial<Me>);
  };

  const finish = async () => {
    if (!me) return;
    await api("/api/me", { method: "PATCH", body: JSON.stringify({ ...me, onboarded: true }) });
    router.replace("/today");
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
      <main className="flex min-h-dvh flex-col justify-center gap-6 px-6">
        <div>
          <div className="steam font-display text-xl text-khaki" aria-hidden><span>(</span><span>(</span><span>(</span></div>
          <h1 className="font-display text-5xl font-bold leading-tight">
            Campus<br /><span className="text-honey">Coffee</span>
          </h1>
          <p className="mt-3 text-khaki">
            Mess partners. Study partners. Blind coffee.
            <br /><span className="font-semibold text-crema">No swiping. Ever.</span>
          </p>
        </div>
        <div className="token flex flex-col gap-3 p-5">
          <span className="serial">№ CC-0000 · STUDENTS ONLY</span>
          <Btn full onClick={signInWithGoogle} disabled={busy}>Continue with Google</Btn>
          <p className="text-center text-xs text-khaki">
            You'll prove you're an MUJ student in the next step.
          </p>
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-line" />
            <span className="text-xs text-khaki">or use a code</span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-bean2">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-crema placeholder:text-khaki/60"
              placeholder="firstname.regno"
              autoCapitalize="none"
              autoCorrect="off"
              value={local}
              onChange={(e) => setLocal(e.target.value.split("@")[0].trim())}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
            />
            <span className="flex items-center bg-bean px-3 font-mono text-xs text-khaki">@{DOMAIN}</span>
          </div>
          {err && <p className="text-sm text-spice">{err}</p>}
          <Btn full onClick={sendCode} disabled={busy}>{busy ? "Sending…" : "Send me a code"}</Btn>
        </div>
        <p className="text-center text-xs text-khaki">
          We only send a code to your college inbox — that's how we keep it students-only.
        </p>
      </main>
    );
  }

  if (stage === "otp") {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-6 px-6">
        <div>
          <h1 className="font-display text-4xl font-bold">Check your inbox ☕</h1>
          <p className="mt-2 text-khaki">
            We sent a code to <span className="text-crema">{email}</span>. It's good for a few minutes.
          </p>
        </div>
        <div className="token flex flex-col gap-3 p-5">
          <span className="serial">ENTER YOUR CODE</span>
          <input
            className="rounded-xl border border-line bg-bean2 px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-crema placeholder:text-khaki/40"
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_MAX}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && verify()}
          />
          {err && <p className="text-sm text-spice">{err}</p>}
          <Btn full onClick={() => verify()} disabled={busy || code.length < 6}>{busy ? "Verifying…" : "Verify & enter"}</Btn>
          <div className="flex justify-between text-xs text-khaki">
            <button className="press underline underline-offset-4" onClick={() => { setStage("email"); setCode(""); setErr(""); }}>
              Change email
            </button>
            <button
              className="press underline underline-offset-4 disabled:no-underline disabled:opacity-50"
              onClick={sendCode}
              disabled={busy || cooldown > 0}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!me) return null;
  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 py-8">
      <div>
        <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-widest text-khaki">
          <span>Brewing your profile</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bean2">
          <div className="h-full rounded-full bg-honey transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {STEPS[step] === "you" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Who's ordering?</h2>
          <label className="text-sm text-khaki">Your name (what partners will see)</label>
          <input
            className="rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-khaki/60"
            placeholder="First name"
            value={me.name}
            onChange={(e) => patch({ name: e.target.value })}
          />
          <label className="text-sm text-khaki">I am</label>
          <Seg
            options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
            value={me.gender as "female"} onChange={(v) => patch({ gender: v })}
          />
          <label className="text-sm text-khaki">Interested in (for the coffee side)</label>
          <Seg
            options={[{ value: "female", label: "Women" }, { value: "male", label: "Men" }, { value: "everyone", label: "Everyone" }]}
            value={me.interestedIn as "female"} onChange={(v) => patch({ interestedIn: v })}
          />
          <label className="text-sm text-khaki">Branch & year</label>
          <div className="flex flex-wrap gap-2">
            {BRANCHES.map((b) => (
              <button key={b} onClick={() => patch({ branch: b })} className="press">
                <Chip tone={me.branch === b ? "honey" : "line"}>{b}</Chip>
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((y) => (
              <button key={y} onClick={() => patch({ year: y })} className="press">
                <Chip tone={me.year === y ? "honey" : "line"}>Year {y}</Chip>
              </button>
            ))}
          </div>
          <label className="text-sm text-khaki">Where do you stay?</label>
          <div className="flex flex-wrap gap-2">
            {HOSTELS.map((h) => (
              <button key={h} onClick={() => patch({ hostel: h })} className="press">
                <Chip tone={me.hostel === h ? "honey" : "line"}>{h}</Chip>
              </button>
            ))}
          </div>
        </section>
      )}

      {STEPS[step] === "mess" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Mess rules</h2>
          <label className="text-sm text-khaki">Plate politics</label>
          <Seg
            options={[{ value: "veg", label: "Veg" }, { value: "egg", label: "Egg" }, { value: "nonveg", label: "Non-veg" }]}
            value={me.diet as "veg"} onChange={(v) => patch({ diet: v })}
          />
          <label className="text-sm text-khaki">When do you usually eat?</label>
          <Seg
            options={[{ value: "early", label: "Early bird" }, { value: "mid", label: "Regular" }, { value: "late", label: "Last call" }]}
            value={me.messSlot as "mid"} onChange={(v) => patch({ messSlot: v })}
          />
          <label className="text-sm text-khaki">Mess meals per week: <span className="font-mono text-honey">{me.mealFreq}</span></label>
          <input type="range" min={0} max={21} value={me.mealFreq} onChange={(e) => patch({ mealFreq: Number(e.target.value) })} className="accent-honey" />
        </section>
      )}

      {STEPS[step] === "interests" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">What are you into?</h2>
          <p className="text-sm text-khaki">Pick 3–6. These drive who you meet.</p>
          <div className="flex flex-wrap gap-2">
            {pools.interests.map((i) => (
              <button key={i} onClick={() => toggleIn("interests", i, 6)} className="press">
                <Chip tone={me.interests.includes(i) ? "honey" : "line"}>{i}</Chip>
              </button>
            ))}
          </div>
        </section>
      )}

      {STEPS[step] === "study" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Study mode</h2>
          <label className="text-sm text-khaki">Subjects this sem (pick up to 4)</label>
          <div className="flex flex-wrap gap-2">
            {pools.subjects.map((s) => (
              <button key={s} onClick={() => toggleIn("subjects", s, 4)} className="press">
                <Chip tone={me.subjects.includes(s) ? "honey" : "line"}>{s}</Chip>
              </button>
            ))}
          </div>
          <label className="text-sm text-khaki">How do you study?</label>
          <Seg
            options={[{ value: "silent", label: "Pin-drop" }, { value: "discussion", label: "Debate it" }, { value: "mixed", label: "Depends" }]}
            value={me.studyStyle as "mixed"} onChange={(v) => patch({ studyStyle: v })}
          />
        </section>
      )}

      {STEPS[step] === "timetable" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">Your free hours</h2>
          <p className="text-sm text-khaki">
            Honest input = better study partners. We only show people whose free time actually overlaps yours.
          </p>
          <TimetableGrid
            value={me.timetable?.length ? me.timetable : Array.from({ length: 6 }, () => Array(SLOTS_PER_DAY).fill(false))}
            onChange={(t) => patch({ timetable: t })}
          />
        </section>
      )}

      {STEPS[step] === "coffee" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold">The coffee side ☕</h2>
          <p className="text-sm text-khaki">Both optional. Both leave-able anytime.</p>
          <button className="token press flex items-center justify-between p-4 text-left" onClick={() => patch({ blindOptIn: !me.blindOptIn })}>
            <div>
              <p className="font-display font-bold">Blind Coffee</p>
              <p className="text-sm text-khaki">Anonymous. 48 hours of chat, then decide. No photos till you've met.</p>
            </div>
            <Chip tone={me.blindOptIn ? "spice" : "line"}>{me.blindOptIn ? "IN" : "OUT"}</Chip>
          </button>
          <button className="token press flex items-center justify-between p-4 text-left" onClick={() => patch({ openOptIn: !me.openOptIn })}>
            <div>
              <p className="font-display font-bold">Coffee Date</p>
              <p className="text-sm text-khaki">The regular version — profiles visible from the start.</p>
            </div>
            <Chip tone={me.openOptIn ? "spice" : "line"}>{me.openOptIn ? "IN" : "OUT"}</Chip>
          </button>
          {me.blindOptIn && (
            <button className="press flex items-center justify-between rounded-xl border border-line bg-bean px-4 py-3 text-left text-sm" onClick={() => patch({ showBranchInBlind: !me.showBranchInBlind })}>
              <span className="text-khaki">Show my branch while anonymous</span>
              <Chip tone={me.showBranchInBlind ? "honey" : "line"}>{me.showBranchInBlind ? "Yes" : "No"}</Chip>
            </button>
          )}
          <label className="text-sm text-khaki">One prompt (dating cards only)</label>
          <select
            className="rounded-xl border border-line bg-bean2 px-3 py-3 text-sm text-crema"
            value={me.prompt?.q ?? pools.prompts[0]}
            onChange={(e) => patch({ prompt: { q: e.target.value, a: me.prompt?.a ?? "" } })}
          >
            {pools.prompts.map((p) => <option key={p}>{p}</option>)}
          </select>
          <input
            className="rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-khaki/60"
            placeholder="Your answer…" maxLength={80}
            value={me.prompt?.a ?? ""}
            onChange={(e) => patch({ prompt: { q: me.prompt?.q ?? pools.prompts[0], a: e.target.value } })}
          />
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-4">
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < STEPS.length - 1 ? (
          <Btn full onClick={() => setStep(step + 1)}>Next</Btn>
        ) : (
          <Btn full onClick={finish}>Stamp my token ☕</Btn>
        )}
      </div>
    </main>
  );
}
