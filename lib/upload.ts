"use client";

import { api } from "@/components/ui";
import type { MediaKind } from "@/lib/media";

// Client-side media handling. Two jobs: shrink files before they leave the
// phone (so uploads are fast and cheap), and strip metadata.
//
// Re-encoding a photo through a canvas drops all EXIF — including the GPS tags
// phones quietly attach. On a campus app that's a real safety win: a photo can
// never silently carry where it was taken.

export async function compressImage(
  file: File,
  maxDim = 1440,
): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("That file isn't an image we can read");
  });
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  let quality = 0.85;
  let blob: Blob | null = null;
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), "image/jpeg", quality));
    if (blob && blob.size <= 1_450_000) break;
    quality -= 0.12;
  }
  if (!blob) throw new Error("Couldn't process that photo");
  return { blob, width, height };
}

/** Read a video's duration without uploading it, so we can reject long reels early. */
export function reelDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(v.duration * 1000));
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That video couldn't be read"));
    };
    v.src = url;
  });
}

/** Sign → PUT straight to R2 → record. The bytes never touch our server. */
export async function uploadMedia(
  kind: MediaKind,
  blob: Blob,
  meta: { width?: number; height?: number; durationMs?: number; hasFace?: boolean },
): Promise<void> {
  const ext = kind === "reel" ? "mp4" : "jpg";
  const { url, key, method } = await api<{ url: string; key: string; method: "PUT" | "POST" }>("/api/media", {
    method: "POST",
    body: JSON.stringify({ step: "sign", kind, ext }),
  });

  const put = await fetch(url, { method: method ?? "PUT", body: blob, headers: { "content-type": blob.type } });
  if (!put.ok) throw new Error("Upload failed — check your connection and try again");

  await api("/api/media", {
    method: "POST",
    body: JSON.stringify({ step: "record", kind, key, bytes: blob.size, ...meta }),
  });
}
