"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, Avatar, Btn, Chip, Stamp } from "@/components/ui";
import { DAYS, SLOT_LABELS } from "@/lib/types";

type View = {
  id: string; serial: string; kind: string; state: string; expiresAt: number | null;
  myDecision: "yes" | "no" | null;
  partner: { id: string; name: string; branch: string | null; year: number | null; anonymous: boolean } | null;
  partnerIsBot: boolean;
  slot: { label: string; cafe: string } | null;
  studySlot: { day: number; slot: number } | null;
  mealCount: number;
};
type Msg = { id: string; from: string; text: string; at: number };

export default function Chat() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [meId, setMeId] = useState("");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const countRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const d = await api<{ match: View; messages: Msg[] }>(`/api/chat/${id}`);
      setView(d.match);
      setMsgs(d.messages);
      if (d.messages.length !== countRef.current) {
        countRef.current = d.messages.length;
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    } catch {
      router.replace("/chats");
    }
  }, [id, router]);

  useEffect(() => {
    api<{ me: { id: string } }>("/api/me").then(({ me }) => setMeId(me.id)).catch(() => router.replace("/welcome"));
    load();
    const t = setInterval(load, 2500);
    return () => clearInterval(t);
  }, [load, router]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    setErr("");
    try {
      await api(`/api/chat/${id}`, { method: "POST", body: JSON.stringify({ text: body }) });
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't send");
      setText(body);
    }
  };

  const decide = async (yes: boolean) => {
    const d = await api<{ match: View }>("/api/coffee/decision", {
      method: "POST",
      body: JSON.stringify({ matchId: id, yes }),
    });
    setView(d.match);
    if (d.match.state === "dissolved") router.replace("/chats");
  };

  const ateTogether = async () => {
    await api("/api/mess/meal", { method: "POST", body: JSON.stringify({ matchId: id }) });
    load();
  };

  const demoExpire = async () => {
    const d = await api<{ match: View }>("/api/dev", { method: "POST", body: JSON.stringify({ matchId: id, op: "expire" }) });
    setView(d.match);
  };

  if (!view) return <main className="flex min-h-dvh items-center justify-center text-khaki">Brewing…</main>;

  const chatOpen = view.state === "active" || view.state === "meet_scheduled" || view.state === "met";

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-bean px-4 py-3">
        <Link href="/chats" className="press text-xl text-khaki" aria-label="Back">←</Link>
        <Avatar name={view.partner?.anonymous ? "?" : (view.partner?.name ?? "?")} anonymous={view.partner?.anonymous} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-bold">{view.partner?.name}</p>
          <HeaderSub view={view} />
        </div>
        {view.kind === "mess" && <Btn small variant="ghost" onClick={ateTogether}>Ate together 🍽</Btn>}
        {(view.state === "meet_scheduled" || view.state === "met") && (
          <Link href={`/meet/${view.id}`}><Btn small>Meet →</Btn></Link>
        )}
      </header>

      {view.kind === "blind" && view.state === "active" && (
        <div className="flex items-center justify-between border-b border-line bg-bean2 px-4 py-2">
          <p className="text-xs text-khaki">Photos, links & numbers stay sealed till you've met.</p>
          {view.partnerIsBot && (
            <button className="press font-mono text-[10px] uppercase tracking-widest text-spice" onClick={demoExpire}>
              demo: end window
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {msgs.length === 0 && (
          <div className="mt-8 text-center">
            <Stamp tone="honey">TOKEN STAMPED</Stamp>
            <p className="mt-3 text-sm text-khaki">
              {view.kind === "blind" ? "48 hours. No names, no photos. Just talk." : "You're matched. Say something real."}
            </p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          {msgs.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] ${
                m.from === meId ? "self-end rounded-br-md bg-honey text-cream" : "self-start rounded-bl-md border border-line bg-bean"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      {view.state === "decision" && (
        <div className="border-t border-line bg-bean p-5">
          <p className="serial mb-1">№ {view.serial} · THE QUESTION</p>
          <p className="mb-1 font-display text-xl font-bold">Meet for a real coffee?</p>
          <p className="mb-4 text-sm text-khaki">
            Your answer is private. If it's not mutual, this token quietly dissolves — they'll never see a no.
          </p>
          {view.myDecision ? (
            <Chip tone="honey">You said {view.myDecision} — waiting for them</Chip>
          ) : (
            <div className="flex gap-3">
              <Btn full variant="spice" onClick={() => decide(true)}>Yes, coffee ☕</Btn>
              <Btn full variant="ghost" onClick={() => decide(false)}>Quietly pass</Btn>
            </div>
          )}
        </div>
      )}

      {chatOpen && (
        <div className="border-t border-line bg-bean p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {err && <p className="mb-2 text-xs text-spice">{err}</p>}
          <div className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded-xl border border-line bg-bean2 px-4 py-3 text-crema placeholder:text-khaki/60"
              placeholder={view.kind === "blind" && view.state === "active" ? "Stay mysterious…" : "Message…"}
              value={text}
              maxLength={500}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <Btn onClick={send}>Send</Btn>
          </div>
        </div>
      )}
    </main>
  );
}

function HeaderSub({ view }: { view: View }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (view.kind === "blind" && view.state === "active" && view.expiresAt) {
    const ms = Math.max(0, view.expiresAt - now);
    return (
      <p className="font-mono text-[11px] text-spice">
        ⏳ {Math.floor(ms / 3_600_000)}h {Math.floor((ms % 3_600_000) / 60_000)}m left
      </p>
    );
  }
  if (view.kind === "library" && view.studySlot) {
    return <p className="font-mono text-[11px] text-matcha">📚 {DAYS[view.studySlot.day]} {SLOT_LABELS[view.studySlot.slot]} · locked</p>;
  }
  if (view.kind === "mess" && view.mealCount > 0) {
    return <p className="font-mono text-[11px] text-matcha">🔥 {view.mealCount} meals together</p>;
  }
  const sub: Record<string, string> = { mess: "mess partner", library: "study partner", blind: "blind coffee", open: "coffee date" };
  return <p className="text-[11px] text-khaki">{sub[view.kind]}</p>;
}
