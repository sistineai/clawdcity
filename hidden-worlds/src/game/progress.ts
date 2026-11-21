// Pure updates to the saved document when a puzzle starts, a resident is found and a puzzle
// is completed. The UI calls these and hands the result to the store.
import { EXPLORE_LEVELS } from '../config';
import type { ActivePuzzle, ChallengeData, SaveDoc } from '../state/schema';
import { refKey, worldFor, difficultyFor, type PuzzleRef } from './puzzles';
import { stars as starsFor } from './scoring';
import { extendStreak } from './streak';

export function startPuzzle(
  doc: SaveDoc,
  ref: PuzzleRef,
  today: string,
  nowMs: number,
  challenge?: ChallengeData,
): { doc: SaveDoc; active: ActivePuzzle; resumed: boolean } {
  const key = refKey(ref);
  const have = doc.active[key];
  if (have) {
    const active = challenge && !have.challenge ? { ...have, challenge } : have;
    return {
      doc: active === have ? doc : { ...doc, active: { ...doc.active, [key]: active } },
      active,
      resumed: true,
    };
  }
  const active: ActivePuzzle = {
    found: [],
    resident: false,
    misses: 0,
    hints: 0,
    elapsedMs: 0,
    startedOn: today,
    updatedAt: nowMs,
  };
  if (challenge) active.challenge = challenge;
  return {
    doc: {
      ...doc,
      active: { ...doc.active, [key]: active },
      stats: { ...doc.stats, played: doc.stats.played + 1 },
    },
    active,
    resumed: false,
  };
}

export function saveActive(doc: SaveDoc, ref: PuzzleRef, active: ActivePuzzle): SaveDoc {
  return { ...doc, active: { ...doc.active, [refKey(ref)]: active } };
}

/** Record a resident sighting. Returns whether it was new to the collection. */
export function recordResident(
  doc: SaveDoc,
  residentId: string,
  today: string,
): { doc: SaveDoc; isNew: boolean } {
  const have = doc.residents[residentId];
  const entry = have ? { ...have, count: have.count + 1 } : { count: 1, first: today };
  return { doc: { ...doc, residents: { ...doc.residents, [residentId]: entry } }, isNew: !have };
}

export interface Completion {
  timeMs: number;
  misses: number;
  hints: number;
  resident: string | null;
}

export interface CompleteResult {
  doc: SaveDoc;
  stars: 1 | 2 | 3;
  late: boolean;
  streakChanged: boolean;
}

export function completePuzzle(
  doc: SaveDoc,
  ref: PuzzleRef,
  c: Completion,
  active: ActivePuzzle,
  nowMs: number,
): CompleteResult {
  const st = starsFor(c.hints, c.misses);
  const d: SaveDoc = { ...doc, active: { ...doc.active } };
  delete d.active[refKey(ref)];
  const stats = d.stats;
  d.stats = {
    ...stats,
    completed: stats.completed + 1,
    totalTimeMs: stats.totalTimeMs + c.timeMs,
    bestTimeMs: stats.bestTimeMs === null ? c.timeMs : Math.min(stats.bestTimeMs, c.timeMs),
    threeStars: stats.threeStars + (st === 3 ? 1 : 0),
  };
  let late = false;
  let streakChanged = false;
  if (ref.mode === 'daily') {
    // DAILY-7: it counts for the date it was started. ARCH-1: started after its date = late.
    late = active.startedOn !== ref.date;
    const result = {
      stars: st,
      timeMs: c.timeMs,
      misses: c.misses,
      hints: c.hints,
      resident: c.resident,
      late,
      completedAt: nowMs,
      world: worldFor(ref),
      difficulty: difficultyFor(ref),
      ...(active.challenge ? { challenge: active.challenge } : {}),
    };
    d.daily = { ...d.daily, [ref.date]: result };
    if (!late) {
      const onTime = (k: string) => {
        const r = d.daily[k];
        return !!r && !r.late;
      };
      const s = extendStreak(d.streak, ref.date, onTime);
      streakChanged = s !== d.streak;
      d.streak = s;
    }
  } else {
    const w = { ...(d.explore[ref.world] ?? {}) };
    const k = String(Math.min(ref.level, EXPLORE_LEVELS));
    w[k] = Math.max(w[k] ?? 0, st);
    d.explore = { ...d.explore, [ref.world]: w };
  }
  return { doc: d, stars: st, late, streakChanged };
}
