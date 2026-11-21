// Pure mask transforms (ENG-3). A sprite's stored mask is scaled, flipped and rotated
// into ID-map space with nearest-neighbour sampling. Rotation uses a fixed table whose
// sine and cosine are literal constants, so every JavaScript engine gets the same bits.

import type { MaskData, SpriteLogic } from './types';

export const ROT_STEP_RAD = 0.1;
export const ROT_MAX_STEP = 4;
/** sin and cos of k * 0.1 rad for k = 0..4. Negative steps mirror the sine. */
const SIN = [0, 0.09983341664682815, 0.19866933079506122, 0.29552020666133955, 0.3894183423086505];
const COS = [1, 0.9950041652780258, 0.9800665778412416, 0.955336489125606, 0.9210609940028851];

export function rotSinCos(step: number): [number, number] {
  const a = Math.abs(step);
  const s = SIN[a] ?? 0;
  const c = COS[a] ?? 1;
  return [step < 0 ? -s : s, c];
}

/** A transformed mask in ID-map pixels, one byte per pixel. */
export interface PlacedMask {
  w: number;
  h: number;
  /** Offset of the local origin relative to floor(centre). */
  dx: number;
  dy: number;
  data: Uint8Array;
  n: number;
}

const unpacked = new WeakMap<MaskData, Uint8Array>();
export function unpackMask(m: MaskData): Uint8Array {
  let u = unpacked.get(m);
  if (!u) {
    const n = m.w * m.h;
    u = new Uint8Array(n);
    for (let i = 0; i < n; i++) u[i] = (m.bits[i >> 3]! >> (7 - (i & 7))) & 1;
    unpacked.set(m, u);
  }
  return u;
}

export function countMask(m: MaskData): number {
  const u = unpackMask(m);
  let n = 0;
  for (let i = 0; i < u.length; i++) n += u[i]!;
  return n;
}

const CACHE_LIMIT = 3000;
let cache = new Map<string, PlacedMask>();
let cacheOwner: object | null = null;

/**
 * Transform a sprite mask for a given world size (longer side), rotation step and flip.
 * `idScale` is ID-map pixels per world pixel.
 */
export function placedMask(
  owner: object,
  sp: SpriteLogic,
  size: number,
  rotStep: number,
  flip: boolean,
  idScale: number,
): PlacedMask {
  if (owner !== cacheOwner) {
    cache = new Map();
    cacheOwner = owner;
  }
  const key = sp.id + '|' + size + '|' + rotStep + '|' + (flip ? 1 : 0);
  const hit = cache.get(key);
  if (hit) return hit;
  const pm = transform(sp, size, rotStep, flip, idScale);
  if (cache.size >= CACHE_LIMIT) cache.clear();
  cache.set(key, pm);
  return pm;
}

function transform(
  sp: SpriteLogic,
  size: number,
  rotStep: number,
  flip: boolean,
  idScale: number,
): PlacedMask {
  const m = sp.mask;
  const src = unpackMask(m);
  // ID-map pixels per mask pixel. The mask covers the full source image at half resolution.
  const longSide = Math.max(sp.w, sp.h);
  const sc = (size * idScale) / ((longSide * m.w) / sp.w);
  const hw = (m.w * sc) / 2;
  const hh = (m.h * sc) / 2;
  const [s, c] = rotSinCos(rotStep);
  const as = Math.abs(s);
  const bx = c * hw + as * hh;
  const by = as * hw + c * hh;
  const w = Math.floor(bx * 2) + 3;
  const h = Math.floor(by * 2) + 3;
  const cx = w / 2;
  const cy = h / 2;
  const data = new Uint8Array(w * h);
  let n = 0;
  const inv = 1 / sc;
  for (let y = 0; y < h; y++) {
    const py = y + 0.5 - cy;
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - cx;
      // inverse rotation into the sprite's own frame
      let u = c * px + s * py;
      const v = -s * px + c * py;
      if (flip) u = -u;
      const mx = Math.floor((u + hw) * inv);
      const my = Math.floor((v + hh) * inv);
      if (mx < 0 || my < 0 || mx >= m.w || my >= m.h) continue;
      if (src[my * m.w + mx]) {
        data[y * w + x] = 1;
        n++;
      }
    }
  }
  return { w, h, dx: -Math.floor(w / 2), dy: -Math.floor(h / 2), data, n };
}

export function clearMaskCache(): void {
  cache = new Map();
  cacheOwner = null;
}
