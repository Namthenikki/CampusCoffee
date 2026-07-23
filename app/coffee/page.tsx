"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { api, Avatar, Btn, Chip, Empty, Seg, Token } from "@/components/ui";

type Candidate = {
  user: {
    id: string; name: string; branch: string | null; year: number | null;
    interests: string[]; prompt: { q: string; a: string } | null; anonymous: boolean;
  };
  sharedInterests: string[];
};

export default function Coffee() {
  const router = useRouter();
  const [mode, setMode] = useState<"blind" | "open">("blind");
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    setOptedIn(null);
    api<{ optedIn: boolean; candidates: Candidate[] }>(`/api/coffee/candidates?mode=${mode}`)
      .then((d) => { setOptedIn(d.optedIn); setCandidates(d.candidates); })
      .catch(() => router.replace("/welcome"));
  }, [mode, router]);
  useEffect(load, [load]);

  const optIn = async () => {
    await api("/api/me", { method: "PATCH", body: JSON.stringify(mode === "blind" ? { blindOptIn: true } : { openOptIn: true }) });
    load();
  };

  const brew = async (userId: string) => {
    setSent((s) => new Set(s).add(userId));
    const res = await api<{ matched: boolean; matchId?: string }>("/api/coffee/like", {
      method: "POST",
      body: JSON.stringify({ userId, mode }),
    });
    if (res.matched && res.matchId) {
      router.push(`/chat/${res.matchId}`);
    } else {
      setToast("Brew sent. If they brew you back, a token appears in Chats. No pressure either way ☕");
      setTimeout(() => setToast(""), 4000);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pb-24 pt-8">
      <header>
        <p className="serial">THE COFFEE SIDE</p>
        <h1 className="font-display text-3xl font-bold">
          {mode === "blind" ? "Blind Coffee 🫖" : "Coffee Date ☕"}
        </h1>
      </header>

      <Seg
        options={[{ value: "blind", label: "Blind" }, { value: "open", label: "Open" }]}
        value={mode}
        onChange={setMode}
      />

      <p className="text-sm text-khaki">
        {mode === "blind"
          ? "No photos. No names. 48 hours of chat, then one question: coffee or not. Your answer stays private."
          : "The straightforward version — real profiles, real names, same coffee."}
      </p>

      {optedIn === null ? (
        <p className="text-khaki">Brewing…</p>
      ) : !optedIn ? (
        <Token className="p-6 text-center">
          <p className="font-display text-xl font-bold">You're not in this queue</p>
          <p className="mb-4 mt-1 text-sm text-khaki">
            {mode === "blind"
              ? "Blind Coffee is opt-in and separate from everything else. Leave anytime, no trace."
              : "Coffee Date is opt-in. Your profile shows only to others in the queue."}
          </p>
          <Btn full variant="spice" onClick={optIn}>Join the queue</Btn>
        </Token>
      ) : candidates.length === 0 ? (
        <Empty title="The pot's empty right now" hint="Fresh pours land daily. Scarcity is the point — check back tomorrow." />
      ) : (
        <>
          <p className="serial">TODAY'S POUR · {candidates.length} TOKENS</p>
          {candidates.map((c, i) => (
            <Token key={c.user.id} className="pour-in" stamp={c.user.anonymous ? "SEALED" : undefined} stampTone="spice">
              <div style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3">
                  <Avatar name={c.user.name} anonymous={c.user.anonymous} size={52} />
                  <div>
                    <p className="font-display text-lg font-bold">{c.user.name}</p>
                    <p className="text-sm text-khaki">
                      {c.user.branch ?? "Branch sealed"} · Year {c.user.year}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.user.interests.map((t) => (
                    <Chip key={t} tone={c.sharedInterests.includes(t) ? "spice" : "line"}>
                      {c.sharedInterests.includes(t) ? `${t} — you too` : t}
                    </Chip>
                  ))}
                </div>
                {c.user.prompt?.a && (
                  <div className="tear mt-3 pt-3">
                    <p className="text-xs text-khaki">{c.user.prompt.q}</p>
                    <p className="font-display text-[15px]">“{c.user.prompt.a}”</p>
                  </div>
                )}
                <div className="mt-3">
                  {sent.has(c.user.id) ? (
                    <Chip tone="matcha">Brew sent ✓</Chip>
                  ) : (
                    <Btn full variant="spice" onClick={() => brew(c.user.id)}>
                      Send a brew {mode === "blind" ? "🫖" : "☕"}
                    </Btn>
                  )}
                </div>
              </div>
            </Token>
          ))}
        </>
      )}

      {toast && (
        <div className="fixed inset-x-5 bottom-24 z-50 mx-auto max-w-[390px] rounded-xl border border-line bg-bean2 p-3 text-center text-sm">
          {toast}
        </div>
      )}
      <TabBar />
    </main>
  );
}
