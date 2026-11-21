import { STARS } from '../config';

/** PLAY-8: 1 for finishing, 2 with no hints, 3 with no hints and at most 2 misses. Time never counts. */
export function stars(hints: number, misses: number): 1 | 2 | 3 {
  if (hints > 0) return 1;
  return misses <= STARS.noHintsMaxMisses ? 3 : 2;
}
export const starString = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
