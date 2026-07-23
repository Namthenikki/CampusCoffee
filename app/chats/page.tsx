"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import { api, Avatar, Chip, Empty } from "@/components/ui";
import { DAYS, SLOT_LABELS } from "@/lib/types";

type Row = {
  id: string; serial: string; kind: string; state: string;
  partner: { name: string; anonymous: boolean } | null;
  lastMessage: { text: string; at: number } | null;
  studySlot: { day: number; slot: number } | null;
  slot: { label: string; cafe: string } | null;
  mealCount: number;
  expiresAt: number | null;
};

const KIND_ICON: Record<string, string> = { mess: "🍛", library: "📚", blind: "🫖", open: "☕" };

export default function Chats() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    api<{ matches: Row[] }>("/api/matches")
      .then(({ matches }) => setRows(matches.filter((m) => m.state !== "dissolved" && m.state !== "expired")))
      .catch(() => router.replace("/welcome"));
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col gap-3 px-5 pb-24 pt-8">
      <header>
        <p className="serial">YOUR TOKENS</p>
        <h1 className="font-display text-3xl font-bold">Chats 💬</h1>
      </header>

      {rows === null ? (
        <p className="text-khaki">Brewing…</p>
      ) : rows.length === 0 ? (
        <Empty title="No tokens yet" hint="Pair up in Mess, lock a Library slot, or send a brew on the Coffee side." />
      ) : (
        rows.map((m) => (
          <Link key={m.id} href={m.state === "meet_scheduled" || m.state === "met" ? `/meet/${m.id}` : `/chat/${m.id}`}>
            <div className="token press flex items-center gap-3 p-4">
              <div className="relative">
                <Avatar name={m.partner?.anonymous ? "?" : (m.partner?.name ?? "?")} anonymous={m.partner?.anonymous} />
                <span className="absolute -bottom-1 -right-1 text-sm" aria-hidden>{KIND_ICON[m.kind]}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-display font-bold">{m.partner?.name ?? "…"}</p>
                  <StateChip m={m} />
                </div>
                <p className="truncate text-sm text-khaki">
                  {m.state === "decision"
                    ? "Window closed — answer the coffee question"
                    : m.state === "meet_scheduled"
                      ? `${m.slot?.label} · ${m.slot?.cafe}`
                      : m.lastMessage?.text ?? "Say hello — the token's stamped"}
                </p>
              </div>
              <span className="serial">№{m.serial.split("-")[1]}</span>
            </div>
          </Link>
        ))
      )}
      <TabBar />
    </main>
  );
}

function StateChip({ m }: { m: Row }) {
  if (m.kind === "mess" && m.mealCount >= 2) return <Chip tone="matcha">{m.mealCount}🔥</Chip>;
  if (m.state === "decision") return <Chip tone="spice">decide</Chip>;
  if (m.state === "meet_scheduled") return <Chip tone="honey">meeting</Chip>;
  if (m.state === "met") return <Chip tone="matcha">met ✓</Chip>;
  if (m.kind === "blind" && m.expiresAt) {
    const h = Math.max(0, Math.floor((m.expiresAt - Date.now()) / 3_600_000));
    return <Chip tone="spice">{h}h</Chip>;
  }
  if (m.kind === "library" && m.studySlot) {
    return <Chip tone="honey">{DAYS[m.studySlot.day]} {SLOT_LABELS[m.studySlot.slot]}</Chip>;
  }
  return null;
}
