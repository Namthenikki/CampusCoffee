"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each feature answers in its own drink (COLOR-RESEARCH: one family per screen).
const TABS = [
  { href: "/today", label: "Today", icon: "☕", active: "text-crema" },
  { href: "/mess", label: "Mess", icon: "🍛", active: "text-butter" },
  { href: "/library", label: "Library", icon: "📚", active: "text-matcha-pastel" },
  { href: "/coffee", label: "Coffee", icon: "🫖", active: "text-rosemilk-pastel" },
  { href: "/chats", label: "Chats", icon: "💬", active: "text-crema" },
];

export default function TabBar() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[430px] border-t border-line bg-bean/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {TABS.map((t) => {
          const active = path.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`press flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${
                active ? t.active : "text-sediment"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>{t.icon}</span>
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
