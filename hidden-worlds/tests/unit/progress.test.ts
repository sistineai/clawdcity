import { beforeEach, describe, expect, it, vi } from 'vitest';
import { displayedStreak, extendStreak, type Streak } from '../../src/game/streak';
import { completePuzzle, recordResident, startPuzzle } from '../../src/game/progress';
import { freshDoc, SaveDoc } from '../../src/state/schema';
import { STORAGE_BACKUP_KEY, STORAGE_KEY } from '../../src/config';
import { distinctResidents, isLevelUnlocked, unlockedWorlds } from '../../src/game/residents';

class MemStorage {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}
let store: MemStorage;
beforeEach(() => {
  store = new MemStorage();
  vi.stubGlobal('localStorage', store);
});
const storage = () => import('../../src/state/storage');

describe('META-1 streak', () => {
  const s0: Streak = { current: 0, best: 0, last: null };
  it('extends when yesterday was completed, otherwise resets to 1', () => {
    let s = extendStreak(s0, '2026-12-01');
    expect(s).toEqual({ current: 1, best: 1, last: '2026-12-01' });
    s = extendStreak(s, '2026-12-02');
    expect(s.current).toBe(2);
    s = extendStreak(s, '2026-12-02');
    expect(s.current).toBe(2);
    s = extendStreak(s, '2026-12-04');
    expect(s).toEqual({ current: 1, best: 2, last: '2026-12-04' });
    // across a month end and a leap day
    expect(extendStreak({ current: 3, best: 3, last: '2028-02-28' }, '2028-02-29').current).toBe(4);
    expect(extendStreak({ current: 3, best: 3, last: '2026-12-31' }, '2027-01-01').current).toBe(4);
  });
  it('DAILY-7: a day finished after the next one still joins the run', () => {
    // D started and left open; D+1 completed; then D finished after midnight; then D+2
    let s = extendStreak({ current: 0, best: 2, last: null }, '2026-12-04');
    expect(s).toEqual({ current: 1, best: 2, last: '2026-12-04' });
    const done = new Set(['2026-12-01', '2026-12-02']);
    s = extendStreak(s, '2026-12-03', (k) => done.has(k));
    expect(s).toEqual({ current: 4, best: 4, last: '2026-12-04' });
    s = extendStreak(s, '2026-12-05');
    expect(s).toEqual({ current: 5, best: 5, last: '2026-12-05' });
    // an older day that does not touch the run changes nothing
    expect(extendStreak(s, '2026-11-20')).toBe(s);
  });
  it('completePuzzle keeps the streak when days finish out of order', () => {
    let d = freshDoc(0, 'device-12345678');
    const D = { mode: 'daily' as const, date: '2026-12-07' };
    const D1 = { mode: 'daily' as const, date: '2026-12-08' };
    const D2 = { mode: 'daily' as const, date: '2026-12-09' };
    const sD = startPuzzle(d, D, D.date, 1);
    d = sD.doc;
    const s1 = startPuzzle(d, D1, D1.date, 2);
    d = completePuzzle(s1.doc, D1, { timeMs: 1, misses: 0, hints: 0, resident: null }, s1.active, 3).doc;
    d = completePuzzle(d, D, { timeMs: 1, misses: 0, hints: 0, resident: null }, sD.active, 4).doc;
    expect(d.streak).toEqual({ current: 2, best: 2, last: D1.date });
    const s2 = startPuzzle(d, D2, D2.date, 5);
    d = completePuzzle(s2.doc, D2, { timeMs: 1, misses: 0, hints: 0, resident: null }, s2.active, 6).doc;
    expect(d.streak).toEqual({ current: 3, best: 3, last: D2.date });
  });
  it('displays 0 when the last completion is older than yesterday', () => {
    const s = { current: 5, best: 9, last: '2026-12-10' };
    expect(displayedStreak(s, '2026-12-10')).toBe(5);
    expect(displayedStreak(s, '2026-12-11')).toBe(5);
    expect(displayedStreak(s, '2026-12-12')).toBe(0);
  });
});

