import "server-only";
import { supabaseAdmin } from "./supabase/admin";

// Media limits. Enforced here as well as in the UI, because the API is
// reachable without the form.
export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 3;
export const MAX_REEL_MS = 30_000;
export const MAX_PHOTO_BYTES = 1_500_000; // ~1.5 MB after client-side downscaling
export const MAX_REEL_BYTES = 12_000_000; // ~12 MB for 30 seconds
export const BUCKET = "media";

export type MediaKind = "photo" | "reel" | "selfie";

/**
 * Where the bytes live.
 *
 * Supabase Storage is the default because it needs no extra account, but its
 * free tier allows only 5 GB of egress a month — and a photo-heavy feed spends
 * egress far faster than storage. Cloudflare R2 charges nothing for egress, so
 * this indirection exists to make that swap a config change rather than a
 * rewrite. Everything above this line deals in opaque keys.
 */
export function storageKey(userId: string, kind: MediaKind, ext: string): string {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${userId}/${kind}-${stamp}-${rand}.${ext}`;
}

/** Short-lived upload URL so bytes go straight to storage, never through us. */
export async function signedUploadUrl(key: string) {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(key);
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Short-lived read URL. Deliberately never public: a blind-coffee partner must
 * not be able to pull a face out of the bucket before the reveal, and a public
 * URL would outlive any check we do here.
 */
export async function signedReadUrl(key: string, seconds = 3600): Promise<string | null> {
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(key, seconds);
  return data?.signedUrl ?? null;
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  await supabaseAdmin().storage.from(BUCKET).remove(keys);
}

/**
 * Has this student met the photo requirements?
 *
 * Three photos minimum, at least one of which shows a face — a grid of
 * landscapes tells a match nothing about who they're meeting.
 */
export function photosComplete(media: { kind: MediaKind; has_face: boolean }[]): {
  ok: boolean;
  reason?: string;
} {
  const photos = media.filter((m) => m.kind === "photo");
  if (photos.length < MIN_PHOTOS) {
    return { ok: false, reason: `Add at least ${MIN_PHOTOS} photos` };
  }
  if (!photos.some((p) => p.has_face)) {
    return { ok: false, reason: "At least one photo needs to show your face" };
  }
  if (!media.some((m) => m.kind === "selfie")) {
    return { ok: false, reason: "Take a selfie so we can check the photos are you" };
  }
  return { ok: true };
}
