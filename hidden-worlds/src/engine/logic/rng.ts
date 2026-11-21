// Seeded random numbers. xmur3 and mulberry32 are kept bit-for-bit from the prototype (ENG-5).

export function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Rng {
  (): number;
  range(a: number, b: number): number;
  int(n: number): number;
  pick<T>(arr: readonly T[]): T;
  chance(p: number): boolean;
  shuffle<T>(arr: readonly T[]): T[];
  weighted<T extends { w: number }>(items: readonly T[]): T;
}

export function makeRng(seed: string): Rng {
  const r = mulberry32(xmur3(seed)()) as Rng;
  r.range = (a, b) => a + (b - a) * r();
  r.int = (n) => Math.floor(r() * n);
  r.pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)] as T;
  r.chance = (p) => r() < p;
  r.shuffle = <T>(arr: readonly T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = a[i] as T;
      a[i] = a[j] as T;
      a[j] = t;
    }
    return a;
  };
  r.weighted = <T extends { w: number }>(items: readonly T[]): T => {
    let total = 0;
    for (const it of items) total += it.w;
    let x = r() * total;
    for (const it of items) {
      if ((x -= it.w) <= 0) return it;
    }
    return items[items.length - 1] as T;
  };
  return r;
}
