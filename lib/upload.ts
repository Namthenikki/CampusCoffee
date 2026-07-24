"use client";

import { api } from "@/components/ui";
import type { MediaKind } from "@/lib/media";

// Client-side media handling. Two jobs: shrink files before they leave the
// phone (so uploads are fast and cheap), and strip metadata.
//
// Re-encoding a photo through a canvas drops all EXIF — including the GPS tags
// phones quietly attach. On a campus app that's a real safety win: a photo can
// never silently carry where it was taken.

// Whether this browser can encode WebP. Safari added it in 16; older ones fall
// back to JPEG. Computed once.
let webpOk: boolean | null = null;
function canWebp(): boolean {
  if (webpOk === null) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    webpOk = c.toDataURL("image/webp").startsWith("data:image/webp");
  }
  return webpOk;
}

/**
 * Instagram-style compression: cap the long edge at 1080px (their feed width)
 * and encode as WebP, which holds noticeably more detail than JPEG at the same
 * file size. A 6 MB phone photo lands around 150–250 KB with no visible loss.
 *
 * Re-encoding through the canvas also strips EXIF — the GPS tags phones attach
 * never ride along.
 */
export async function compressImage(
  file: File,
  maxDim = 1080,
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
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const type = canWebp() ? "image/webp" : "image/jpeg";
  let quality = 0.9;
  let blob: Blob | null = null;
  // WebP holds quality far better as you drop the number, so it rarely needs
  // more than the first pass — the loop is just a size guardrail.
  for (let i = 0; i < 6; i++) {
    blob = await new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), type, quality));
    if (blob && blob.size <= 1_200_000) break;
    quality -= 0.1;
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
