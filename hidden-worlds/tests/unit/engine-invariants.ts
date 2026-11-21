// Shared ENG-A1 checks, used with the synthetic pack (M1) and the real packs (M2+).
import {
  buildIdMap,
  difficultyConfig,
  findNear,
  generate,
  type PackLogicData,
  type PuzzleSpec,
} from '../../src/engine/logic';
import { ENGINE } from '../../src/config';

export interface InvariantReport {
  puzzles: number;
  failures: string[];
  forcedPuzzles: number;
  visByDiff: Record<number, number[]>;
  times: number[];
}

export function checkSpec(spec: PuzzleSpec, pack: PackLogicData, failures: string[]): void {
  const cfg = difficultyConfig(spec.difficulty);
  const tag = `${spec.worldId}/${spec.seed}/d${spec.difficulty}`;
  const idMap = buildIdMap(spec, pack);
  const owned = new Uint32Array(spec.sprites.length);
  for (let i = 0; i < idMap.length; i++) if (idMap[i]! >= 0) owned[idMap[i]!]!++;
  const all = spec.resident ? [...spec.targets, spec.resident] : spec.targets;
  for (const t of all) {
    const s = spec.sprites[t.uid]!;
    if (t.visibility < cfg.minVis - 1e-9)
      failures.push(`${tag}: ${s.spriteId} vis ${t.visibility.toFixed(3)} < ${cfg.minVis}`);
    if (owned[t.uid]! < ENGINE.minOwnedPixels) failures.push(`${tag}: ${s.spriteId} owns ${owned[t.uid]} px`);
    // a visible target is found by a tap at its centre
    if (t.visibility > 0.95 && findNear(idMap, s.x, s.y, 12, (u) => u === t.uid) !== t.uid)
      failures.push(`${tag}: ${s.spriteId} centre tap missed`);
  }
  for (const t of spec.targets) {
    const s = spec.sprites[t.uid]!;
    const twins = spec.sprites.filter(
      (q) => q.uid !== s.uid && q.spriteId === s.spriteId && q.color === s.color,
    );
    if (twins.length) failures.push(`${tag}: ${s.spriteId}/${s.color} has ${twins.length} twin(s)`);
  }
  if (!spec.resident) failures.push(`${tag}: no resident`);
}

export function runInvariants(pack: PackLogicData, perCell: number, worlds: string[]): InvariantReport {
  const rep: InvariantReport = { puzzles: 0, failures: [], forcedPuzzles: 0, visByDiff: {}, times: [] };
  for (let d = 1; d <= 5; d++) {
    rep.visByDiff[d] = [];
    for (const worldId of worlds)
      for (let s = 0; s < perCell; s++) {
        const t0 = performance.now();
        const spec = generate({ seed: `inv-${s}`, difficulty: d, worldId, pack });
        buildIdMap(spec, pack);
        rep.times.push(performance.now() - t0);
        rep.puzzles++;
        if (spec.stats.forced > 0) rep.forcedPuzzles++;
        for (const t of spec.targets) rep.visByDiff[d]!.push(t.visibility);
        checkSpec(spec, pack, rep.failures);
        if (globalThis.gc && s % 10 === 0) globalThis.gc();
      }
  }
  return rep;
}

export const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
export const p95 = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.95)]!;
