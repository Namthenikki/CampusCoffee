"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Btn, Token } from "@/components/ui";

type State = {
  verified: boolean;
  campusEmail: string | null;
  sendTo: string;
  domain: string;
  code: string | null;
  claimedEmail: string | null;
  expiresAt: number | null;
};

export default function Verify() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [local, setLocal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    const next = await api<State>("/api/verify").catch(() => null);
    if (!next) { router.replace("/welcome"); return; }
    if (next.verified) { router.replace("/"); return; }
    setS(next);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // They're off in their mail app — keep checking so this flips the moment the
  // email arrives, with nothing to click when they come back.
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  const claim = async () => {
    setErr("");
    setBusy(true);
    try {
      await api("/api/verify", { method: "POST", body: JSON.stringify({ local }) });
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusy(false);
  };

  if (!s) {
    return <main className="flex min-h-dvh items-center justify-center"><p className="serial">CHECKING…</p></main>;
  }

  // ---- Step 1: which college address is yours ----
  if (!s.code) {
    return (
      <main className="flex min-h-dvh flex-col justify-center gap-6 px-6 py-10">
        <div>
          <p className="serial">STEP 1 OF 2</p>
          <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight">
            What&apos;s your<br /><span className="text-butter">college email?</span>
          </h1>
          <p className="mt-3 max-w-[34ch] leading-relaxed text-khaki">
            Campus Coffee is students only. This is how we keep it that way.
          </p>
        </div>

        <Token className="pour-in flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <span className="serial">MANIPAL UNIVERSITY JAIPUR</span>
            <span className="stamp text-butter">Students only</span>
          </div>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-bean2 focus-within:border-honey/60">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-crema placeholder:text-sediment"
              placeholder="firstname.regno"
              autoCapitalize="none"
              autoCorrect="off"
              value={local}
              onChange={(e) => setLocal(e.target.value.split("@")[0].trim())}
              onKeyDown={(e) => e.key === "Enter" && claim()}
            />
            <span className="flex items-center border-l border-line bg-bean px-3 font-mono text-[13px] text-crema">@{s.domain}</span>
          </div>
          {err && <p className="text-sm text-spice-pastel">{err}</p>}
          <Btn full onClick={claim} disabled={busy || !local}>{busy ? "One moment…" : "Continue"}</Btn>
        </Token>
      </main>
    );
  }

  // ---- Step 2: why, then one tap to a pre-written email ----
  const subject = `Campus Coffee verification ${s.code}`;
  const body =
    `${s.code}\n\n` +
    `Sending this from my college account to verify I'm a student at ${s.domain}.\n` +
    `Nothing else in this email is read.`;
  const mailto = `mailto:${s.sendTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const outlookWeb =
    `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(s.sendTo)}` +
    `&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-5 px-6 py-10">
      <div>
        <p className="serial">STEP 2 OF 2</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-[1.05] tracking-tight">
          Send one email.<br />That&apos;s it.
        </h1>
      </div>

      <Token className="p-5">
        <p className="font-display font-bold">Why we ask</p>
        <p className="mt-2 text-sm leading-relaxed text-khaki">
          People meet up in real life through Campus Coffee, so everyone here has to be a real
          student. Anyone can type an email address — but only you can{" "}
          <span className="text-crema">send</span> from your college account. That&apos;s what makes
          catfishing impossible here.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-khaki">
          We check the sender address and nothing else. The message body is never read or stored.
        </p>
      </Token>

      {/* The pre-written email is a literal cream ticket — tear it off, send it. */}
      <div className="ticket pour-in p-5 pr-6" style={{ transform: "rotate(-0.6deg)" }}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#875D26]">
            Everything is pre-written
          </p>
          <span className="stamp text-[#B4485F]">Ready</span>
        </div>
        <div className="mt-3 text-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">To</p>
          <p className="font-mono text-[13px]">{s.sendTo}</p>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] opacity-60">Subject</p>
          <p className="font-mono text-[13px]">{subject}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <a href={mailto} onClick={() => setSent(true)} className="press block rounded-xl bg-honey py-3 text-center font-semibold text-cream">
          Open my mail app &amp; send
        </a>
        <a
          href={outlookWeb}
          target="_blank"
          rel="noreferrer"
          onClick={() => setSent(true)}
          className="press block rounded-xl border border-line bg-bean py-3 text-center text-sm font-semibold text-crema"
        >
          Open Outlook on the web
        </a>
        <p className="text-center text-xs text-sediment">
          Send it from <span className="text-crema">{s.claimedEmail}</span> — it only works from that account.
        </p>
      </div>

      {sent ? (
        <div className="flex items-center justify-center gap-2 text-sm text-matcha-pastel">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-matcha" />
          Waiting for your email… this page updates on its own.
        </div>
      ) : (
        <p className="text-center text-xs text-sediment">
          This page updates by itself once your email arrives — no need to come back and click anything.
        </p>
      )}

      <button className="press text-center text-xs text-khaki underline underline-offset-4" onClick={() => { setLocal(""); setS({ ...s, code: null }); }}>
        Wrong address? Start over
      </button>
    </main>
  );
}
