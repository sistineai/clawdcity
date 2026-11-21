// Mask derivation shared by pack-build and pack-validate. A mask pixel covers a 2x2 block of
// source pixels and is solid when at least two of them have alpha >= 128.
export const ALPHA_SOLID = 128;

export function solidSource(alpha: (x: number, y: number) => number, w: number, h: number): Uint8Array {
  const s = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) s[y * w + x] = alpha(x, y) >= ALPHA_SOLID ? 1 : 0;
  return s;
}

export function halfMask(
  solid: Uint8Array,
  w: number,
  h: number,
): { w: number; h: number; bits: Uint8Array; n: number } {
  const mw = Math.ceil(w / 2);
  const mh = Math.ceil(h / 2);
  const bits = new Uint8Array(Math.ceil((mw * mh) / 8));
  let n = 0;
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      let c = 0;
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const sx = x * 2 + dx;
          const sy = y * 2 + dy;
          if (sx < w && sy < h) c += solid[sy * w + sx]!;
        }
      if (c >= 2) {
        const i = y * mw + x;
        bits[i >> 3]! |= 1 << (7 - (i & 7));
        n++;
      }
    }
  return { w: mw, h: mh, bits, n };
}

export function alphaOf(data: Uint8ClampedArray, w: number) {
  return (x: number, y: number) => data[(y * w + x) * 4 + 3]!;
}
