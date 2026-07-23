import { promises as fs } from "fs";
import path from "path";
import type { DB } from "./types";
import { seedDb } from "./seed";

// Local dev: JSON file store. Production (Vercel): swap this module's load/save
// for Neon Postgres — every consumer already goes through the async interface.
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __ccdb?: DB; __ccdirty?: boolean };

export async function getDb(): Promise<DB> {
  if (g.__ccdb) return g.__ccdb;
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    g.__ccdb = JSON.parse(raw) as DB;
  } catch {
    g.__ccdb = seedDb();
    await persist();
  }
  return g.__ccdb!;
}

export async function persist(): Promise<void> {
  if (!g.__ccdb) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(g.__ccdb), "utf8");
  await fs.rename(tmp, DB_PATH).catch(async () => {
    await fs.writeFile(DB_PATH, JSON.stringify(g.__ccdb), "utf8");
  });
}

export async function nextSerial(): Promise<string> {
  const db = await getDb();
  db.seq += 1;
  return `CC-${String(db.seq).padStart(4, "0")}`;
}

export function uid(): string {
  return crypto.randomUUID();
}
