// Shared ENG-A1 checks, used with the synthetic pack (M1) and the real packs (M2+).
import {
  buildIdMap,
  difficultyConfig,
  findNear,
  ID_H,
  ID_W,
  generate,
  type PackLogicData,
  type PuzzleSpec,
} from '../../src/engine/logic/index.ts';
import { ENGINE } from '../../src/config.ts';

/** The visible pixel of a sprite nearest the centroid of its visible pixels, in world coords. */
export function visibleCentre(
  idMap: Int32Array,
  uid: number,
  sx: number,
  sy: number,
  size: number,
): { x: number; y: number } | null {
  const r = Math.ceil(size * 0.75);
  const pts: [number, number][] = [];
  for (let y = Math.max(0, Math.floor((sy - r) / 2)); y <= Math.min(ID_H - 1, Math.ceil((sy + r) / 2)); y++)
    for (let x = Math.max(0, Math.floor((sx - r) / 2)); x <= Math.min(ID_W - 1, Math.ceil((sx + r) / 2)); x++)
      if (idMap[y * ID_W + x] === uid) pts.push([x, y]);
  if (!pts.length) return null;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  let best = pts[0]!;
  for (const p of pts)
    if ((p[0] - cx) ** 2 + (p[1] - cy) ** 2 < (best[0] - cx) ** 2 + (best[1] - cy) ** 2) best = p;
  return { x: best[0] * 2 + 1, y: best[1] * 2 + 1 };
}

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
    // every target, however tucked, is found by a tap at the middle of what still shows
    const c = visibleCentre(idMap, t.uid, s.x, s.y, s.size);
    if (!c || findNear(idMap, c.x, c.y, 12, (u) => u === t.uid) !== t.uid)
      failures.push(`${tag}: ${s.spriteId} tap on its visible part missed`);
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
