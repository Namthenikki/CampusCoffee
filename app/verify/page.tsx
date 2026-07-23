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
  expiresAt: number | null;
};

export default function Verify() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"code" | "address" | null>(null);

  const load = useCallback(async () => {
    const next = await api<State>("/api/verify").catch(() => null);
    if (!next) { router.replace("/welcome"); return; }
    if (next.verified) { router.replace("/today"); return; }
    setS(next);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // While they're off in their mail app, keep checking so the screen flips the
  // moment the email lands — no refresh, no "click here when done".
  useEffect(() => {
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const getCode = async () => {
    setBusy(true);
    await api("/api/verify", { method: "POST" }).catch(() => {});
    await load();
    setBusy(false);
  };

  const copy = (text: string, which: "code" | "address") => {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!s) {
    return <main className="flex min-h-dvh items-center justify-center"><p className="serial">CHECKING…</p></main>;
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center gap-6 px-6 py-10">
      <div>
        <p className="serial">ONE STEP LEFT</p>
        <h1 className="mt-2 font-display text-4xl font-bold leading-tight">
          Prove you're a<br /><span className="text-honey">student</span>
        </h1>
        <p className="mt-3 text-khaki">
          Send one email from your college account. That's the whole check — we read the
          sender address, not the message.
        </p>
      </div>

      {!s.code ? (
        <Token className="p-5">
          <p className="mb-3 text-sm text-khaki">Get your code, then send it from your college mail.</p>
          <Btn full onClick={getCode} disabled={busy}>{busy ? "Getting your code…" : "Get my code"}</Btn>
        </Token>
      ) : (
        <Token className="flex flex-col gap-4 p-5">
          <div>
            <p className="serial mb-1">STEP 1 · SEND TO</p>
            <button
              className="press flex w-full items-center justify-between rounded-xl border border-line bg-bean2 px-4 py-3 text-left"
              onClick={() => copy(s.sendTo, "address")}
            >
              <span className="font-mono text-sm">{s.sendTo}</span>
              <span className="text-xs text-khaki">{copied === "address" ? "copied" : "tap to copy"}</span>
            </button>
          </div>

          <div>
            <p className="serial mb-1">STEP 2 · SUBJECT OR BODY</p>
            <button
              className="press flex w-full items-center justify-between rounded-xl border border-line bg-bean2 px-4 py-3 text-left"
              onClick={() => copy(s.code!, "code")}
            >
              <span className="font-mono text-xl font-bold tracking-widest text-honey">{s.code}</span>
              <span className="text-xs text-khaki">{copied === "code" ? "copied" : "tap to copy"}</span>
            </button>
          </div>

          <a
            href={`mailto:${s.sendTo}?subject=${encodeURIComponent(s.code)}&body=${encodeURIComponent(s.code)}`}
            className="press block rounded-xl bg-honey py-3 text-center font-semibold text-cream"
          >
            Open my mail app
          </a>

          <p className="text-center text-xs text-khaki">
            Must be sent from your <span className="text-crema">@{s.domain}</span> account.
            This page updates by itself the moment it arrives.
          </p>
        </Token>
      )}

      <p className="text-center text-xs text-khaki">
        We only ever check that the sender is a college address. Nothing else in the email is read or stored.
      </p>
    </main>
  );
}
