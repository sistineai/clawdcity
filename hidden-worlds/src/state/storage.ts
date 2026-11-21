// All persistence goes through here (CLAUDE.md rule 7): try/catch on every access, Zod
// validation on load, migrations, a backup of anything unreadable, and an in-memory fallback
// when storage is blocked (private modes, embedded web views).
import { HISTORY_KEEP_DAYS, STORAGE_BACKUP_KEY, STORAGE_KEY } from '../config';
import { getSync } from '../adapters';
import { addDays } from '../game/dates';
import { migrate } from './migrations';
import { freshDoc, SaveDoc } from './schema';

const memory = new Map<string, string>();
let usingMemory = false;

function read(key: string): string | null {
  if (!usingMemory) {
    try {
      return localStorage.getItem(key);
    } catch {
      usingMemory = true;
    }
  }
  return memory.get(key) ?? null;
}
function write(key: string, value: string): void {
  if (!usingMemory) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      usingMemory = true;
    }
  }
  memory.set(key, value);
}
function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
  memory.delete(key);
}

export function newDeviceId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    // fall through
  }
  const h = () =>
    Math.floor(Math.random() * 0x10000)
      .toString(16)
      .padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${h()}-${h()}${h()}${h()}`;
}

export interface LoadResult {
  doc: SaveDoc;
  first: boolean;
  recovered: boolean;
}

/** Parse a stored value; null means "unusable" (the caller backs it up and starts fresh). */
export function parseDoc(raw: string): SaveDoc | null {
  try {
    const r = SaveDoc.safeParse(migrate(JSON.parse(raw)));
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

export function loadDoc(nowMs: number): LoadResult {
  const raw = read(STORAGE_KEY);
  if (raw === null) return { doc: freshDoc(nowMs, newDeviceId()), first: true, recovered: false };
  const doc = parseDoc(raw);
  if (doc) return { doc, first: false, recovered: false };
  write(STORAGE_BACKUP_KEY, raw);
  return { doc: freshDoc(nowMs, newDeviceId()), first: true, recovered: true };
}

export function saveDoc(doc: SaveDoc): void {
  try {
    write(STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // serialisation cannot realistically fail; never let saving crash play
  }
  try {
    void getSync().push(doc);
  } catch {
    // sync is best-effort
  }
}

export function clearDoc(): void {
  remove(STORAGE_KEY);
}

/** META-6: keep daily history for the most recent 60 days. */
export function pruneDoc(doc: SaveDoc, today: string): SaveDoc {
  const cutoff = addDays(today, -HISTORY_KEEP_DAYS);
  const daily = Object.fromEntries(Object.entries(doc.daily).filter(([k]) => k > cutoff));
  const active = Object.fromEntries(
    Object.entries(doc.active).filter(([k]) => !k.startsWith('daily:') || k.slice(6) > cutoff),
  );
  return { ...doc, daily, active };
}

export const storageIsMemory = () => usingMemory;
