"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, Btn } from "@/components/ui";
import { compressImage, reelDuration, uploadMedia } from "@/lib/upload";
import { matchSelfie } from "@/lib/face";

type Item = { id: string; kind: "photo" | "reel" | "selfie"; position: number; hasFace: boolean; durationMs: number | null; url: string | null };
type Media = { media: Item[]; complete: { ok: boolean; reason?: string } };

export default function Photos() {
  const router = useRouter();
  const [m, setM] = useState<Media | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [face, setFace] = useState<"idle" | "checking" | "matched" | "mismatch">("idle");
  const photoInput = useRef<HTMLInputElement>(null);
  const reelInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const data = await api<Media>("/api/media").catch(() => null);
    if (!data) { router.replace("/welcome"); return; }
    setM(data);
  }, [router]);
  useEffect(() => { load(); }, [load]);

  const photos = m?.media.filter((x) => x.kind === "photo") ?? [];
  const reel = m?.media.find((x) => x.kind === "reel");
  const selfie = m?.media.find((x) => x.kind === "selfie");

  const addPhoto = async (file: File) => {
    setErr(""); setBusy("photo");
    try {
      const { blob, width, height } = await compressImage(file);
      await uploadMedia("photo", blob, { width, height, hasFace: true });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(null);
  };

  const addReel = async (file: File) => {
    setErr(""); setBusy("reel");
    try {
      const durationMs = await reelDuration(file);
      if (durationMs > 30_500) throw new Error("Reels can be at most 30 seconds");
      if (file.size > 15_000_000) throw new Error("That video's too big — keep it short");
      await uploadMedia("reel", file, { durationMs });
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(null);
  };

  const remove = async (id: string) => {
    setBusy(id);
    await api(`/api/media?id=${id}`, { method: "DELETE" }).catch(() => {});
    await load();
    setBusy(null);
  };

  // Move a photo to the front — that's the main photo.
  const makeMain = async (id: string) => {
    const order = [id, ...photos.filter((p) => p.id !== id).map((p) => p.id)];
    setM((prev) => prev && { ...prev, media: order.map((oid, i) => ({ ...prev.media.find((x) => x.id === oid)! , position: i })).concat(prev.media.filter((x) => x.kind !== "photo")) });
    await api("/api/media", { method: "PATCH", body: JSON.stringify({ order }) });
    await load();
  };

  // Once there's a selfie and photos, compare them in the browser. A match keeps
  // the selfie private; a mismatch will show it to others, and they can retake.
  const runFaceCheck = useCallback(async () => {
    const sel = m?.media.find((x) => x.kind === "selfie");
    const pics = (m?.media.filter((x) => x.kind === "photo") ?? []).map((p) => p.url).filter(Boolean) as string[];
    if (!sel?.url || pics.length === 0) return;
    setFace("checking");
    const res = await matchSelfie(sel.url, pics);
    await api("/api/media", { method: "POST", body: JSON.stringify({ step: "faceresult", matched: res.matched, score: res.score }) }).catch(() => {});
    setFace(res.matched ? "matched" : "mismatch");
  }, [m]);

  const selfieId = m?.media.find((x) => x.kind === "selfie")?.id;
  const photoCount = m?.media.filter((x) => x.kind === "photo").length ?? 0;
  useEffect(() => {
    if (selfieId && photoCount > 0 && face === "idle") runFaceCheck();
  }, [selfieId, photoCount, face, runFaceCheck]);

  const done = async () => {
    await load();
    router.replace("/");
  };

  if (!m) return <main className="flex min-h-dvh items-center justify-center"><p className="serial">LOADING…</p></main>;

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-5 py-8 pb-28">
      <div>
        <p className="serial">LAST STEP</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">Your photos</h1>
        <p className="mt-2 text-sm leading-relaxed text-khaki">
          At least 3 photos, one showing your face. Tap a photo to make it your main one.
        </p>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {photos.map((p, i) => (
          <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-bean2">
            {p.url && <img src={p.url} alt="" className="h-full w-full object-cover" onClick={() => i !== 0 && makeMain(p.id)} />}
            {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-md bg-honey px-1.5 py-0.5 font-mono text-[9px] font-bold text-cream">MAIN</span>}
            <button
              onClick={() => remove(p.id)}
              disabled={busy === p.id}
              className="press absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-roast/80 text-crema"
              aria-label="Remove photo"
            >×</button>
          </div>
        ))}
        {photos.length < 5 && (
          <button
            onClick={() => photoInput.current?.click()}
            disabled={!!busy}
            className="press flex aspect-[3/4] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-khaki"
          >
            <span className="text-2xl">{busy === "photo" ? "…" : "+"}</span>
            <span className="text-[11px]">Add photo</span>
          </button>
        )}
      </div>
      <p className="-mt-3 font-mono text-[11px] text-sediment">{photos.length}/5 photos</p>

      {/* Reel */}
      <div>
        <p className="mb-2 text-sm font-semibold text-crema">Reel <span className="font-normal text-sediment">· optional, up to 30s</span></p>
        {reel ? (
          <div className="relative aspect-video overflow-hidden rounded-xl border border-line bg-bean2">
            {reel.url && <video src={reel.url} className="h-full w-full object-cover" controls playsInline muted />}
            <button onClick={() => remove(reel.id)} className="press absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-roast/80 text-crema" aria-label="Remove reel">×</button>
          </div>
        ) : (
          <button onClick={() => reelInput.current?.click()} disabled={!!busy} className="press flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-khaki">
            <span>🎬</span>{busy === "reel" ? "Uploading…" : "Add a 30-second reel"}
          </button>
        )}
      </div>

      {/* Selfie */}
      <div>
        <p className="mb-2 text-sm font-semibold text-crema">Selfie <span className="font-normal text-sediment">· so others know it's really you</span></p>
        {selfie ? (
          <div className={`flex items-center gap-3 rounded-xl border p-3 ${
            face === "matched" ? "border-matcha/40 bg-matcha/10"
            : face === "mismatch" ? "border-spice/40 bg-spice/10"
            : "border-line bg-bean2"
          }`}>
            {selfie.url && <img src={selfie.url} alt="" className="h-16 w-16 rounded-lg object-cover" />}
            <div className="flex-1">
              {face === "checking" && <p className="text-sm font-semibold text-khaki">Checking it&apos;s you…</p>}
              {face === "matched" && (
                <>
                  <p className="text-sm font-semibold text-matcha-pastel">Matched ✓ — it&apos;s you</p>
                  <p className="text-xs text-sediment">Your selfie stays private. Nobody else sees it.</p>
                </>
              )}
              {face === "mismatch" && (
                <>
                  <p className="text-sm font-semibold text-spice-pastel">We couldn&apos;t match this to your photos</p>
                  <p className="text-xs text-sediment">
                    Retake it, or keep it — if you keep it, others will see it so they know you&apos;re real.
                  </p>
                </>
              )}
              {face === "idle" && <p className="text-sm font-semibold text-crema">Selfie added</p>}
              <button onClick={() => { setFace("idle"); remove(selfie.id); }} className="press mt-1 text-xs text-butter underline underline-offset-2">
                Retake selfie
              </button>
            </div>
          </div>
        ) : (
          <SelfieCapture onDone={() => { setFace("idle"); load(); }} setErr={setErr} />
        )}
      </div>

      {err && <p className="text-sm text-spice-pastel">{err}</p>}

      <p className="rounded-xl border border-line bg-bean2/50 p-3 text-xs leading-relaxed text-sediment">
        By adding photos you confirm they're of you and you're happy to show them to other students.
        You can delete any of them, any time. We strip location data from every upload automatically.
      </p>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[430px] border-t border-line bg-roast/95 p-4 backdrop-blur">
        <Btn full onClick={done} disabled={!m.complete.ok}>
          {m.complete.ok ? "Into Campus Coffee ☕" : m.complete.reason}
        </Btn>
      </div>

      <input ref={photoInput} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addPhoto(f); }} />
      <input ref={reelInput} type="file" accept="video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) addReel(f); }} />
    </main>
  );
}

