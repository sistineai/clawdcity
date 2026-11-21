// Which puzzle a player is on: a daily date or an Explore level. Everything else derives from it.
import { EXPLORE_DIFFICULTY_BANDS, EXPLORE_LEVELS, WORLD_ORDER, type WorldId } from '../config';
import { dailyDifficulty, dailySeed, dailyWorld, isDateKey } from './dates';

export type PuzzleRef = { mode: 'daily'; date: string } | { mode: 'explore'; world: WorldId; level: number };

export function refKey(r: PuzzleRef): string {
  return r.mode === 'daily' ? `daily:${r.date}` : `explore:${r.world}:${r.level}`;
}
export function parseRefKey(k: string): PuzzleRef | null {
  const p = k.split(':');
  if (p[0] === 'daily' && p[1] && isDateKey(p[1])) return { mode: 'daily', date: p[1] };
  if (p[0] === 'explore' && isWorld(p[1] ?? '') && isLevel(Number(p[2])))
    return { mode: 'explore', world: p[1] as WorldId, level: Number(p[2]) };
  return null;
}
export const isWorld = (w: string): w is WorldId => (WORLD_ORDER as readonly string[]).includes(w);
export const isLevel = (n: number) => Number.isInteger(n) && n >= 1 && n <= EXPLORE_LEVELS;

export function exploreDifficulty(level: number): number {
  for (const b of EXPLORE_DIFFICULTY_BANDS) if (level <= b.upTo) return b.difficulty;
  return 5;
}
export function seedFor(r: PuzzleRef): string {
  return r.mode === 'daily' ? dailySeed(r.date) : `explore-${r.world}-${r.level}`;
}
export function difficultyFor(r: PuzzleRef): number {
  return r.mode === 'daily' ? dailyDifficulty(r.date) : exploreDifficulty(r.level);
}
export function worldFor(r: PuzzleRef): WorldId {
  return r.mode === 'daily' ? dailyWorld(r.date) : r.world;
}
