import { describe, expect, it } from 'vitest';
import {
  addDays,
  dailyDifficulty,
  dailySeed,
  dailyWorld,
  dateKey,
  daysBetween,
  isDateKey,
  msUntilTomorrow,
  puzzleNumber,
  todayKey,
  weekday,
} from '../../src/game/dates';
import { dailyAccess } from '../../src/game/gates';
import { exploreDifficulty, parseRefKey, refKey, seedFor } from '../../src/game/puzzles';

describe('date keys (DAILY-1)', () => {
  it('uses the local date', () => {
    expect(process.env.TZ).toBe('America/New_York');
    // 03:30 UTC on Jan 1 is still Dec 31 in New York
    expect(todayKey(Date.UTC(2027, 0, 1, 3, 30))).toBe('2026-12-31');
    expect(dateKey(new Date(2026, 1, 28, 23, 59))).toBe('2026-02-28');
    expect(dailySeed('2026-12-03')).toBe('daily-2026-12-03');
  });
  it('handles month ends and leap days', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(isDateKey('2027-02-29')).toBe(false);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-13-01')).toBe(false);
  });
  it('is not skewed by daylight-saving changes', () => {
    // US DST: 2027-03-14 (spring forward) and 2027-11-07 (fall back)
    expect(daysBetween('2027-03-13', '2027-03-15')).toBe(2);
    expect(daysBetween('2027-11-06', '2027-11-08')).toBe(2);
    expect(todayKey(new Date(2027, 2, 14, 3, 30).getTime())).toBe('2027-03-14');
    expect(todayKey(new Date(2027, 10, 7, 1, 30).getTime())).toBe('2027-11-07');
    // the day after a 23-hour day is still one day later
    expect(addDays('2027-03-14', 1)).toBe('2027-03-15');
    expect(msUntilTomorrow(new Date(2027, 2, 13, 12, 0).getTime())).toBe(12 * 3600 * 1000);
    expect(msUntilTomorrow(new Date(2027, 2, 14, 0, 0).getTime())).toBe(23 * 3600 * 1000);
    expect(msUntilTomorrow(new Date(2027, 10, 7, 0, 0).getTime())).toBe(25 * 3600 * 1000);
  });
});

describe('puzzle numbers (DAILY-2)', () => {
  it('counts from the launch date, Preview before it', () => {
    expect(puzzleNumber('2026-12-01')).toBe(1);
    expect(puzzleNumber('2026-12-31')).toBe(31);
    expect(puzzleNumber('2027-01-01')).toBe(32);
    expect(puzzleNumber('2027-03-01')).toBe(91);
    expect(puzzleNumber('2026-11-30')).toBeNull();
  });
});

describe('weekday difficulty (DAILY-3)', () => {
  it('Mon 1, Tue 2, Wed 2, Thu 3, Fri 3, Sat 4, Sun 5', () => {
    // 2026-12-07 is a Monday
    expect(weekday('2026-12-07')).toBe(1);
    const got = [0, 1, 2, 3, 4, 5, 6].map((i) => dailyDifficulty(addDays('2026-12-07', i)));
    expect(got).toEqual([1, 2, 2, 3, 3, 4, 5]);
  });
});

describe('world rotation (DAILY-4)', () => {
  it('rotates through every world in order by puzzle number', () => {
    const seq = [0, 1, 2, 3, 4, 5].map((i) => dailyWorld(addDays('2026-12-01', i)));
    expect(seq).toEqual(['meadow', 'harbour', 'market', 'meadow', 'harbour', 'market']);
    // before launch too, without gaps
    expect(dailyWorld('2026-11-30')).toBe('market');
  });
});

describe('archive window (ARCH-1/2)', () => {
  it('today, 7 free days, older locked, future never', () => {
    expect(dailyAccess('2026-12-10', '2026-12-10')).toBe('today');
    expect(dailyAccess('2026-12-09', '2026-12-10')).toBe('archive');
    expect(dailyAccess('2026-12-03', '2026-12-10')).toBe('archive');
    expect(dailyAccess('2026-12-02', '2026-12-10')).toBe('locked');
    expect(dailyAccess('2026-11-30', '2026-12-10')).toBe('locked');
    expect(dailyAccess('2026-12-11', '2026-12-10')).toBe('future');
  });
});

describe('Explore ladders (EXP-1)', () => {
  it('maps levels to difficulty bands and seeds', () => {
    const d = Array.from({ length: 30 }, (_, i) => exploreDifficulty(i + 1));
    expect(d).toEqual([
      1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5,
    ]);
    expect(seedFor({ mode: 'explore', world: 'harbour', level: 7 })).toBe('explore-harbour-7');
    expect(parseRefKey(refKey({ mode: 'explore', world: 'market', level: 30 }))).toEqual({
      mode: 'explore',
      world: 'market',
      level: 30,
    });
    expect(parseRefKey('explore:moon:1')).toBeNull();
  });
});
