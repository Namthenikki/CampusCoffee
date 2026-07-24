import "server-only";
import { AwsClient } from "aws4fetch";

// Media limits. Enforced here as well as in the UI, because the API is
// reachable without the form.
export const MAX_PHOTOS = 5;
export const MIN_PHOTOS = 3;
export const MAX_REEL_MS = 30_000;
export const MAX_PHOTO_BYTES = 1_500_000; // ~1.5 MB after client-side downscaling
export const MAX_REEL_BYTES = 15_000_000; // ~15 MB for 30 seconds
export type MediaKind = "photo" | "reel" | "selfie";

// ---- Cloudflare R2 (S3-compatible) ----
//
// Chosen over Supabase Storage for one reason: egress. Supabase's free tier
// bills 5 GB of downloads a month, and a photo feed spends egress far faster
// than it spends storage — a hundred students browsing profiles would exhaust
// it in days and photos would stop loading for everyone. R2 charges nothing for
// egress, ever, and gives 10 GB free.
//
// The bucket is PRIVATE. Bytes move over short-lived presigned URLs only, so a
// face can't be pulled out of storage by anyone we didn't hand a URL to — which
// matters because a public URL would outlive the checks that decide who may see
// a blind-coffee partner before the reveal.

const ACCOUNT = process.env.R2_ACCOUNT_ID ?? "";
const BUCKET = process.env.R2_BUCKET ?? "campus-media";
const ENDPOINT = `https://${ACCOUNT}.r2.cloudflarestorage.com`;

let client: AwsClient | null = null;
function r2(): AwsClient {
  if (!client) {
    client = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
      service: "s3",
      region: "auto",
    });
  }
  return client;
}

const objectUrl = (key: string) => `${ENDPOINT}/${BUCKET}/${key.split("/").map(encodeURIComponent).join("/")}`;

export function storageKey(userId: string, kind: MediaKind, ext: string): string {
  const stamp = Date.now().toString(36);
  const rand = crypto.randomUUID().slice(0, 8);
  return `${userId}/${kind}-${stamp}-${rand}.${ext}`;
}

/** A short-lived URL the browser PUTs straight to, so bytes never pass through us. */
export async function signedUploadUrl(key: string): Promise<string> {
  const signed = await r2().sign(new Request(`${objectUrl(key)}?X-Amz-Expires=600`, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/** A short-lived read URL. Never public — expiry is the point. */
export async function signedReadUrl(key: string, seconds = 3600): Promise<string | null> {
  const signed = await r2().sign(new Request(`${objectUrl(key)}?X-Amz-Expires=${seconds}`, { method: "GET" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

export async function deleteObjects(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => r2().fetch(objectUrl(k), { method: "DELETE" }).catch(() => {})));
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
