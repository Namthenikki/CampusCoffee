"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, Btn, Chip, Stamp, Token } from "@/components/ui";
import { CHECKIN_REQUIRED_MS } from "@/lib/types";

type View = {
  id: string; serial: string; kind: string; state: string;
  partner: { id: string; name: string; anonymous: boolean } | null;
  partnerIsBot: boolean;
  slot: { label: string; cafe: string; startsAt: number } | null;
  checkin: { accumMs: number; success: boolean; partnerPinging: boolean };
  reveal: {
    outcome: "match" | "not_match" | null;
    myVote: "well" | "not" | null;
    voted: number;
    photos: Record<string, { owner: string; kind: string; blurred: boolean; dataUrl: string | null }>;
  };
};

export default function Meet() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [meId, setMeId] = useState("");
  const [pinging, setPinging] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoKind = useRef<"shared" | "solo">("shared");

  const load = useCallback(async () => {
    try {
      const d = await api<{ match: View }>(`/api/meet/${id}`);
      setView(d.match);
    } catch {
      router.replace("/chats");
    }
  }, [id, router]);

  useEffect(() => {
    api<{ me: { id: string } }>("/api/me").then(({ me }) => setMeId(me.id)).catch(() => router.replace("/welcome"));
    load();
    const t = setInterval(load, 4000);
    return () => {
      clearInterval(t);
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [load, router]);

  const sendPing = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoErr("This phone doesn't share location — checkin needs it.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api(`/api/meet/${id}`, {
          method: "POST",
          body: JSON.stringify({ action: "ping", lat: pos.coords.latitude, lng: pos.coords.longitude }),
        }).then(load).catch(() => {});
      },
      () => setGeoErr("Location denied. Checkin only works with location on, app open."),
      { enableHighAccuracy: true, maximumAge: 10_000 },
    );
  }, [id, load]);

  const startCheckin = () => {
    setPinging(true);
    setGeoErr("");
    sendPing();
    pingTimer.current = setInterval(sendPing, 15_000); // foreground only — stops when you leave
  };
  const stopCheckin = () => {
    setPinging(false);
    if (pingTimer.current) clearInterval(pingTimer.current);
  };

  const demoArrive = async () => {
    const d = await api<{ match: View }>("/api/dev", { method: "POST", body: JSON.stringify({ matchId: id, op: "arrive" }) });
    setView(d.match);
  };

  const cancel = async () => {
    const d = await api<{ cancelled: string }>(`/api/meet/${id}`, { method: "POST", body: JSON.stringify({ action: "cancel" }) });
    alert(d.cancelled === "honest" ? "Cancelled with notice — no mark against you." : "Late cancel — this one counts like a no-show.");
    router.replace("/chats");
  };

  const vote = async (v: "well" | "not") => {
    const d = await api<{ match: View }>(`/api/meet/${id}`, { method: "POST", body: JSON.stringify({ action: "vote", vote: v }) });
    setView(d.match);
  };

  const pickPhoto = (kind: "shared" | "solo") => {
    photoKind.current = kind;
    fileRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const dataUrl = await downscale(file, 512);
    const d = await api<{ match: View }>(`/api/meet/${id}`, {
      method: "POST",
      body: JSON.stringify({ action: "photo", dataUrl, kind: photoKind.current }),
    });
    setView(d.match);
  };

  const toggleBlur = async (blurred: boolean) => {
    const d = await api<{ match: View }>(`/api/meet/${id}`, { method: "POST", body: JSON.stringify({ action: "blur", blurred }) });
    setView(d.match);
  };

  if (!view) return <main className="flex min-h-dvh items-center justify-center text-khaki">Brewing…</main>;

  const pct = Math.min(100, Math.round((view.checkin.accumMs / CHECKIN_REQUIRED_MS) * 100));
  const myPhoto = view.reveal.photos[meId];
  const partnerPhoto = view.partner ? view.reveal.photos[view.partner.id] : undefined;

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-5 pb-10 pt-8">
      <header className="flex items-center gap-3">
        <Link href="/chats" className="press text-xl text-khaki" aria-label="Back">←</Link>
        <div>
          <p className="serial">№ {view.serial} · THE MEETUP</p>
          <h1 className="font-display text-2xl font-bold">Coffee with {view.partner?.name}</h1>
        </div>
      </header>

      {view.slot && view.state === "meet_scheduled" && (
        <Token stamp="SCHEDULED" stampTone="honey" serial={view.serial}>
          <p className="font-display text-xl font-bold">{view.slot.label}</p>
          <p className="text-khaki">{view.slot.cafe}</p>
          {view.kind === "blind" && (
            <p className="mt-2 text-sm text-khaki">Still anonymous — look for someone checking this same app nervously ☕</p>
          )}
        </Token>
      )}

      {view.state === "meet_scheduled" && (
        <Token>
          <p className="font-display font-bold">Checkin</p>
          <p className="mb-3 text-sm text-khaki">
            Keep the app open at the cafe. Both phones within ~30m for 10 total minutes stamps it. Under 10? No harm done.
          </p>
          <div className="mb-1 h-2 rounded-full bg-bean2">
            <div className="h-full rounded-full bg-matcha transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="mb-3 font-mono text-xs text-khaki">
            {Math.floor(view.checkin.accumMs / 60000)}m {Math.floor((view.checkin.accumMs % 60000) / 1000)}s / 10m
            {view.checkin.partnerPinging && <span className="text-matcha"> · they're here 🟢</span>}
          </p>
          {geoErr && <p className="mb-2 text-sm text-spice">{geoErr}</p>}
          <div className="flex gap-2">
            {pinging ? (
              <Btn full variant="ghost" onClick={stopCheckin}>Pause checkin</Btn>
            ) : (
              <Btn full onClick={startCheckin}>I'm at the cafe</Btn>
            )}
            {view.partnerIsBot && pinging && (
              <Btn variant="ghost" onClick={demoArrive}>demo: they arrive</Btn>
            )}
          </div>
          <div className="mt-3 text-center">
            <button className="press text-sm text-khaki underline underline-offset-4" onClick={cancel}>
              Can't make it — cancel properly
            </button>
          </div>
        </Token>
      )}

      {view.state === "met" && (
        <>
          <Token stamp="MET ✓" stampTone="matcha" serial={view.serial}>
            <p className="font-display text-xl font-bold">It happened. An actual coffee.</p>
            <p className="text-sm text-khaki">Both phones agreed — 10+ minutes together. That's the whole point of this app.</p>
          </Token>

          {!view.reveal.myVote ? (
            <Token>
              <p className="font-display font-bold">So… how was it?</p>
              <p className="mb-3 text-sm text-khaki">Private answer. Shapes your future matches.</p>
              <div className="flex gap-3">
                <Btn full variant="spice" onClick={() => vote("well")}>Went well ✨</Btn>
                <Btn full variant="ghost" onClick={() => vote("not")}>Not a match</Btn>
              </div>
            </Token>
          ) : view.reveal.outcome === null ? (
            <Token><Chip tone="honey">Answered — waiting for them</Chip></Token>
          ) : view.reveal.outcome === "match" ? (
            <Token stamp="IT'S A MATCH" stampTone="spice">
              <p className="mb-2 text-sm text-khaki">
                Both of you said it went well. Take one selfie <span className="text-crema">together</span> — uploading it reveals you to each other in one shot.
              </p>
              {!myPhoto && <Btn full variant="spice" onClick={() => pickPhoto("shared")}>Take the reveal selfie 📸</Btn>}
            </Token>
          ) : (
            <Token stamp="NOT A MATCH" stampTone="khaki">
              <p className="mb-2 text-sm text-khaki">
                All good — an honest coffee beats a fake spark. Add a solo pic if you like; no cooperation needed.
              </p>
              {!myPhoto && <Btn full variant="ghost" onClick={() => pickPhoto("solo")}>Add a solo pic</Btn>}
            </Token>
          )}

          {(myPhoto || partnerPhoto) && (
            <Token>
              <p className="mb-3 font-display font-bold">The reveal</p>
              <div className="flex gap-3">
                {myPhoto?.dataUrl && (
                  <figure className="flex-1">
                    <img
                      src={myPhoto.dataUrl}
                      alt="Your photo"
                      className="aspect-square w-full rounded-xl object-cover"
                      style={myPhoto.blurred ? { filter: "blur(14px)" } : undefined}
                    />
                    <figcaption className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-khaki">You</span>
                      <Btn small variant="ghost" onClick={() => toggleBlur(!myPhoto.blurred)}>
                        {myPhoto.blurred ? "Unblur my face" : "Blur my face"}
                      </Btn>
                    </figcaption>
                  </figure>
                )}
                {partnerPhoto && (
                  <figure className="flex-1">
                    {partnerPhoto.dataUrl ? (
                      <img src={partnerPhoto.dataUrl} alt="Their photo" className="aspect-square w-full rounded-xl object-cover" />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-bean2 text-4xl">🌫️</div>
                    )}
                    <figcaption className="mt-2 text-xs text-khaki">
                      {view.partner?.name} {partnerPhoto.dataUrl ? "" : "(keeping it blurred — their call)"}
                    </figcaption>
                  </figure>
                )}
              </div>
              <p className="mt-3 text-xs text-khaki">
                Blur is yours alone to control, reversible anytime, applied at view-time — never burned into the file.
              </p>
            </Token>
          )}
        </>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
    </main>
  );
}

async function downscale(file: File, max: number): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}
