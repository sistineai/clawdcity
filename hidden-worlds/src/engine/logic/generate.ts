// The placement engine, ported from prototype/src/engine.js under the purity rules in
// SPEC section 3: no canvas, no Date, no Math.random, no transcendental functions.

import {
  DIFFICULTY,
  ENGINE,
  ENGINE_VERSION,
  ID_SCALE_DEN,
  ID_SCALE_NUM,
  RARITY_WEIGHT,
  SIZE_STEP,
  WORLD_H,
  WORLD_W,
  type DifficultyConfig,
} from '../../config';
import { placedMask, ROT_MAX_STEP, type PlacedMask } from './mask';
import { makeRng, type Rng } from './rng';
import type {
  GenerateInput,
  PackLogicData,
  PuzzleSpec,
  Role,
  SpriteLogic,
  SpriteSpec,
  WorldLogic,
} from './types';

export const ID_SCALE = ID_SCALE_NUM / ID_SCALE_DEN;
export const ID_W = (WORLD_W * ID_SCALE_NUM) / ID_SCALE_DEN;
export const ID_H = (WORLD_H * ID_SCALE_NUM) / ID_SCALE_DEN;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function difficultyConfig(difficulty: number): DifficultyConfig {
  const d = clamp(Math.round(difficulty), 1, 5);
  const u = (d - 1) / 4;
  const D = DIFFICULTY;
  return {
    targets: D.targetsBase + d,
    decoys: d + D.decoysBase,
    clutter: Math.round(lerp(D.clutter[0], D.clutter[1], u)),
    occluders: Math.round(lerp(D.occluders[0], D.occluders[1], u)),
    clouds: D.clouds,
    minVis: lerp(D.minVis[0], D.minVis[1], u),
    tuck: lerp(D.tuck[0], D.tuck[1], u),
    sizeMul: lerp(D.sizeMul[0], D.sizeMul[1], u),
    overlap: lerp(D.overlap[0], D.overlap[1], u),
    targetOverlap: lerp(D.targetOverlap[0], D.targetOverlap[1], u),
  };
}

export interface PackIndex {
  byId: Map<string, SpriteLogic>;
  world: (id: string) => WorldLogic;
}
const indexCache = new WeakMap<PackLogicData, PackIndex>();
export function indexPack(pack: PackLogicData): PackIndex {
  let ix = indexCache.get(pack);
  if (!ix) {
    const byId = new Map(pack.sprites.map((s) => [s.id, s]));
    const worlds = new Map(pack.worlds.map((w) => [w.id, w]));
    ix = {
      byId,
      world: (id) => {
        const w = worlds.get(id);
        if (!w) throw new Error(`Unknown world "${id}" in pack ${pack.id}`);
        return w;
      },
    };
    indexCache.set(pack, ix);
  }
  return ix;
}

/** Fraction of the size from the box centre down to the ground point. */
export function baseFrac(sp: SpriteLogic): number {
  return ((sp.anchor[1] - sp.h / 2) / Math.max(sp.w, sp.h)) as number;
}

const snapSize = (s: number) => Math.max(SIZE_STEP, Math.round(s / SIZE_STEP) * SIZE_STEP);

interface Work {
  spec: SpriteSpec;
  def: SpriteLogic;
  baseY: number;
  r: number;
  sky: boolean;
  protect: boolean;
  tucked: boolean;
  tries: number;
  pm: PlacedMask | null;
  vis: number;
}

export function maskFor(pack: PackLogicData, def: SpriteLogic, s: SpriteSpec): PlacedMask {
  return placedMask(pack, def, s.size, s.rotStep, s.flip, ID_SCALE);
}

/** Stamp masks into an ID map in draw order. Returns pixel counts per uid. */
function stamp(
  pack: PackLogicData,
  ix: PackIndex,
  sprites: readonly SpriteSpec[],
  order: readonly number[],
  idMap: Int32Array,
  getMask?: (uid: number) => PlacedMask,
): Uint32Array {
  idMap.fill(-1);
  for (const uid of order) {
    const s = sprites[uid]!;
    const m = getMask ? getMask(uid) : maskFor(pack, ix.byId.get(s.spriteId)!, s);
    const ox = Math.floor(s.x * ID_SCALE) + m.dx;
    const oy = Math.floor(s.y * ID_SCALE) + m.dy;
    const x0 = Math.max(0, -ox);
    const x1 = Math.min(m.w, ID_W - ox);
    for (let yy = 0; yy < m.h; yy++) {
      const gy = oy + yy;
      if (gy < 0 || gy >= ID_H) continue;
      let gi = gy * ID_W + ox + x0;
      let mi = yy * m.w + x0;
      for (let xx = x0; xx < x1; xx++, gi++, mi++) {
        if (m.data[mi]) idMap[gi] = uid;
      }
    }
  }
  const counts = new Uint32Array(sprites.length);
  for (let i = 0; i < idMap.length; i++) {
    const v = idMap[i]!;
    if (v >= 0) counts[v]!++;
  }
  return counts;
}

