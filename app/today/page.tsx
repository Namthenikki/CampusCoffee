"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { api, Avatar, Btn, Chip, Sheet, Token } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";

type Stats = { students: number; studySessions: number; mealsPaired: number; datesBrewing: number; datesMet: number };
type MatchRow = {
  id: string; kind: string; state: string; serial: string; expiresAt: number | null;
  partner: { name: string; anonymous: boolean } | null;
  slot: { label: string; cafe: string } | null;
  mealCount: number;
};

export default function Today() {
  const router = useRouter();
  const [me, setMe] = useState<{ name: string; examMode: boolean; blindOptIn: boolean; openOptIn: boolean } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    api<{ me: typeof me }>("/api/me")
      .then(({ me }) => setMe(me))
      .catch(() => router.replace("/welcome"));
    api<Stats>("/api/stats").then(setStats).catch(() => {});
    api<{ matches: MatchRow[] }>("/api/matches").then(({ matches }) => setMatches(matches)).catch(() => {});
  }, [router]);

  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Subah ho gayi" : hour < 17 ? "Afternoon" : hour < 21 ? "Shaam ki chai" : "Night owl";

  const needsDecision = matches.filter((m) => m.state === "decision");
  const meets = matches.filter((m) => m.state === "meet_scheduled");
  const blindActive = matches.filter((m) => m.kind === "blind" && m.state === "active");
  const streaks = matches.filter((m) => m.kind === "mess" && m.mealCount >= 2);

  const toggle = async (key: "examMode" | "blindOptIn" | "openOptIn") => {
    if (!me) return;
    const next = { ...me, [key]: !me[key] };
    setMe(next);
    await api("/api/me", { method: "PATCH", body: JSON.stringify({ [key]: next[key] }) });
  };

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pb-24 pt-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="serial">{new Date().toDateString().toUpperCase()}</p>
          <h1 className="font-display text-3xl font-bold">
            {greeting}, {me?.name?.split(" ")[0] ?? "…"} ☕
          </h1>
        </div>
        <button className="press mt-1 text-xl" onClick={() => setSettingsOpen(true)} aria-label="Settings">⚙️</button>
      </header>

      {stats && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          <Chip tone="honey">{stats.studySessions} study sessions this week</Chip>
          <Chip tone="matcha">{stats.mealsPaired} meals paired</Chip>
          <Chip tone="spice">{stats.datesBrewing} dates brewing</Chip>
        </div>
      )}

      {needsDecision.map((m) => (
        <Token key={m.id} serial={m.serial} stamp="DECIDE" stampTone="spice" className="pour-in">
          <p className="font-display text-lg font-bold">Your blind window closed.</p>
          <p className="mb-3 text-sm text-khaki">Meet {m.partner?.name} for a real coffee? Only you see your answer.</p>
          <Link href={`/chat/${m.id}`}><Btn full variant="spice">Answer now</Btn></Link>
        </Token>
      ))}

      {meets.map((m) => (
        <Token key={m.id} serial={m.serial} stamp="SCHEDULED" stampTone="matcha" className="pour-in">
          <p className="font-display text-lg font-bold">Coffee with {m.partner?.name}</p>
          <p className="mb-3 text-sm text-khaki">{m.slot?.label} · {m.slot?.cafe}</p>
          <Link href={`/meet/${m.id}`}><Btn full>Open checkin</Btn></Link>
        </Token>
      ))}

      {blindActive.map((m) => (
        <Token key={m.id} serial={m.serial} stamp="BREWING" stampTone="spice" className="pour-in">
          <div className="flex items-center gap-3">
            <Avatar name="?" anonymous />
            <div className="flex-1">
              <p className="font-display font-bold">Blind chat with {m.partner?.name}</p>
              <Countdown until={m.expiresAt} />
            </div>
            <Link href={`/chat/${m.id}`}><Btn small variant="ghost">Open</Btn></Link>
          </div>
        </Token>
      ))}

      <h2 className="mt-2 font-display text-xl font-bold">Today's pour</h2>
      <div className="grid grid-cols-1 gap-3">
        <PourCard href="/mess" title="Mess Partner" desc="Never eat alone again" icon="🍛" delay={0} />
        <PourCard href="/library" title="Library Partner" desc={me?.examMode ? "Exam mode is ON — priority matching" : "Find someone whose free hours actually match"} icon="📚" delay={1} />
        <PourCard href="/coffee" title="Blind Coffee & Dates" desc="Three fresh pours a day. That's it. Make them count." icon="🫖" delay={2} />
      </div>

      {streaks.length > 0 && (
        <Token className="mt-1">
          <p className="font-display font-bold">Streaks 🔥</p>
          {streaks.map((m) => (
            <p key={m.id} className="text-sm text-khaki">
              {m.mealCount} meals with <span className="text-crema">{m.partner?.name}</span> — proven pair
            </p>
          ))}
        </Token>
      )}

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Your settings">
        <div className="flex flex-col gap-3">
          <SettingRow label="Exam mode" hint="Boosts study-partner urgency" on={!!me?.examMode} onToggle={() => toggle("examMode")} />
          <SettingRow label="Blind Coffee queue" hint="Anonymous matching" on={!!me?.blindOptIn} onToggle={() => toggle("blindOptIn")} />
          <SettingRow label="Coffee Date queue" hint="Visible profiles" on={!!me?.openOptIn} onToggle={() => toggle("openOptIn")} />
          <Btn
            variant="ghost"
            onClick={async () => {
              // Clear the session on both sides — browser store and server cookies.
              await supabaseBrowser().auth.signOut();
              await api("/api/logout", { method: "POST" }).catch(() => {});
              router.replace("/welcome");
            }}
          >
            Sign out
          </Btn>
        </div>
      </Sheet>
      <TabBar />
    </main>
  );
}

function SettingRow({ label, hint, on, onToggle }: { label: string; hint: string; on: boolean; onToggle: () => void }) {
  return (
    <button className="press flex items-center justify-between rounded-xl border border-line bg-bean2 px-4 py-3 text-left" onClick={onToggle}>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-khaki">{hint}</p>
      </div>
      <Chip tone={on ? "honey" : "line"}>{on ? "ON" : "OFF"}</Chip>
    </button>
  );
}

function PourCard({ href, title, desc, icon, delay }: { href: string; title: string; desc: string; icon: string; delay: number }) {
  return (
    <Link href={href}>
      <div className="token press pour-in flex items-center gap-4 p-4" style={{ animationDelay: `${delay * 120}ms` }}>
        <span className="text-3xl" aria-hidden>{icon}</span>
        <div>
          <p className="font-display text-lg font-bold">{title}</p>
          <p className="text-sm text-khaki">{desc}</p>
        </div>
        <span className="ml-auto text-khaki" aria-hidden>→</span>
      </div>
    </Link>
  );
}

function Countdown({ until }: { until: number | null }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!until) return null;
  const ms = Math.max(0, until - now);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return <p className="font-mono text-xs text-spice">{h}h {m}m left in the window</p>;
}
