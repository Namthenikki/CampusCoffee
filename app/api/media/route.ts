import { json, requireVerified } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  MAX_PHOTOS, MAX_PHOTO_BYTES, MAX_REEL_BYTES, MAX_REEL_MS,
  deleteObjects, photosComplete, signedReadUrl, signedUploadUrl, storageKey,
  type MediaKind,
} from "@/lib/media";

// GET    — this student's media, with short-lived view URLs
// POST   — ask for an upload URL, then record the object once uploaded
// PATCH  — reorder / choose the main photo
// DELETE — remove one item

export async function GET() {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;

  const { data } = await supabaseAdmin()
    .from("profile_media")
    .select("*")
    .eq("user_id", gate.me.id)
    .order("position", { ascending: true });

  const media = await Promise.all(
    (data ?? []).map(async (m) => ({
      id: m.id,
      kind: m.kind,
      position: m.position,
      hasFace: m.has_face,
      durationMs: m.duration_ms,
      url: await signedReadUrl(m.storage_key as string),
    })),
  );

  return json({ media, complete: photosComplete(data ?? []) });
}

export async function POST(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const me = gate.me;
  const body = await req.json().catch(() => ({}));

  // Phase 1 — hand back a signed URL so the file goes straight to storage.
  if (body.step === "sign") {
    const kind = body.kind as MediaKind;
    if (!["photo", "reel", "selfie"].includes(kind)) {
      return json({ error: "Unknown media kind" }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin()
      .from("profile_media")
      .select("id, kind")
      .eq("user_id", me.id);

    if (kind === "photo" && (existing ?? []).filter((m) => m.kind === "photo").length >= MAX_PHOTOS) {
      return json({ error: `That's the limit of ${MAX_PHOTOS} photos` }, { status: 400 });
    }

    const ext = String(body.ext ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
    const key = storageKey(me.id, kind, ext);
    const signed = await signedUploadUrl(key);
    return json({ key, ...signed });
  }

  // Phase 2 — the upload finished; record it.
  if (body.step === "record") {
    const kind = body.kind as MediaKind;
    const bytes = Number(body.bytes) || 0;
    const durationMs = Number(body.durationMs) || null;

    const cap = kind === "reel" ? MAX_REEL_BYTES : MAX_PHOTO_BYTES;
    if (bytes > cap) {
      await deleteObjects([String(body.key)]);
      return json({ error: "That file is too large" }, { status: 400 });
    }
    if (kind === "reel" && durationMs && durationMs > MAX_REEL_MS + 500) {
      await deleteObjects([String(body.key)]);
      return json({ error: "Reels can be at most 30 seconds" }, { status: 400 });
    }

    // One reel and one selfie each — replace rather than accumulate.
    if (kind === "reel" || kind === "selfie") {
      const { data: old } = await supabaseAdmin()
        .from("profile_media")
        .select("id, storage_key")
        .eq("user_id", me.id)
        .eq("kind", kind);
      if (old?.length) {
        await deleteObjects(old.map((o) => o.storage_key as string));
        await supabaseAdmin().from("profile_media").delete().eq("user_id", me.id).eq("kind", kind);
      }
    }

    const { data: photos } = await supabaseAdmin()
      .from("profile_media")
      .select("id")
      .eq("user_id", me.id)
      .eq("kind", "photo");

    const { error } = await supabaseAdmin().from("profile_media").insert({
      user_id: me.id,
      kind,
      storage_key: String(body.key),
      position: kind === "photo" ? (photos?.length ?? 0) : 0,
      // Trusted only as a hint for the UI; the server-side face match is what
      // actually decides whether these photos are of this student.
      has_face: !!body.hasFace,
      width: Number(body.width) || null,
      height: Number(body.height) || null,
      duration_ms: durationMs,
      bytes,
    });
    if (error) return json({ error: error.message }, { status: 400 });
    return json({ ok: true });
  }

  return json({ error: "Unknown step" }, { status: 400 });
}

// Reorder photos. The first entry is the main photo.
export async function PATCH(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const { order } = await req.json().catch(() => ({}));
  if (!Array.isArray(order)) return json({ error: "Send an order array" }, { status: 400 });

  await Promise.all(
    order.map((id: string, i: number) =>
      supabaseAdmin()
        .from("profile_media")
        .update({ position: i })
        .eq("id", id)
        .eq("user_id", gate.me.id), // scoped, so nobody can reorder someone else's grid
    ),
  );
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await requireVerified();
  if ("deny" in gate) return gate.deny;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return json({ error: "Which item?" }, { status: 400 });

  const { data: row } = await supabaseAdmin()
    .from("profile_media")
    .select("storage_key")
    .eq("id", id)
    .eq("user_id", gate.me.id)
    .maybeSingle();
  if (!row) return json({ error: "Not found" }, { status: 404 });

  await deleteObjects([row.storage_key as string]);
  await supabaseAdmin().from("profile_media").delete().eq("id", id).eq("user_id", gate.me.id);
  return json({ ok: true });
}
