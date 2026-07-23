"use client";

import { type ReactNode } from "react";

export function Btn({
  children, onClick, variant = "primary", disabled, full, small,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "spice" | "rosemilk" | "quiet";
  disabled?: boolean;
  full?: boolean;
  small?: boolean;
}) {
  const base =
    "press rounded-xl font-semibold disabled:opacity-40 disabled:pointer-events-none " +
    (small ? "px-3 py-1.5 text-sm " : "px-4 py-3 text-[15px] ") +
    (full ? "w-full " : "");
  const styles = {
    primary: "bg-honey text-cream",
    spice: "bg-spice text-cream",
    rosemilk: "bg-rosemilk text-cream",
    ghost: "border border-line bg-bean text-crema",
    quiet: "text-khaki underline-offset-4 underline",
  }[variant];
  return (
    <button className={base + styles} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function Chip({ children, tone = "line" }: { children: ReactNode; tone?: "line" | "honey" | "spice" | "matcha" | "rosemilk" }) {
  // Pastels carry text/outlines on the roast (COLOR-RESEARCH: pastel ≥9.7:1).
  const tones = {
    line: "border-line text-khaki",
    honey: "border-honey/60 text-butter",
    spice: "border-spice/60 text-spice-pastel",
    matcha: "border-matcha/60 text-matcha-pastel",
    rosemilk: "border-rosemilk/60 text-rosemilk-pastel",
  }[tone];
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs ${tones}`}>{children}</span>
  );
}

export function Stamp({ children, tone = "honey" }: { children: ReactNode; tone?: "honey" | "spice" | "matcha" | "rosemilk" | "khaki" }) {
  const color = {
    honey: "text-butter",
    spice: "text-spice-pastel",
    matcha: "text-matcha-pastel",
    rosemilk: "text-rosemilk-pastel",
    khaki: "text-khaki",
  }[tone];
  return <span className={`stamp ${color}`}>{children}</span>;
}

// Drink tones only — every one carries ink text at ≥5.2:1.
const AVATAR_TONES = ["#e89aab", "#dba55e", "#a9c98f", "#e06a50", "#f5c1cb", "#f0ce9a"];
export function Avatar({ name, anonymous, size = 44 }: { name: string; anonymous?: boolean; size?: number }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const bg = AVATAR_TONES[hash % AVATAR_TONES.length];
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-cream"
      style={{ width: size, height: size, background: anonymous ? "var(--color-bean2)" : bg, fontSize: size * 0.42 }}
      aria-hidden
    >
      {anonymous ? <span className="text-khaki">?</span> : name[0]?.toUpperCase()}
    </div>
  );
}

export function Token({ children, className = "", serial, stamp, stampTone }: {
  children: ReactNode;
  className?: string;
  serial?: string;
  stamp?: string;
  stampTone?: "honey" | "spice" | "matcha" | "khaki";
}) {
  return (
    <div className={`token p-4 ${className}`}>
      {(serial || stamp) && (
        <div className="mb-2 flex items-center justify-between">
          {serial ? <span className="serial">№ {serial}</span> : <span />}
          {stamp ? <Stamp tone={stampTone}>{stamp}</Stamp> : null}
        </div>
      )}
      {children}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 mx-auto max-w-[430px]">
      <button aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-bean p-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Seg<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-xl border border-line bg-bean p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`press flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
            value === o.value ? "bg-honey text-cream" : "text-khaki"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="token p-6 text-center">
      <p className="font-display text-lg font-bold">{title}</p>
      <p className="mt-1 text-sm text-khaki">{hint}</p>
    </div>
  );
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}
