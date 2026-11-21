// PLAY-7: a ring about 12% of the world's width that contains one unfound target, but is not
// centred on it, so the hint narrows the search without giving the answer away.
import { PLAY } from '../config';

export interface HintRing {
  x: number;
  y: number;
  r: number;
}

/** `u`, `v` in [0,1) choose the offset; pass Math.random() in the app, fixed values in tests. */
export function hintRing(
  tx: number,
  ty: number,
  targetSize: number,
  worldW: number,
  worldH: number,
  u: number,
  v: number,
): HintRing {
  const r = (worldW * PLAY.hintRingFraction) / 2;
  // keep the whole target inside: offset by up to (r - target radius), at least a quarter of r
  const maxOff = Math.max(0, r - targetSize * 0.6);
  const off = Math.min(maxOff, r * 0.25 + u * (maxOff - r * 0.25));
  const a = v * Math.PI * 2;
  let x = tx + Math.cos(a) * off;
  let y = ty + Math.sin(a) * off;
  x = Math.max(r * 0.4, Math.min(worldW - r * 0.4, x));
  y = Math.max(r * 0.4, Math.min(worldH - r * 0.4, y));
  // near an edge the clamp can push the ring off the target; fall back to keeping it inside
  if ((x - tx) * (x - tx) + (y - ty) * (y - ty) > maxOff * maxOff) {
    x = tx + Math.cos(a) * maxOff * 0.5;
    y = ty + Math.sin(a) * maxOff * 0.5;
  }
  return { x, y, r };
}

/** PLAY-5: three misses inside two seconds. */
export function shouldLock(
  missTimes: readonly number[],
  t: number,
  count: number,
  windowMs: number,
): boolean {
  return missTimes.filter((m) => t - m <= windowMs).length >= count;
}
