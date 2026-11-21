import { describe, expect, it } from 'vitest';
import { generate } from '../../src/engine/logic';
import { syntheticPack } from '../fixtures/synthetic-pack';
import { mean, p95, runInvariants } from '../../tools/lib/invariants';

const pack = syntheticPack();

describe('engine with hand-made masks', () => {
  it('ENG-A1: invariants hold over 300 puzzles', () => {
    const rep = runInvariants(pack, 20, ['meadow', 'harbour', 'market']);
    console.log(
      `synthetic: ${rep.puzzles} puzzles, forced in ${rep.forcedPuzzles}, p95 ${p95(rep.times).toFixed(1)} ms, mean vis by d: ${[1, 2, 3, 4, 5].map((d) => mean(rep.visByDiff[d]!).toFixed(3)).join(' ')}`,
    );
    expect(rep.failures.slice(0, 20)).toEqual([]);
    expect(rep.puzzles).toBeGreaterThanOrEqual(300);
    expect(rep.forcedPuzzles / rep.puzzles).toBeLessThanOrEqual(0.05);
  });
  it('ENG-A2: same input gives deep-equal specs', () => {
    for (const d of [1, 3, 5]) {
      const a = generate({ seed: 'det', difficulty: d, worldId: 'harbour', pack });
      const b = generate({ seed: 'det', difficulty: d, worldId: 'harbour', pack });
      expect(b).toEqual(a);
    }
  });
  it('output positions and sizes are integers', () => {
    const s = generate({ seed: 'ints', difficulty: 4, worldId: 'market', pack });
    for (const sp of s.sprites) {
      expect(
        Number.isInteger(sp.x) &&
          Number.isInteger(sp.y) &&
          Number.isInteger(sp.size) &&
          Number.isInteger(sp.z),
      ).toBe(true);
    }
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});

describe('engine speed (synthetic)', () => {
  it('ENG-A5: generate + buildIdMap p95 <= 250 ms', () => {
    const rep = runInvariants(pack, 4, ['meadow']);
    expect(p95(rep.times)).toBeLessThanOrEqual(250);
  });
});
