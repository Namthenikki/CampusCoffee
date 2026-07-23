"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Root() {
  const router = useRouter();
  useEffect(() => {
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.me?.onboarded) router.replace("/today");
        else router.replace("/welcome");
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