describe('completing puzzles', () => {
  const today = '2026-12-05';
  it('records a daily result, stats, stars and the streak; an archive puzzle is late', () => {
    let d = freshDoc(0, 'device-12345678');
    const start = startPuzzle(d, { mode: 'daily', date: today }, today, 1);
    expect(start.resumed).toBe(false);
    d = start.doc;
    expect(d.stats.played).toBe(1);
    const r = completePuzzle(
      d,
      { mode: 'daily', date: today },
      { timeMs: 61000, misses: 1, hints: 0, resident: 'mossy' },
      start.active,
      2,
    );
    expect(r.stars).toBe(3);
    expect(r.late).toBe(false);
    expect(r.doc.streak).toEqual({ current: 1, best: 1, last: today });
    expect(r.doc.daily[today]).toMatchObject({
      stars: 3,
      timeMs: 61000,
      resident: 'mossy',
      late: false,
      world: 'harbour',
      difficulty: 4,
    });
    expect(r.doc.active).toEqual({});
    expect(r.doc.stats).toMatchObject({ completed: 1, bestTimeMs: 61000, threeStars: 1 });

    const late = startPuzzle(r.doc, { mode: 'daily', date: '2026-12-03' }, today, 3);
    const r2 = completePuzzle(
      late.doc,
      { mode: 'daily', date: '2026-12-03' },
      { timeMs: 30000, misses: 5, hints: 1, resident: null },
      late.active,
      4,
    );
    expect(r2.late).toBe(true);
    expect(r2.stars).toBe(1);
    expect(r2.doc.streak).toEqual(r.doc.streak);
    expect(r2.doc.stats.bestTimeMs).toBe(30000);
  });
  it('DAILY-7: a puzzle started yesterday and finished after midnight counts for yesterday', () => {
    const d = freshDoc(0, 'device-12345678');
    const s = startPuzzle(d, { mode: 'daily', date: '2026-12-04' }, '2026-12-04', 1);
    const r = completePuzzle(
      s.doc,
      { mode: 'daily', date: '2026-12-04' },
      { timeMs: 1000, misses: 0, hints: 0, resident: null },
      s.active,
      2,
    );
    expect(r.late).toBe(false);
    expect(r.doc.streak.last).toBe('2026-12-04');
  });
  it('Explore keeps the best stars and never touches the streak (EXP-3)', () => {
    let d = freshDoc(0, 'device-12345678');
    const ref = { mode: 'explore' as const, world: 'meadow' as const, level: 1 };
    let s = startPuzzle(d, ref, today, 1);
    d = completePuzzle(s.doc, ref, { timeMs: 1, misses: 0, hints: 0, resident: null }, s.active, 2).doc;
    s = startPuzzle(d, ref, today, 3);
    d = completePuzzle(s.doc, ref, { timeMs: 1, misses: 0, hints: 2, resident: null }, s.active, 4).doc;
    expect(d.explore.meadow).toEqual({ '1': 3 });
    expect(d.streak.current).toBe(0);
    expect(isLevelUnlocked(d, 'meadow', 2)).toBe(true);
    expect(isLevelUnlocked(d, 'meadow', 3)).toBe(false);
  });
  it('residents: new vs already met, and world unlocks at 3 and 6 distinct (section 5)', () => {
    let d = freshDoc(0, 'device-12345678');
    let r = recordResident(d, 'mossy', today);
    expect(r.isNew).toBe(true);
    d = r.doc;
    r = recordResident(d, 'mossy', '2026-12-06');
    expect(r.isNew).toBe(false);
    expect(r.doc.residents.mossy).toEqual({ count: 2, first: today });
    d = r.doc;
    expect(unlockedWorlds(distinctResidents(d))).toEqual(['meadow']);
    for (const id of ['bram', 'tuck']) d = recordResident(d, id, today).doc;
    expect(unlockedWorlds(distinctResidents(d))).toEqual(['meadow', 'harbour']);
    for (const id of ['odo', 'fen', 'sol']) d = recordResident(d, id, today).doc;
    expect(unlockedWorlds(distinctResidents(d))).toEqual(['meadow', 'harbour', 'market']);
  });
});

describe('META-5/6 storage', () => {
  it('starts fresh on first open and round-trips a valid document', async () => {
    const { loadDoc, saveDoc } = await storage();
    const a = loadDoc(1000);
    expect(a.first).toBe(true);
    expect(a.recovered).toBe(false);
    saveDoc({ ...a.doc, onboarded: true });
    const b = loadDoc(2000);
    expect(b.first).toBe(false);
    expect(b.doc.onboarded).toBe(true);
    expect(b.doc.deviceId).toBe(a.doc.deviceId);
  });
  it('backs up a corrupt value and starts fresh without crashing', async () => {
    const { loadDoc } = await storage();
    for (const bad of ['{not json', '[]', '{"v":1,"deviceId":5}', '{"v":99}', 'null']) {
      store.setItem(STORAGE_KEY, bad);
      store.removeItem(STORAGE_BACKUP_KEY);
      const r = loadDoc(1);
      expect(r.recovered).toBe(true);
      expect(SaveDoc.safeParse(r.doc).success).toBe(true);
      expect(store.getItem(STORAGE_BACKUP_KEY)).toBe(bad);
    }
  });
  it('migrates an unversioned (v0) document', async () => {
    const { parseDoc } = await storage();
    const v1 = freshDoc(5, 'device-12345678');
    const { v: _v, worldsAnnounced: _w, installNudgeShown: _i, ...v0 } = v1;
    const got = parseDoc(JSON.stringify(v0));
    expect(got).toEqual(v1);
  });
  it('falls back to memory when storage throws', async () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
      setItem() {
        throw new Error('blocked');
      },
      removeItem() {},
    });
    vi.resetModules();
    const { loadDoc, saveDoc, storageIsMemory } = await storage();
    const a = loadDoc(1);
    saveDoc({ ...a.doc, onboarded: true });
    expect(storageIsMemory()).toBe(true);
    expect(loadDoc(2).doc.onboarded).toBe(true);
    vi.resetModules();
  });
  it('prunes daily history to the last 60 days', async () => {
    const { pruneDoc } = await storage();
    const d = freshDoc(0, 'device-12345678');
    const res = {
      stars: 1,
      timeMs: 1,
      misses: 0,
      hints: 0,
      resident: null,
      late: false,
      completedAt: 1,
      world: 'meadow',
      difficulty: 1,
    };
    d.daily = { '2026-10-01': res, '2026-10-07': res, '2026-10-08': res, '2026-12-05': res };
    d.active = {
      'daily:2026-10-01': {
        found: [],
        resident: false,
        misses: 0,
        hints: 0,
        elapsedMs: 0,
        startedOn: '2026-10-01',
        updatedAt: 0,
      },
    };
    const p = pruneDoc(d, '2026-12-06');
    expect(Object.keys(p.daily)).toEqual(['2026-10-08', '2026-12-05']);
    expect(p.active).toEqual({});
  });
});