// Opens the front camera, captures one frame, uploads it as the selfie.
function SelfieCapture({ onDone, setErr }: { onDone: () => void; setErr: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setOpen(true);
      requestAnimationFrame(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); } });
    } catch {
      setErr("Couldn't open the camera. Allow camera access and try again.");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
  };

  const capture = async () => {
    const v = videoRef.current;
    if (!v) return;
    setBusy(true);
    const canvas = document.createElement("canvas");
    const size = Math.min(v.videoWidth, v.videoHeight);
    canvas.width = canvas.height = Math.min(720, size);
    const ctx = canvas.getContext("2d")!;
    // Mirror so the captured selfie matches what the student sees on screen.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    const sx = (v.videoWidth - size) / 2;
    const sy = (v.videoHeight - size) / 2;
    ctx.drawImage(v, sx, sy, size, size, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.85));
    stop();
    try {
      if (!blob) throw new Error("Capture failed");
      await uploadMedia("selfie", blob, { width: canvas.width, height: canvas.height });
      onDone();
    } catch (e) { setErr(e instanceof Error ? e.message : "Upload failed"); }
    setBusy(false);
  };

  if (!open) {
    return (
      <button onClick={start} className="press flex h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-khaki">
        <span>🤳</span> Take a selfie
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-bean2">
      <video ref={videoRef} className="aspect-square w-full -scale-x-100 object-cover" playsInline muted />
      <div className="flex gap-2 p-3">
        <Btn full variant="ghost" onClick={stop}>Cancel</Btn>
        <Btn full onClick={capture} disabled={busy}>{busy ? "Saving…" : "Capture"}</Btn>
      </div>
    </div>
  );
}
