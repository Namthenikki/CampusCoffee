"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TokenMark } from "@/components/Logo";

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
        else if (!me.photosComplete) router.replace("/profile/photos");
        else router.replace("/today");
      })
      .catch(() => router.replace("/welcome"));
  }, [router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5">
      <div className="pour-in">
        <TokenMark size={96} variant="coin" />
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight">
        Campus <span className="text-butter">Coffee</span>
      </h1>
      <p className="serial">BREWING…</p>
    </main>
  );
}
