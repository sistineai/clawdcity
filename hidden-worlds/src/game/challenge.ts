// SHARE-4: a challenge link carries the puzzle date and the sender's time, misses and hints
// in one compact, validated query parameter: c=<day>.<time>.<misses>.<hints>.<check>, base 36.
import { CHALLENGE } from '../config';
import type { ChallengeData } from '../state/schema';
import { dayNumber, isDateKey, keyFromDayNumber } from './dates';
import { xmur3 } from '../engine/logic/rng';

const EPOCH = dayNumber('2026-01-01');
const check = (s: string) => (xmur3('hw-challenge:' + s)() % 1296).toString(36).padStart(2, '0');

export function encodeChallenge(c: ChallengeData): string {
  const body = [dayNumber(c.date) - EPOCH, c.timeS, c.misses, c.hints].map((n) => n.toString(36)).join('.');
  return `${body}.${check(body)}`;
}

/** Returns null for anything malformed, tampered or out of range. */
export function decodeChallenge(raw: string | null | undefined): ChallengeData | null {
  if (!raw || raw.length > 40 || !/^[0-9a-z]+(\.[0-9a-z]+){4}$/.test(raw)) return null;
  const parts = raw.split('.');
  const body = parts.slice(0, 4).join('.');
  if (parts[4] !== check(body)) return null;
  const [d, t, m, h] = parts.slice(0, 4).map((p) => parseInt(p, 36)) as [number, number, number, number];
  if (![d, t, m, h].every((n) => Number.isSafeInteger(n) && n >= 0)) return null;
  if (t < 1 || t > CHALLENGE.maxTimeS || m > CHALLENGE.maxMisses || h > CHALLENGE.maxHints || d > 36500)
    return null;
  const date = keyFromDayNumber(EPOCH + d);
  if (!isDateKey(date)) return null;
  return { date, timeS: t, misses: m, hints: h };
}

export function challengeUrl(base: string, c: ChallengeData): string {
  return `${base}?c=${encodeChallenge(c)}`;
}
