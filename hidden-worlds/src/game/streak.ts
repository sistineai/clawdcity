// META-1: streak rules, as pure functions over date keys.
import { addDays } from './dates';

export interface Streak {
  current: number;
  best: number;
  /** Date key of the last on-time daily completion. */
  last: string | null;
}

/** Completing today's daily on its own date. */
export function extendStreak(s: Streak, date: string): Streak {
  if (s.last === date) return s;
  const current = s.last === addDays(date, -1) ? s.current + 1 : 1;
  return { current, best: Math.max(s.best, current), last: date };
}

/** What to show on open: a streak whose last completion is older than yesterday is 0. */
export function displayedStreak(s: Streak, today: string): number {
  if (!s.last) return 0;
  return s.last === today || s.last === addDays(today, -1) ? s.current : 0;
}
