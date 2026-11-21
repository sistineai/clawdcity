// META-1: streak rules, as pure functions over date keys.
import { addDays } from './dates';

export interface Streak {
  current: number;
  best: number;
  /** Date key of the latest on-time daily completion. */
  last: string | null;
}

/**
 * Completing a daily on time for `date`. Normally `date` is today, after `last`. A puzzle started
 * yesterday can be finished after today's (DAILY-7), so `date` may be before `last`: then it can
 * only join the current run at its start, and `doneOnTime` lets the run grow further back through
 * days already completed.
 */
export function extendStreak(
  s: Streak,
  date: string,
  doneOnTime: (key: string) => boolean = () => false,
): Streak {
  if (s.last === date) return s;
  if (s.last && date < s.last) {
    const runStart = addDays(s.last, -(s.current - 1));
    if (date !== addDays(runStart, -1)) return s;
    let current = s.current + 1;
    let k = addDays(date, -1);
    while (doneOnTime(k)) {
      current++;
      k = addDays(k, -1);
    }
    return { current, best: Math.max(s.best, current), last: s.last };
  }
  let current = s.last === addDays(date, -1) ? s.current + 1 : 1;
  // a run can also be bridged by an earlier day finished out of order
  if (current === 1) {
    let k = addDays(date, -1);
    while (doneOnTime(k)) {
      current++;
      k = addDays(k, -1);
    }
  }
  return { current, best: Math.max(s.best, current), last: date };
}

/** What to show on open: a streak whose last completion is older than yesterday is 0. */
export function displayedStreak(s: Streak, today: string): number {
  if (!s.last) return 0;
  return s.last === today || s.last === addDays(today, -1) ? s.current : 0;
}
