"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TimetableGrid from "@/components/TimetableGrid";
import { api, Btn, Chip, Seg } from "@/components/ui";
import { TokenMark } from "@/components/Logo";
import { supabaseBrowser } from "@/lib/supabase/client";
import { BRANCHES, SLOTS_PER_DAY } from "@/lib/types";

type Me = {
  name: string; fullName: string; bio: string; gender: string; branch: string; year: number;
  diet: string; messSlot: string; mealFreq: number; interests: string[];
  subjects: string[]; studyStyle: string; prompt: { q: string; a: string } | null;
  timetable: boolean[][]; blindOptIn: boolean; openOptIn: boolean; showBranchInBlind: boolean;
  onboarded: boolean;
  verified: boolean;
};
type Pools = { interests: string[]; subjects: string[]; prompts: string[] };

const STEPS = ["you", "mess", "interests", "study", "timetable", "coffee"] as const;

// Each wizard step answers in its feature's drink (COLOR-RESEARCH: one family per screen).
const STEP_FILL: Record<(typeof STEPS)[number], string> = {
  you: "bg-honey", mess: "bg-honey", interests: "bg-honey",
  study: "bg-matcha", timetable: "bg-matcha", coffee: "bg-rosemilk",
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
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [pools, setPools] = useState<Pools>({ interests: [], subjects: [], prompts: [] });

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
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const fill = STEP_FILL[STEPS[step]];

  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 py-8">
      <div>
        <div className="mb-1.5 flex justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-sediment">
          <span>Brewing your profile</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bean2">
          <div className={`h-full rounded-full transition-all ${fill}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {STEPS[step] === "you" && (
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
            options={[{ value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }]}
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
      )}

      {STEPS[step] === "mess" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">Mess rules</h2>
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
          <label className="text-sm text-khaki">Mess meals per week: <span className="font-mono text-butter">{me.mealFreq}</span></label>
          <input type="range" min={0} max={21} value={me.mealFreq} onChange={(e) => patch({ mealFreq: Number(e.target.value) })} className="accent-honey" />
        </section>
      )}

      {STEPS[step] === "interests" && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-bold tracking-tight">What are you into?</h2>
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
          <h2 className="font-display text-2xl font-bold tracking-tight">Study mode</h2>
          <label className="text-sm text-khaki">Subjects this sem (pick up to 4)</label>
          <div className="flex flex-wrap gap-2">
            {pools.subjects.map((s) => (
              <button key={s} onClick={() => toggleIn("subjects", s, 4)} className="press">
                <Chip tone={me.subjects.includes(s) ? "matcha" : "line"}>{s}</Chip>
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
          <h2 className="font-display text-2xl font-bold tracking-tight">Your free hours</h2>
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
          <h2 className="font-display text-2xl font-bold tracking-tight">The coffee side</h2>
          <p className="text-sm text-khaki">Both optional. Both leave-able anytime.</p>
          <button className="token press flex items-center justify-between gap-3 p-4 text-left" onClick={() => patch({ blindOptIn: !me.blindOptIn })}>
            <div>
              <p className="font-display font-bold text-rosemilk-pastel">Blind Coffee</p>
              <p className="mt-0.5 text-sm text-khaki">Anonymous. 48 hours of chat, then decide. No photos till you&apos;ve met.</p>
            </div>
            <Chip tone={me.blindOptIn ? "rosemilk" : "line"}>{me.blindOptIn ? "IN" : "OUT"}</Chip>
          </button>
          <button className="token press flex items-center justify-between gap-3 p-4 text-left" onClick={() => patch({ openOptIn: !me.openOptIn })}>
            <div>
              <p className="font-display font-bold text-spice-pastel">Coffee Date</p>
              <p className="mt-0.5 text-sm text-khaki">The regular version — profiles visible from the start.</p>
            </div>
            <Chip tone={me.openOptIn ? "spice" : "line"}>{me.openOptIn ? "IN" : "OUT"}</Chip>
          </button>
          {me.blindOptIn && (
            <button className="press flex items-center justify-between rounded-xl border border-line bg-bean px-4 py-3 text-left text-sm" onClick={() => patch({ showBranchInBlind: !me.showBranchInBlind })}>
              <span className="text-khaki">Show my branch while anonymous</span>
              <Chip tone={me.showBranchInBlind ? "rosemilk" : "line"}>{me.showBranchInBlind ? "Yes" : "No"}</Chip>
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
            className="rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-sediment"
            placeholder="Your answer…" maxLength={80}
            value={me.prompt?.a ?? ""}
            onChange={(e) => patch({ prompt: { q: me.prompt?.q ?? pools.prompts[0], a: e.target.value } })}
          />
        </section>
      )}

      <div className="mt-auto flex gap-3 pt-4">
        {step > 0 && <Btn variant="ghost" onClick={() => setStep(step - 1)}>Back</Btn>}
        {step < STEPS.length - 1 ? (
          <Btn full onClick={() => setStep(step + 1)} disabled={step === 0 && (!me.fullName.trim() || !me.branch.trim())}>Next</Btn>
        ) : (
          <Btn full onClick={finish}>Stamp my token ☕</Btn>
        )}
      </div>
    </main>
  );
}
