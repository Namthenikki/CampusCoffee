"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TabBar from "@/components/TabBar";
import TimetableGrid from "@/components/TimetableGrid";
import { api, Avatar, Btn, Chip, Empty, Sheet, Token } from "@/components/ui";
import { DAYS, SLOT_LABELS } from "@/lib/types";

type Candidate = {
  user: { id: string; name: string; branch: string | null; year: number | null; studyStyle: string };
  overlap: { day: number; slot: number }[];
  overlapCount: number;
  subjectsShared: string[];
  examBoost: boolean;
};

const STYLE_LABEL: Record<string, string> = { silent: "Pin-drop silent", discussion: "Discussion", mixed: "Flexible" };

export default function Library() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [examMode, setExamMode] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [timetable, setTimetable] = useState<boolean[][]>([]);
  const [picking, setPicking] = useState<Candidate | null>(null);

  const load = useCallback(() => {
    api<{ candidates: Candidate[]; examMode: boolean }>("/api/library/candidates")
      .then((d) => { setCandidates(d.candidates); setExamMode(d.examMode); })
      .catch(() => router.replace("/welcome"));
    api<{ me: { timetable: boolean[][] } }>("/api/me").then(({ me }) => setTimetable(me.timetable)).catch(() => {});
  }, [router]);
  useEffect(load, [load]);

  const toggleExam = async () => {
    setExamMode(!examMode);
    await api("/api/me", { method: "PATCH", body: JSON.stringify({ examMode: !examMode }) });
    load();
  };

  const saveTimetable = async () => {
    await api("/api/me", { method: "PATCH", body: JSON.stringify({ timetable }) });
    setEditOpen(false);
    load();
  };

  const lock = async (c: Candidate, day: number, slot: number) => {
    const { matchId } = await api<{ matchId: string }>("/api/library/lock", {
      method: "POST",
      body: JSON.stringify({ userId: c.user.id, day, slot }),
    });
    router.push(`/chat/${matchId}`);
  };

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pb-24 pt-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="serial">LIBRARY PARTNER</p>
          <h1 className="font-display text-3xl font-bold">Study o'clock 📚</h1>
        </div>
        <Btn small variant="ghost" onClick={() => setEditOpen(true)}>Timetable</Btn>
      </header>

      <button className="token press flex items-center justify-between p-4 text-left" onClick={toggleExam}>
        <div>
          <p className="font-display font-bold">Exam mode</p>
          <p className="text-sm text-khaki">Boosts urgency — surfaces others grinding for exams too</p>
        </div>
        <Chip tone={examMode ? "spice" : "line"}>{examMode ? "ON 🔥" : "OFF"}</Chip>
      </button>

      <p className="text-sm text-khaki">
        Only people whose free hours <span className="text-crema">actually overlap yours</span>. Chat opens once you lock a real slot — no slot, no chat.
      </p>

      {candidates === null ? (
        <p className="text-khaki">Brewing…</p>
      ) : candidates.length === 0 ? (
        <Empty title="Zero overlap right now" hint="Fill in more free hours in your timetable — overlap is a hard filter here, not a suggestion." />
      ) : (
        candidates.map((c, i) => (
          <Token key={c.user.id} className="pour-in" stamp={c.examBoost ? "EXAM GRIND" : undefined} stampTone="spice">
            <div className="flex items-center gap-3" style={{ animationDelay: `${i * 80}ms` }}>
              <Avatar name={c.user.name} />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">
                  {c.user.name}
                  <span className="ml-1 font-sans text-sm font-normal text-khaki">{c.user.branch} · Y{c.user.year}</span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Chip tone="honey">{c.overlapCount} free hrs shared</Chip>
                  <Chip>{STYLE_LABEL[c.user.studyStyle]}</Chip>
                  {c.subjectsShared.map((s) => <Chip key={s} tone="matcha">{s}</Chip>)}
                </div>
              </div>
              <Btn small onClick={() => setPicking(c)}>Lock slot</Btn>
            </div>
          </Token>
        ))
      )}

      <Sheet open={!!picking} onClose={() => setPicking(null)} title={`Pick a slot with ${picking?.user.name ?? ""}`}>
        <p className="mb-3 text-sm text-khaki">These hours are free for both of you. Locking one opens your chat.</p>
        <div className="flex flex-wrap gap-2">
          {picking?.overlap.map((o) => (
            <button key={`${o.day}-${o.slot}`} className="press" onClick={() => lock(picking, o.day, o.slot)}>
              <Chip tone="honey">{DAYS[o.day]} {SLOT_LABELS[o.slot]}</Chip>
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)} title="Your free hours">
        {timetable.length > 0 && <TimetableGrid value={timetable} onChange={setTimetable} />}
        <div className="mt-4">
          <Btn full onClick={saveTimetable}>Save timetable</Btn>
        </div>
      </Sheet>
      <TabBar />
    </main>
  );
}
