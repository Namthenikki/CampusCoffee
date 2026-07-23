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
          <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
            What's your<br /><span className="text-honey">college email?</span>
          </h1>
          <p className="mt-3 text-khaki">
            Campus Coffee is students only. This is how we keep it that way.
          </p>
        </div>

        <Token className="flex flex-col gap-3 p-5">
          <span className="serial">MANIPAL UNIVERSITY JAIPUR</span>
          <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-bean2">
            <input
              className="min-w-0 flex-1 bg-transparent px-4 py-3 text-crema placeholder:text-khaki/60"
              placeholder="firstname.regno"
              autoCapitalize="none"
              autoCorrect="off"
              value={local}
              onChange={(e) => setLocal(e.target.value.split("@")[0].trim())}
              onKeyDown={(e) => e.key === "Enter" && claim()}
            />
            <span className="flex items-center bg-bean px-3 font-mono text-xs text-khaki">@{s.domain}</span>
          </div>
          {err && <p className="text-sm text-spice">{err}</p>}
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
        <h1 className="mt-2 font-display text-3xl font-bold leading-tight">
          Send one email.<br />That's it.
        </h1>
      </div>

      <Token className="p-5">
        <p className="font-display font-bold">Why we ask</p>
        <p className="mt-2 text-sm leading-relaxed text-khaki">
          People meet up in real life through Campus Coffee, so everyone here has to be a real
          student. Anyone can type an email address — but only you can{" "}
          <span className="text-crema">send</span> from your college account. That's what makes
          catfishing impossible here.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-khaki">
          We check the sender address and nothing else. The message body is never read or stored.
        </p>
      </Token>

      <Token className="flex flex-col gap-3 p-5">
        <span className="serial">EVERYTHING IS PRE-WRITTEN</span>
        <div className="rounded-xl border border-line bg-bean2 p-3 text-sm">
          <p className="text-khaki">To</p>
          <p className="font-mono text-[13px] text-crema">{s.sendTo}</p>
          <p className="mt-2 text-khaki">Subject</p>
          <p className="font-mono text-[13px] text-crema">{subject}</p>
        </div>

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

        <p className="text-center text-xs text-khaki">
          Send it from <span className="text-crema">{s.claimedEmail}</span> — it only works from that account.
        </p>
      </Token>

      {sent ? (
        <div className="flex items-center justify-center gap-2 text-sm text-khaki">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-matcha" />
          Waiting for your email… this page updates on its own.
        </div>
      ) : (
        <p className="text-center text-xs text-khaki">
          This page updates by itself once your email arrives — no need to come back and click anything.
        </p>
      )}

      <button className="press text-center text-xs text-khaki underline underline-offset-4" onClick={() => { setLocal(""); setS({ ...s, code: null }); }}>
        Wrong address? Start over
      </button>
    </main>
  );
}