/** Draw order: sky by z, then ground by baseline, then anything forced to the front (ENG-13). */
export function drawOrder(
  sprites: readonly SpriteSpec[],
  baseYOf: (s: SpriteSpec) => number,
  isSky: (s: SpriteSpec) => boolean,
): number[] {
  const sky = sprites.filter((s) => isSky(s)).sort((a, b) => a.z - b.z || a.uid - b.uid);
  const ground = sprites
    .filter((s) => !isSky(s) && !s.front)
    .sort((a, b) => baseYOf(a) - baseYOf(b) || a.uid - b.uid);
  const front = sprites.filter((s) => !isSky(s) && s.front);
  return sky.concat(ground, front).map((s) => s.uid);
}

export function generate(input: GenerateInput): PuzzleSpec {
  const { pack } = input;
  const ix = indexPack(pack);
  const world = ix.world(input.worldId);
  const W = WORLD_W;
  const H = WORLD_H;
  const d = clamp(Math.round(input.difficulty), 1, 5);
  const cfg = difficultyConfig(d);
  const rng: Rng = makeRng(String(input.seed) + '#' + d + '#' + world.id);

  const hz = Math.round(H * world.horizon);
  const gTop = hz + 40;
  const gBot = H - 46;
  const depth = (y: number) => lerp(ENGINE.depthFar, ENGINE.depthNear, clamp((y - hz) / (H - hz), 0, 1));

  const work: Work[] = [];
  const smalls: Work[] = [];
  const occs: Work[] = [];
  const add = (def: SpriteLogic, role: Role, color: string | null, rotStep: number, flip: boolean): Work => {
    const w: Work = {
      spec: {
        uid: work.length,
        spriteId: def.id,
        role,
        color,
        x: 0,
        y: 0,
        size: SIZE_STEP,
        rotStep,
        flip,
        z: 0,
        front: false,
      },
      def,
      baseY: 0,
      r: 0,
      sky: false,
      protect: role === 'target' || role === 'resident',
      tucked: false,
      tries: 0,
      pm: null,
      vis: 0,
    };
    work.push(w);
    return w;
  };
  const sprite = (id: string): SpriteLogic => {
    const s = ix.byId.get(id);
    if (!s) throw new Error(`Unknown sprite "${id}" in world ${world.id}`);
    return s;
  };
  const setPos = (w: Work, x: number, baseY: number, size: number, sky: boolean, y?: number) => {
    w.spec.size = snapSize(size);
    w.spec.x = Math.round(x);
    if (y !== undefined) {
      w.spec.y = Math.round(y);
      w.baseY = sky ? 0 : w.spec.y + Math.round(baseFrac(w.def) * w.spec.size);
    } else {
      w.baseY = Math.round(baseY);
      w.spec.y = w.baseY - Math.round(baseFrac(w.def) * w.spec.size);
    }
    w.r = w.spec.size * 0.36;
    w.sky = sky;
    w.pm = null;
  };
  const maskOf = (w: Work) => (w.pm ??= maskFor(pack, w.def, w.spec));
  const tintOf = (def: SpriteLogic) => {
    const t = def.tints ?? [];
    const i = rng.int(Math.max(1, t.length));
    return t.length ? (t[i] as string) : null;
  };

  // 1. big things that can hide small things
  const occDefs = world.occluders.map((id) => ({ def: sprite(id), w: sprite(id).weight ?? 1 }));
  for (let i = 0; i < cfg.occluders; i++) {
    const def = rng.weighted(occDefs).def;
    for (let a = 0; a < ENGINE.occluderAttempts; a++) {
      const baseY = rng.range(gTop + 30, gBot - 6);
      const size = def.baseSize * depth(baseY) * rng.range(0.85, 1.15);
      const x = rng.range(40, W - 40);
      let ok = true;
      for (const o of occs) {
        const dx = o.spec.x - x;
        const dy = (o.baseY - baseY) * 2.2;
        const min = (o.spec.size + size) * 0.33;
        if (dx * dx + dy * dy < min * min) {
          ok = false;
          break;
        }
      }
      if (ok || a === ENGINE.occluderAttempts - 1) {
        const color = tintOf(def);
        const flip = def.allowFlip ? rng.chance(0.5) : false;
        const o = add(def, 'occluder', color, 0, flip);
        setPos(o, x, baseY, size, false);
        occs.push(o);
        break;
      }
    }
  }
  const skyDefs = world.sky.map((id) => sprite(id));
  for (let i = 0; i < cfg.clouds && skyDefs.length; i++) {
    const def = rng.pick(skyDefs);
    const color = tintOf(def);
    const x = rng.range(0, W);
    const y = rng.range(60, hz - 80);
    const size = def.baseSize * rng.range(0.73, 1.27);
    const flip = def.allowFlip ? rng.chance(0.5) : false;
    const c = add(def, 'sky', color, 0, flip);
    setPos(c, x, 0, size, true, y);
    c.spec.z = 1 + rng.int(1000000);
  }

  // 2. decide what goes in the world: targets, lookalike decoys, filler
  const pool = world.smalls;
  const smallDefs = pack.sprites.filter((s) => s.kind === 'small' && (pool[s.id] ?? 1) > 0);
  const remaining = smallDefs.map((def) => ({ def, w: pool[def.id] ?? 1 }));
  const targetTypes: SpriteLogic[] = [];
  for (let i = 0; i < cfg.targets && remaining.length; i++) {
    const it = rng.weighted(remaining);
    targetTypes.push(it.def);
    remaining.splice(remaining.indexOf(it), 1);
  }
  const fillers = remaining;
  const colors = pack.colors;
  interface Plan {
    def: SpriteLogic;
    color: string | null;
    role: Role;
  }
  const plans: Plan[] = [];
  for (const def of targetTypes)
    plans.push({ def, color: def.colored ? rng.pick(colors) : null, role: 'target' });
  const resDefs = world.residents.map((id) => sprite(id));
  if (resDefs.length) {
    const r = rng.weighted(resDefs.map((def) => ({ def, w: RARITY_WEIGHT[def.rarity ?? 'common'] })));
    plans.push({ def: r.def, color: null, role: 'resident' });
  }
  for (const t of plans.filter((p) => p.role === 'target')) {
    if (!t.def.colored) continue;
    const others = rng.shuffle(colors.filter((c) => c !== t.color)).slice(0, cfg.decoys);
    for (const oc of others) plans.push({ def: t.def, color: oc, role: 'decoy' });
  }
  for (let i = 0; i < cfg.clutter && fillers.length; i++) {
    const def = rng.weighted(fillers).def;
    plans.push({ def, color: def.colored ? rng.pick(colors) : null, role: 'clutter' });
  }

  // 3. placement
  type Mode = 'sky' | 'tuck' | 'open' | 'any';
  const place = (sp: Work, mode: Mode) => {
    let cand: { x: number; y: number; size: number; baseY: number } | null = null;
    const bf = baseFrac(sp.def);
    for (let a = 0; a < ENGINE.placeAttempts; a++) {
      let x: number, y: number, size: number, baseY: number;
      if (mode === 'sky') {
        size = ENGINE.skyBaseSize * cfg.sizeMul * rng.range(0.85, 1.1);
        x = rng.range(60, W - 60);
        y = rng.range(70, hz - 60);
        baseY = 0;
      } else if (mode === 'tuck' && occs.length) {
        const o = rng.pick(occs);
        x = o.spec.x + rng.range(-0.5, 0.5) * o.spec.size;
        y = o.spec.y + rng.range(-0.42, 0.28) * o.spec.size;
        size = ENGINE.smallBaseSize * cfg.sizeMul * depth(y) * rng.range(0.9, 1.1);
        baseY = y + bf * size;
        if (baseY >= o.baseY - 2) continue;
      } else {
        baseY = rng.range(gTop + 20, gBot);
        size = ENGINE.smallBaseSize * cfg.sizeMul * depth(baseY) * rng.range(0.9, 1.1);
        x = rng.range(60, W - 60);
        y = baseY - bf * size;
      }
      if (x < 60 || x > W - 60) continue;
      if (mode !== 'sky' && (y - size * 0.5 < hz + 8 || y + size * 0.5 > H - 8)) continue;
      const r = size * 0.36;
      if (mode === 'open') {
        let covered = false;
        for (const o of occs) {
          const os = o.spec.size;
          if (
            o.baseY > baseY &&
            Math.abs(o.spec.x - x) < os * 0.5 + r * 0.6 &&
            y > o.spec.y - os * 0.52 - r * 0.6 &&
            y < o.spec.y + os * 0.5
          ) {
            covered = true;
            break;
          }
        }
        if (covered) continue;
      }
      cand = { x, y, size, baseY };
      let ok = true;
      for (const q of smalls) {
        if (q === sp || q.sky !== (mode === 'sky')) continue;
        const lim = q.protect || sp.protect ? cfg.targetOverlap : cfg.overlap;
        const dx = q.spec.x - x;
        const dy = q.spec.y - y;
        const min = (q.r + r) * (1 - lim);
        if (dx * dx + dy * dy < min * min) {
          ok = false;
          break;
        }
      }
      if (ok) break;
    }
    if (!cand) {
      const size = ENGINE.smallBaseSize * cfg.sizeMul;
      const by = (gTop + gBot) / 2 + bf * size;
      cand = { x: W / 2, y: (gTop + gBot) / 2, size, baseY: by };
    }
    if (mode === 'sky') setPos(sp, cand.x, 0, cand.size, true, cand.y);
    else setPos(sp, cand.x, cand.baseY, cand.size, false);
    if (sp.sky && sp.spec.z === 0) sp.spec.z = 1 + rng.int(1000000);
  };

  // Hide a target partly behind one occluder: sample spots and keep one where the occluder
  // covers some of it but leaves at least the minimum visible (ENG-11).
  const placeTucked = (sp: Work): boolean => {
    if (!occs.length) return false;
    const bf = baseFrac(sp.def);
    for (let a = 0; a < ENGINE.tuckAttempts; a++) {
      const o = rng.pick(occs);
      const x = o.spec.x + rng.range(-0.55, 0.55) * o.spec.size;
      const y = o.spec.y + rng.range(-0.45, 0.3) * o.spec.size;
      const size = ENGINE.smallBaseSize * cfg.sizeMul * depth(y) * rng.range(0.9, 1.1);
      const baseY = y + bf * size;
      const r = size * 0.36;
      if (baseY >= o.baseY - 2 || x < 60 || x > W - 60 || y - size * 0.5 < hz + 8 || y + size * 0.5 > H - 8)
        continue;
      let ok = true;
      for (const q of smalls) {
        if (q === sp || q.sky) continue;
        const dx = q.spec.x - x;
        const dy = q.spec.y - y;
        const min = (q.r + r) * (1 - cfg.targetOverlap);
        if (dx * dx + dy * dy < min * min) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      setPos(sp, x, baseY, size, false);
      if (sp.baseY >= o.baseY) continue;
      const m = maskOf(sp);
      const om = maskOf(o);
      const mox = Math.floor(sp.spec.x * ID_SCALE) + m.dx;
      const moy = Math.floor(sp.spec.y * ID_SCALE) + m.dy;
      const oox = Math.floor(o.spec.x * ID_SCALE) + om.dx;
      const ooy = Math.floor(o.spec.y * ID_SCALE) + om.dy;
      let cov = 0;
      for (let yy = 0; yy < m.h; yy++) {
        const oy = moy + yy - ooy;
        if (oy < 0 || oy >= om.h) continue;
        for (let xx = 0; xx < m.w; xx++) {
          if (!m.data[yy * m.w + xx]) continue;
          const ox = mox + xx - oox;
          if (ox >= 0 && ox < om.w && om.data[oy * om.w + ox]) cov++;
        }
      }
      const v = m.n ? 1 - cov / m.n : 0;
      if (v >= cfg.minVis + ENGINE.tuckVisMargin && v <= ENGINE.tuckVisMax) return true;
    }
    return false;
  };

  const targets: Work[] = [];
  for (const p of plans) {
    const isTarget = p.role === 'target' || p.role === 'resident';
    const steps = p.role === 'resident' ? ENGINE.residentRotSteps : ROT_MAX_STEP;
    const rawRot = rng.int(steps * 2 + 1) - steps;
    const rawFlip = rng.chance(0.5);
    const sp = add(p.def, p.role, p.color, p.def.allowRotate ? rawRot : 0, p.def.allowFlip ? rawFlip : false);
    let mode: Mode;
    if (p.def.skyOk && rng.chance(ENGINE.skyChance)) mode = 'sky';
    else if (isTarget) mode = rng.chance(cfg.tuck) ? 'tuck' : 'open';
    else mode = rng.chance(ENGINE.clutterTuckChance) ? 'tuck' : 'any';
    if (isTarget && mode === 'tuck') {
      sp.tucked = placeTucked(sp);
      if (!sp.tucked) place(sp, 'open');
    } else place(sp, mode);
    smalls.push(sp);
    if (isTarget) targets.push(sp);
  }

  // 4. stack masks in draw order into the ID map; 5. repair anything too hidden (ENG-12)
  const sprites = work.map((w) => w.spec);
  const idMap = new Int32Array(ID_W * ID_H);
  let order: number[] = [];
  const measure = () => {
    order = drawOrder(
      sprites,
      (s) => work[s.uid]!.baseY,
      (s) => work[s.uid]!.sky,
    );
    const counts = stamp(pack, ix, sprites, order, idMap, (uid) => maskOf(work[uid]!));
    for (const t of targets) {
      const m = maskOf(t);
      t.vis = m.n ? counts[t.spec.uid]! / m.n : 0;
    }
  };
  let passes = 0;
  let forced = 0;
  let moved = 0;
  for (;;) {
    measure();
    passes++;
    const bad = targets.filter((t) => t.vis < cfg.minVis);
    if (!bad.length) break;
    if (passes >= ENGINE.repairPasses) {
      for (const t of bad) {
        t.spec.front = true;
        forced++;
      }
      measure();
      passes++;
      break;
    }
    for (const t of bad) {
      moved++;
      if (t.sky) {
        t.spec.z = 2000001 + rng.int(1000000);
        place(t, 'sky');
      } else if (t.tucked && ++t.tries <= ENGINE.tuckedRetries && placeTucked(t)) {
        // found another hiding spot
      } else {
        t.tucked = false;
        place(t, 'open');
      }
    }
  }

  const counts = { target: 0, decoy: 0, clutter: 0, occluder: 0, sky: 0, resident: 0 } as Record<
    Role,
    number
  >;
  for (const s of sprites) counts[s.role]++;
  const res = targets.find((t) => t.spec.role === 'resident');
  return {
    engineVersion: ENGINE_VERSION,
    packId: pack.id,
    packVersion: pack.version,
    seed: String(input.seed),
    difficulty: d,
    worldId: world.id,
    W,
    H,
    horizon: hz,
    sprites,
    order,
    targets: targets
      .filter((t) => t.spec.role === 'target')
      .map((t) => ({ uid: t.spec.uid, visibility: t.vis })),
    resident: res ? { uid: res.spec.uid, visibility: res.vis } : null,
    stats: { passes, moved, forced, counts },
  };
}

/** Sky-layer sprites carry z > 0; ground sprites have z = 0. */
export function isSkySprite(s: SpriteSpec): boolean {
  return s.z > 0;
}

/** Rebuild the ID map from a spec alone (ENG-7). */
export function buildIdMap(spec: PuzzleSpec, pack: PackLogicData): Int32Array {
  const ix = indexPack(pack);
  const idMap = new Int32Array(ID_W * ID_H);
  stamp(pack, ix, spec.sprites, spec.order, idMap);
  return idMap;
}

/** Which sprite owns this world point (-1 for background). */
export function hitAt(idMap: Int32Array, x: number, y: number): number {
  const ix = Math.floor(x * ID_SCALE);
  const iy = Math.floor(y * ID_SCALE);
  if (ix < 0 || iy < 0 || ix >= ID_W || iy >= ID_H) return -1;
  return idMap[iy * ID_W + ix]!;
}

/** Unit vectors at 30-degree steps, as literals so no trigonometry runs in logic. */
const RING: readonly (readonly [number, number])[] = [
  [1, 0],
  [0.8660254037844387, 0.5],
  [0.5, 0.8660254037844387],
  [0, 1],
  [-0.5, 0.8660254037844387],
  [-0.8660254037844387, 0.5],
  [-1, 0],
  [-0.8660254037844387, -0.5],
  [-0.5, -0.8660254037844387],
  [0, -1],
  [0.5, -0.8660254037844387],
  [0.8660254037844387, -0.5],
];

/** Forgiving hit test: accept a wanted sprite within `radius` world pixels of the point. */
export function findNear(
  idMap: Int32Array,
  x: number,
  y: number,
  radius: number,
  wanted: (uid: number) => boolean,
): number {
  let uid = hitAt(idMap, x, y);
  if (uid >= 0 && wanted(uid)) return uid;
  for (const f of [0.5, 1]) {
    for (const [cx, cy] of RING) {
      uid = hitAt(idMap, x + cx * radius * f, y + cy * radius * f);
      if (uid >= 0 && wanted(uid)) return uid;
    }
  }
  return -1;
}
