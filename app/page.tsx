"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The single gate. Every entry to the app routes through here:
//   not signed in     -> /welcome
//   not a proven student -> /verify
//   profile unfinished   -> /welcome (onboarding wizard)
//   otherwise            -> /today
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const me = data?.me;
        if (!me) router.replace("/welcome");
        else if (!me.verified) router.replace("/verify");
        else if (!me.onboarded) router.replace("/welcome");
        else router.replace("/today");
      })
      .catch(() => router.replace("/welcome"));
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3">
      <div className="steam font-display text-2xl text-khaki" aria-hidden>
        <span>(</span>
        <span>(</span>
        <span>(</span>
      </div>
      <h1 className="font-display text-4xl font-bold">
        Campus <span className="text-honey">Coffee</span>
      </h1>
      <p className="serial">BREWING…</p>
    </main>
  );
}
