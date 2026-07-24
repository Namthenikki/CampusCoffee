import "server-only";
import { AwsClient } from "aws4fetch";
import { supabaseAdmin } from "./supabase/admin";

// Media limits. Enforced here as well as in the UI, because the API is
// reachable without the form.
export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 3;
export const MAX_REEL_MS = 30_000;
export const MAX_PHOTO_BYTES = 1_500_000; // ~1.5 MB after client-side downscaling
export const MAX_REEL_BYTES = 15_000_000; // ~15 MB for 30 seconds
export const BUCKET = "media";
export type MediaKind = "photo" | "reel" | "selfie";

// ---- Storage backend ----
//
// Two backends behind one interface. Supabase Storage is the default because it
// needs no card and its access control lives with the rest of the data. Its
// only weakness is egress — the free tier bills 5 GB of downloads a month, and
// a photo feed spends egress faster than storage. Cloudflare R2 charges nothing
// for egress, so the moment R2 credentials are present we use it instead.
//
// Either way the bucket is PRIVATE and reads are short-lived signed URLs, so a
// face can't be pulled from storage before a blind match reveals — a public URL
// would outlive that check.

const R2_ON = !!process.env.R2_ACCOUNT_ID && !!process.env.R2_ACCESS_KEY_ID;
const R2_BUCKET = process.env.R2_BUCKET ?? "campus-media";
const R2_ENDPOINT = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

let r2client: AwsClient | null = null;
function r2(): AwsClient {
  if (!r2client) {
    r2client = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      service: "s3",
      region: "auto",
    });
  }
  return r2client;
}
const r2Url = (key: string) => `${R2_ENDPOINT}/${R2_BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

export function storageKey(userId: string, kind: MediaKind, ext: string): string {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${userId}/${kind}-${stamp}-${rand}.${ext}`;
}

/** A short-lived URL the browser PUTs straight to, so bytes never pass through us. */
export async function signedUploadUrl(key: string): Promise<{ url: string; method: "PUT" | "POST"; fields?: Record<string, string> }> {
  if (R2_ON) {
    const signed = await r2().sign(new Request(`${r2Url(key)}?X-Amz-Expires=600`, { method: "PUT" }), {
      aws: { signQuery: true },
    });
    return { url: signed.url, method: "PUT" };
  }
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(key);
  if (error) throw new Error(error.message);
  return { url: data.signedUrl, method: "PUT" };
}

/** A short-lived read URL. Never public — expiry is the point. */
export async function signedReadUrl(key: string, seconds = 3600): Promise<string | null> {
  if (R2_ON) {
    const signed = await r2().sign(new Request(`${r2Url(key)}?X-Amz-Expires=${seconds}`, { method: "GET" }), {
      aws: { signQuery: true },
    });
    return signed.url;
  }
  const { data } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(key, seconds);
  return data?.signedUrl ?? null;
}

export async function deleteObjects(keys: string[]): Promise<void> {
  if (!keys.length) return;
  if (R2_ON) {
    await Promise.all(keys.map((k) => r2().fetch(r2Url(k), { method: "DELETE" }).catch(() => {})));
    return;
  }
  await supabaseAdmin().storage.from(BUCKET).remove(keys);
}

/**
 * Has this student met the photo requirements? Three photos minimum, at least
 * one showing a face, plus a selfie — a grid of landscapes tells a match
 * nothing about who they're meeting.
 */
export function photosComplete(media: { kind: MediaKind; has_face: boolean }[]): {
  ok: boolean;
  reason?: string;
} {
  const photos = media.filter((m) => m.kind === "photo");
  if (photos.length < MIN_PHOTOS) return { ok: false, reason: `Add at least ${MIN_PHOTOS} photos` };
  if (!photos.some((p) => p.has_face)) return { ok: false, reason: "At least one photo needs to show your face" };
  if (!media.some((m) => m.kind === "selfie")) return { ok: false, reason: "Add a selfie so others know it's really you" };
  return { ok: true };
}
