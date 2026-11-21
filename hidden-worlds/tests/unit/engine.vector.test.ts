import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { generate, type PackLogicData } from '../../src/engine/logic';
import { computeGolden } from '../../src/engine/golden';
import { ENGINE_VERSION } from '../../src/config';
import { loadPackNode } from '../../tools/lib/node-pack';
import { mean, p95, runInvariants } from './engine-invariants';

let pack: PackLogicData;
beforeAll(async () => {
  pack = (await loadPackNode('vector')).logic;
});

describe('engine with the vector pack', () => {
  it('ENG-A1, ENG-A4, ENG-A5: invariants, visibility by difficulty and speed over 300 puzzles', () => {
    const rep = runInvariants(pack, 20, ['meadow', 'harbour', 'market']);
    const vis = [1, 2, 3, 4, 5].map((d) => mean(rep.visByDiff[d]!));
    console.log(
      `vector: ${rep.puzzles} puzzles, forced in ${rep.forcedPuzzles}, generate+buildIdMap p95 ${p95(rep.times).toFixed(1)} ms, mean vis by difficulty ${vis.map((v) => v.toFixed(3)).join(' ')}`,
    );
    expect(rep.failures.slice(0, 20)).toEqual([]);
    expect(rep.puzzles).toBeGreaterThanOrEqual(300);
    expect(rep.forcedPuzzles / rep.puzzles).toBeLessThanOrEqual(0.05);
    expect(vis[0]).toBeGreaterThanOrEqual(0.95);
    expect(vis[4]).toBeLessThanOrEqual(0.88);
    for (let d = 1; d < 5; d++) expect(vis[d]!).toBeLessThan(vis[d - 1]!);
    expect(p95(rep.times)).toBeLessThanOrEqual(250);
  });

  it('ENG-A2: deterministic', () => {
    const a = generate({ seed: 'daily-2027-01-01', difficulty: 4, worldId: 'market', pack });
    const b = generate({ seed: 'daily-2027-01-01', difficulty: 4, worldId: 'market', pack });
    expect(b).toEqual(a);
  });

  it('ENG-A3: golden hashes match in Node', () => {
    const doc = JSON.parse(readFileSync('tests/golden/golden.json', 'utf8'));
    expect(doc.engineVersion).toBe(ENGINE_VERSION);
    expect(doc.packVersion).toBe(pack.version);
    expect(computeGolden(pack)).toEqual(doc.entries);
  });

  it('WORLD-3: residents only appear in their own world', () => {
    for (const w of pack.worlds)
      for (let i = 0; i < 12; i++) {
        const s = generate({ seed: 'res-' + i, difficulty: 1 + (i % 5), worldId: w.id, pack });
        expect(w.residents).toContain(s.sprites[s.resident!.uid]!.spriteId);
        for (const sp of s.sprites) if (sp.role === 'resident') expect(w.residents).toContain(sp.spriteId);
      }
  });
});

describe('engine with the sample PNG pack', () => {
  it('ENG-A1 invariants hold on a smaller sweep', async () => {
    const png = (await loadPackNode('sample-png')).logic;
    const rep = runInvariants(png, 4, ['meadow', 'harbour', 'market']);
    expect(rep.failures.slice(0, 20)).toEqual([]);
  });
});
