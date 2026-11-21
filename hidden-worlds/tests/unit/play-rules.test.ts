import { describe, expect, it } from 'vitest';
import { hintRing, shouldLock } from '../../src/game/hint';
import { stars } from '../../src/game/scoring';
import { PLAY } from '../../src/config';

describe('PLAY-7 hint ring', () => {
  it('is about 12% of world width, contains the target and is not centred on it', () => {
    for (let i = 0; i < 200; i++) {
      const u = (i * 0.618) % 1;
      const v = (i * 0.414) % 1;
      const tx = 60 + ((i * 397) % 3080);
      const ty = 850 + ((i * 211) % 1100);
      const size = 50;
      const r = hintRing(tx, ty, size, 3200, 2000, u, v);
      expect(r.r * 2).toBeCloseTo(3200 * PLAY.hintRingFraction, 5);
      const d = Math.hypot(r.x - tx, r.y - ty);
      expect(d + size * 0.6).toBeLessThanOrEqual(r.r + 1e-9);
      expect(d).toBeGreaterThan(r.r * 0.1);
    }
  });
});

describe('PLAY-5 lockout', () => {
  it('locks on three misses inside two seconds only', () => {
    expect(shouldLock([0, 900, 1900], 1900, 3, 2000)).toBe(true);
    expect(shouldLock([0, 900, 2100], 2100, 3, 2000)).toBe(false);
    expect(shouldLock([1000, 1500], 1500, 3, 2000)).toBe(false);
  });
});

describe('PLAY-8 stars', () => {
  it('1 finishing, 2 no hints, 3 no hints and at most 2 misses', () => {
    expect(stars(1, 0)).toBe(1);
    expect(stars(2, 9)).toBe(1);
    expect(stars(0, 3)).toBe(2);
    expect(stars(0, 2)).toBe(3);
    expect(stars(0, 0)).toBe(3);
  });
});
