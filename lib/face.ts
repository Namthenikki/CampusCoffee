"use client";

// Face matching, entirely in the browser. The face model and every face
// descriptor stay on the student's device — only a yes/no and a score reach the
// server, so no biometric template is ever stored or transmitted.
//
// The model is ~6 MB and loaded on demand, so it only downloads when someone
// actually reaches the photo-verification step. Everything here fails safe: if
// the model can't load or a face can't be read, we report "no match" and the
// selfie simply becomes visible to others — never a hard block on finishing.

type FaceApi = typeof import("@vladmandic/face-api");
const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

// Euclidean distance between descriptors: lower is more similar. 0.6 is the
// library's default cutoff; 0.55 is a touch stricter, and a miss only costs a
// public selfie, not a locked account.
const MATCH_THRESHOLD = 0.55;

let api: FaceApi | null = null;
let ready: Promise<FaceApi> | null = null;

async function load(): Promise<FaceApi> {
  if (api) return api;
  if (!ready) {
    ready = (async () => {
      const faceapi = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      api = faceapi;
      return faceapi;
    })();
  }
  return ready;
}

async function bitmapFrom(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetch(url);
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

async function descriptor(faceapi: FaceApi, url: string): Promise<Float32Array | null> {
  const bmp = await bitmapFrom(url);
  if (!bmp) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0);
  bmp.close();
  const found = await faceapi
    .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
  return found?.descriptor ?? null;
}

export type MatchResult = { matched: boolean; score: number | null; selfieHasFace: boolean };

/** Compare the selfie against each photo; a match against any one is enough. */
export async function matchSelfie(selfieUrl: string, photoUrls: string[]): Promise<MatchResult> {
  try {
    const faceapi = await load();
    const selfie = await descriptor(faceapi, selfieUrl);
    if (!selfie) return { matched: false, score: null, selfieHasFace: false };

    let best = Infinity;
    for (const url of photoUrls) {
      const d = await descriptor(faceapi, url);
      if (d) best = Math.min(best, faceapi.euclideanDistance(selfie, d));
    }
    if (best === Infinity) return { matched: false, score: null, selfieHasFace: true };
    return {
      matched: best <= MATCH_THRESHOLD,
      score: Math.max(0, Math.round((1 - best) * 100)) / 100,
      selfieHasFace: true,
    };
  } catch {
    // Model/network trouble — don't trap the student. Treat as "unconfirmed",
    // which just makes the selfie public.
    return { matched: false, score: null, selfieHasFace: true };
  }
}
