// Local-date keys and daily puzzle numbering (DAILY-1..4). Keys are YYYY-MM-DD in the device's
// local time; arithmetic on keys is done in UTC so daylight-saving changes never skew a day.
import { LAUNCH_DATE, WEEKDAY_DIFFICULTY, WORLD_ORDER, type WorldId } from '../config';

const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function todayKey(nowMs: number): string {
  return dateKey(new Date(nowMs));
}
export function isDateKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}
/** Days since 1970-01-01 for a key, independent of timezone. */
export function dayNumber(key: string): number {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}
export function keyFromDayNumber(n: number): string {
  const t = new Date(n * 86400000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}
export function addDays(key: string, days: number): string {
  return keyFromDayNumber(dayNumber(key) + days);
}
export function daysBetween(a: string, b: string): number {
  return dayNumber(b) - dayNumber(a);
}
/** 0 = Sunday. */
export function weekday(key: string): number {
  return (((dayNumber(key) + 4) % 7) + 7) % 7;
}

/** Puzzle number: days from LAUNCH_DATE plus one; null before launch ("Preview"). */
export function puzzleNumber(key: string, launch = LAUNCH_DATE): number | null {
  const n = daysBetween(launch, key) + 1;
  return n >= 1 ? n : null;
}
export function dailyDifficulty(key: string): number {
  return WEEKDAY_DIFFICULTY[weekday(key)]!;
}
/** Rotate through every world by puzzle number, the same for everyone (DAILY-4). */
export function dailyWorld(key: string, launch = LAUNCH_DATE): WorldId {
  const idx = daysBetween(launch, key);
  const n = WORLD_ORDER.length;
  return WORLD_ORDER[((idx % n) + n) % n]!;
}
export const dailySeed = (key: string) => `daily-${key}`;

/** Milliseconds until the next local midnight. */
export function msUntilTomorrow(nowMs: number): number {
  const d = new Date(nowMs);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return next.getTime() - nowMs;
}
export function formatCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
export function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
