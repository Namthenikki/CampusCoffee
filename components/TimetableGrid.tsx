"use client";

import { DAYS, SLOT_LABELS, SLOTS_PER_DAY } from "@/lib/types";

// The whole library feature lives or dies on how easy this grid is to fill.
// One tap toggles a cell; drag-painting would be v2. Green = free.
export default function TimetableGrid({
  value, onChange, readOnly, highlight,
}: {
  value: boolean[][];
  onChange?: (next: boolean[][]) => void;
  readOnly?: boolean;
  highlight?: { day: number; slot: number }[];
}) {
  const hl = new Set((highlight ?? []).map((h) => `${h.day}-${h.slot}`));
  const toggle = (d: number, s: number) => {
    if (readOnly || !onChange) return;
    const next = value.map((row) => [...row]);
    next[d][s] = !next[d][s];
    onChange(next);
  };
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[360px]">
        <div className="grid grid-cols-[36px_repeat(6,1fr)] gap-1">
          <div />
          {DAYS.map((d) => (
            <div key={d} className="text-center font-mono text-[10px] text-khaki">{d}</div>
          ))}
          {Array.from({ length: SLOTS_PER_DAY }, (_, s) => (
            <FragmentRow key={s} s={s} value={value} hl={hl} toggle={toggle} readOnly={readOnly} />
          ))}
        </div>
      </div>
      {!readOnly && <p className="mt-2 text-xs text-khaki">Tap the hours you're free. Green = free.</p>}
    </div>
  );
}

function FragmentRow({ s, value, hl, toggle, readOnly }: {
  s: number;
  value: boolean[][];
  hl: Set<string>;
  toggle: (d: number, s: number) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-1 font-mono text-[10px] text-khaki">{SLOT_LABELS[s]}</div>
      {Array.from({ length: 6 }, (_, d) => {
        const free = value[d]?.[s];
        const isHl = hl.has(`${d}-${s}`);
        return (
          <button
            key={d}
            onClick={() => toggle(d, s)}
            disabled={readOnly}
            aria-label={`${SLOT_LABELS[s]} ${d}`}
            className={`h-6 rounded ${
              isHl ? "bg-honey" : free ? "bg-matcha/70" : "bg-bean2"
            } ${readOnly ? "" : "press"}`}
          />
        );
      })}
    </>
  );
}
