// The built-in placeholder art, ported from the prototype's sprite library and extended for
// three worlds. Every sprite is drawn in a 112 x 112 unit box centred on 0,0. Shapes are
// plain data so the same definitions draw in the browser and in Node (pack build tool).

export type Geo =
  | ['circ', number, number, number]
  | ['ell', number, number, number, number, number?]
  | ['rr', number, number, number, number, number?]
  | ['poly', ...number[]]
  | ['line', ...number[]]
  | ['arc', number, number, number, number, number]
  | ['svg', string];

/** f: 'body' | 'dark' | 'light' | hex | null. s: outlined. w: outline weight. */
export interface Shape {
  g: Geo;
  f: string | null;
  s: boolean;
  w: number;
}

export interface VectorDef {
  id: string;
  kind: 'small' | 'occluder' | 'sky' | 'resident';
  name: string;
  shapes: Shape[];
  /** Ground point below the box centre, as a fraction of the 100-unit prototype size. */
  base: number;
  /** World pixels at size multiplier 1, for the prototype's 100-unit box. */
  size: number;
  skyOk?: boolean;
  tints?: string[];
  weight?: number;
  /** Residents only. */
  color?: string;
  rarity?: 'common' | 'uncommon' | 'rare';
  description?: string;
  allowRotate?: boolean;
}

export const UNIT_BOX = 112;
export const INK = '#22302a';
export const LEAF = '#58a844';

const F = (g: Geo, f: string | null, s?: boolean): Shape => ({ g, f, s: s !== false, w: 1 });
const L = (g: Geo, w?: number): Shape => ({ g, f: null, s: true, w: w ?? 1 });
// union: overlapping shapes that read as one silhouette with a single outline
const U = (f: string, ...gs: Geo[]): Shape[] => [
  ...gs.map((g): Shape => ({ g, f: null, s: true, w: 2 })),
  ...gs.map((g): Shape => ({ g, f, s: false, w: 1 })),
];
const circ = (x: number, y: number, r: number): Geo => ['circ', x, y, r];
const ell = (x: number, y: number, rx: number, ry: number, rot?: number): Geo => [
  'ell',
  x,
  y,
  rx,
  ry,
  rot ?? 0,
];
const rr = (x: number, y: number, w: number, h: number, r?: number): Geo => ['rr', x, y, w, h, r ?? 0];
const poly = (...a: number[]): Geo => ['poly', ...a];
const line = (...a: number[]): Geo => ['line', ...a];
const svg = (d: string): Geo => ['svg', d];
const starPts = (ro: number, ri: number) => {
  const a: number[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const t = -Math.PI / 2 + (i * Math.PI) / 5;
    a.push(Math.cos(t) * r, Math.sin(t) * r);
  }
  return a;
};

type SmallSrc = { id: string; name: string; sky?: boolean; shapes: Shape[] };
const SMALL: SmallSrc[] = [
  {
    id: 'key',
    name: 'key',
    shapes: [
      F(rr(-10, -5, 52, 10, 3), 'body'),
      F(rr(24, 3, 8, 13, 2), 'body'),
      F(rr(35, 3, 7, 10, 2), 'body'),
      F(circ(-24, 0, 17), 'body'),
      F(circ(-24, 0, 7), 'dark'),
    ],
  },
  { id: 'star', name: 'star', sky: true, shapes: [F(poly(...starPts(44, 19)), 'body')] },
  {
    id: 'heart',
    name: 'heart',
    shapes: [
      F(
        svg('M0,36 C-52,2 -44,-38 -20,-38 C-8,-38 0,-30 0,-20 C0,-30 8,-38 20,-38 C44,-38 52,2 0,36 Z'),
        'body',
      ),
      F(ell(-18, -20, 6, 9, -0.5), 'light', false),
    ],
  },
  {
    id: 'fish',
    name: 'fish',
    shapes: [
      F(poly(18, 0, 44, -20, 44, 20), 'body'),
      F(poly(-8, -16, 6, -32, 12, -14), 'body'),
      F(ell(-6, 0, 30, 19), 'body'),
      F(circ(-20, -4, 3.6), INK, false),
    ],
  },
  {
    id: 'mushroom',
    name: 'mushroom',
    shapes: [
      F(rr(-10, -2, 20, 38, 8), 'light'),
      F(svg('M-42,4 C-42,-44 42,-44 42,4 Z'), 'body'),
      F(circ(-16, -16, 6), 'light', false),
      F(circ(12, -12, 5), 'light', false),
      F(circ(-2, -28, 4), 'light', false),
    ],
  },
  {
    id: 'leaf',
    name: 'leaf',
    shapes: [
      F(svg('M0,-44 C32,-26 32,22 0,44 C-32,22 -32,-26 0,-44 Z'), 'body'),
      L(line(0, -34, 0, 36)),
      L(line(0, -8, 14, -18)),
      L(line(0, 10, -14, 0)),
    ],
  },
  {
    id: 'moon',
    name: 'moon',
    sky: true,
    shapes: [F(svg('M10,-42 A42,42 0 1,0 10,42 A50,50 0 0,1 10,-42 Z'), 'body')],
  },
  {
    id: 'cup',
    name: 'cup',
    shapes: [
      F(ell(0, 34, 38, 7), 'light'),
      F(circ(30, 2, 13), 'body'),
      F(circ(30, 2, 6), 'dark'),
      F(svg('M-30,-20 L30,-20 L24,22 C22,32 -22,32 -24,22 Z'), 'body'),
      F(rr(-31, -25, 62, 8, 4), 'light'),
    ],
  },
  {
    id: 'hat',
    name: 'top hat',
    shapes: [
      F(ell(0, 28, 44, 10), 'dark'),
      F(rr(-25, -38, 50, 64, 5), 'body'),
      F(rr(-25, 8, 50, 11, 0), 'light'),
    ],
  },
  {
    id: 'boot',
    name: 'boot',
    shapes: [
      F(svg('M-20,-42 L10,-42 L10,6 C30,6 42,14 42,28 L42,34 L-20,34 Z'), 'body'),
      F(rr(-23, 30, 68, 10, 4), 'dark'),
      F(rr(-23, -45, 36, 9, 3), 'light'),
    ],
  },
  {
    id: 'bell',
    name: 'bell',
    shapes: [
      F(circ(0, -38, 6), 'body'),
      F(circ(0, 34, 7), 'dark'),
      F(svg('M-30,20 C-30,-12 -22,-36 0,-36 C22,-36 30,-12 30,20 L38,28 L-38,28 Z'), 'body'),
      L(line(-25, 14, 25, 14)),
    ],
  },
  {
    id: 'kite',
    name: 'kite',
    sky: true,
    shapes: [
      F(poly(0, -46, 28, -10, 0, 30, -28, -10), 'body'),
      L(line(0, -46, 0, 30)),
      L(line(-28, -10, 28, -10)),
      L(svg('M0,30 C-8,36 10,40 2,47')),
    ],
  },
  {
    id: 'umbrella',
    name: 'umbrella',
    shapes: [
      L(svg('M0,-4 L0,34 Q0,44 -10,42'), 1.4),
      F(svg('M-42,0 C-42,-48 42,-48 42,0 Q28,-10 14,0 Q0,-10 -14,0 Q-28,-10 -42,0 Z'), 'body'),
      L(svg('M-14,0 Q-10,-28 0,-36')),
      L(svg('M14,0 Q10,-28 0,-36')),
    ],
  },
  {
    id: 'apple',
    name: 'apple',
    shapes: [
      F(
        svg('M0,-18 C-14,-34 -42,-22 -38,8 C-36,30 -16,44 0,36 C16,44 36,30 38,8 C42,-22 14,-34 0,-18 Z'),
        'body',
      ),
      L(svg('M0,-18 Q2,-32 10,-38'), 1.3),
      F(ell(18, -33, 10, 5, -0.5), LEAF),
      F(ell(-18, -2, 5, 9, 0.3), 'light', false),
    ],
  },
  {
    id: 'carrot',
    name: 'carrot',
    shapes: [
      F(ell(4, -32, 6, 14, 0.4), LEAF),
      F(ell(14, -27, 6, 13, 0.95), LEAF),
      F(ell(-7, -33, 6, 13, -0.15), LEAF),
      F(svg('M-16,-20 C-4,-30 18,-22 20,-12 C10,10 -10,34 -24,44 C-28,24 -26,-4 -16,-20 Z'), 'body'),
      L(line(-10, -6, 0, -4)),
      L(line(-14, 10, -6, 12)),
    ],
  },
  {
    id: 'candle',
    name: 'candle',
    shapes: [
      F(rr(-18, 36, 36, 9, 3), 'dark'),
      F(rr(-12, -12, 24, 50, 3), 'body'),
      L(line(0, -18, 0, -12)),
      F(svg('M0,-46 C11,-33 9,-20 0,-18 C-9,-20 -11,-33 0,-46 Z'), '#f8b93a'),
    ],
  },
  {
    id: 'book',
    name: 'book',
    shapes: [
      F(rr(-27, -36, 54, 72, 5), 'body'),
      F(rr(-27, -36, 12, 72, 3), 'dark'),
      F(rr(-6, -22, 24, 14, 2), 'light'),
    ],
  },
  {
    id: 'lantern',
    name: 'lantern',
    shapes: [
      L(['arc', 0, -40, 6, Math.PI, 0]),
      F(rr(-15, -38, 30, 8, 2), 'dark'),
      F(rr(-22, -30, 44, 56, 8), 'body'),
      F(rr(-13, -20, 26, 36, 5), '#fdeaa8'),
      F(rr(-18, 26, 36, 9, 2), 'dark'),
    ],
  },
  {
    id: 'balloon',
    name: 'balloon',
    sky: true,
    shapes: [
      L(svg('M0,31 Q8,38 0,46')),
      F(poly(-5, 24, 5, 24, 0, 32), 'body'),
      F(ell(0, -10, 28, 34), 'body'),
      F(ell(-10, -22, 6, 10, -0.4), 'light', false),
    ],
  },
  {
    id: 'bottle',
    name: 'bottle',
    shapes: [
      F(rr(-8, -48, 16, 8, 2), '#b98b5e'),
      F(rr(-7, -42, 14, 22, 3), 'body'),
      F(rr(-18, -24, 36, 68, 10), 'body'),
      F(rr(-18, -2, 36, 20, 0), 'light'),
    ],
  },
  {
    id: 'flag',
    name: 'flag',
    shapes: [
      F(rr(-32, -46, 6, 92, 3), '#8a6a4a'),
      F(svg('M-26,-42 L34,-34 L20,-20 L34,-6 L-26,-6 Z'), 'body'),
    ],
  },
  {
    id: 'anchor',
    name: 'anchor',
    shapes: [
      F(
        svg('M-36,8 C-36,34 -16,44 0,44 C16,44 36,34 36,8 L26,14 C24,26 12,33 0,33 C-12,33 -24,26 -26,14 Z'),
        'body',
      ),
      F(rr(-5, -28, 10, 66, 3), 'body'),
      F(rr(-20, -22, 40, 8, 3), 'body'),
      F(circ(0, -36, 9), 'body'),
      F(circ(0, -36, 3.5), 'dark', false),
    ],
  },
  {
    id: 'acorn',
    name: 'acorn',
    shapes: [
      F(svg('M-24,-6 C-24,30 -8,44 0,44 C8,44 24,30 24,-6 Z'), 'body'),
      F(rr(-3, -38, 6, 12, 2), 'dark'),
      F(svg('M-30,-4 C-30,-32 30,-32 30,-4 Z'), 'dark'),
    ],
  },
  {
    id: 'feather',
    name: 'feather',
    sky: true,
    shapes: [
      F(svg('M-6,44 C-32,10 -22,-30 6,-46 C32,-20 26,14 -6,44 Z'), 'body'),
      L(line(-12, 48, 4, -36)),
      L(line(-4, 8, 12, -2)),
      L(line(-8, 24, 6, 16)),
    ],
  },
  {
    id: 'shell',
    name: 'shell',
    shapes: [
      F(poly(-10, 32, 10, 32, 7, 42, -7, 42), 'body'),
      F(svg('M0,34 L-36,-4 C-36,-30 -14,-42 0,-42 C14,-42 36,-30 36,-4 Z'), 'body'),
      L(line(0, 34, 0, -40)),
      L(line(0, 34, -18, -34)),
      L(line(0, 34, 18, -34)),
      L(line(0, 34, -31, -18)),
      L(line(0, 34, 31, -18)),
    ],
  },
  {
    id: 'envelope',
    name: 'envelope',
    shapes: [F(rr(-38, -26, 76, 52, 4), 'body'), L(line(-37, -24, 0, 6, 37, -24)), F(circ(0, 6, 5), 'light')],
  },
  {
    id: 'crown',
    name: 'crown',
    shapes: [
      F(svg('M-36,26 L-42,-22 L-18,0 L0,-36 L18,0 L42,-22 L36,26 Z'), 'body'),
      F(rr(-36, 16, 72, 12, 3), 'dark'),
      F(circ(0, 22, 4), 'light', false),
      F(circ(-20, 22, 3), 'light', false),
      F(circ(20, 22, 3), 'light', false),
    ],
  },
  {
    id: 'tulip',
    name: 'tulip',
    shapes: [
      F(rr(-3, 0, 6, 46, 3), LEAF),
      F(ell(-13, 28, 13, 5, 0.6), LEAF),
      F(svg('M-22,-38 L-10,-24 L0,-40 L10,-24 L22,-38 C26,-8 14,6 0,6 C-14,6 -26,-8 -22,-38 Z'), 'body'),
    ],
  },
  {
    id: 'bone',
    name: 'bone',
    shapes: U(
      'body',
      circ(-30, -9, 9),
      circ(-30, 9, 9),
      circ(30, -9, 9),
      circ(30, 9, 9),
      rr(-30, -7, 60, 14, 4),
    ),
  },
  {
    id: 'pumpkin',
    name: 'pumpkin',
    shapes: [
      F(rr(-5, -36, 10, 16, 3), LEAF),
      F(ell(0, 6, 40, 31), 'body'),
      L(ell(0, 6, 20, 31)),
      L(line(0, -25, 0, 37)),
    ],
  },
  {
    id: 'button',
    name: 'button',
    shapes: [
      F(circ(0, 0, 38), 'body'),
      L(circ(0, 0, 27)),
      F(circ(-9, -9, 4.5), 'dark', false),
      F(circ(9, -9, 4.5), 'dark', false),
      F(circ(-9, 9, 4.5), 'dark', false),
      F(circ(9, 9, 4.5), 'dark', false),
    ],
  },
  {
    id: 'gem',
    name: 'gem',
    shapes: [
      F(poly(-38, -8, -18, -32, 18, -32, 38, -8, 0, 42), 'body'),
      F(poly(-18, -32, -9, -8, -38, -8), 'light', false),
      F(poly(18, -32, 9, -8, -9, -8, -18, -32), 'light', false),
      L(poly(-38, -8, -18, -32, 18, -32, 38, -8, 0, 42)),
      L(line(-38, -8, 38, -8)),
      L(line(-18, -32, -9, -8, 0, 42)),
      L(line(18, -32, 9, -8, 0, 42)),
    ],
  },
  {
    id: 'boat',
    name: 'sailboat',
    shapes: [
      F(poly(2, -42, 2, 6, 32, 6), 'light'),
      F(poly(-4, -28, -4, 6, -28, 6), 'light'),
      F(svg('M-42,10 L42,10 L26,34 L-26,34 Z'), 'body'),
    ],
  },
];

type OccSrc = Omit<VectorDef, 'kind' | 'name'> & { name: string };
const OCC: OccSrc[] = [
  // meadow (from the prototype)
  {
    id: 'tree',
    name: 'Tree',
    weight: 4,
    size: 250,
    base: 0.48,
    tints: ['#4f9d4a', '#3f8f5a', '#6aaa3f', '#e0903a'],
    shapes: [F(rr(-7, 8, 14, 40, 4), '#8a6a4a')].concat(
      U('body', circ(-18, -6, 24), circ(18, -6, 24), circ(0, -24, 26), circ(0, 4, 22)),
      [F(circ(-10, -24, 4), 'light', false), F(circ(14, -8, 3), 'light', false)],
    ),
  },
  {
    id: 'pine',
    name: 'Pine',
    weight: 3,
    size: 260,
    base: 0.48,
    tints: ['#2f7d5b', '#3b8a52', '#2b6f6a'],
    shapes: [F(rr(-6, 32, 12, 16, 2), '#7a5a3e')].concat(
      U('body', poly(0, -48, 24, -16, -24, -16), poly(0, -30, 31, 8, -31, 8), poly(0, -8, 38, 34, -38, 34)),
    ),
  },
  {
    id: 'bush',
    name: 'Bush',
    weight: 4,
    size: 140,
    base: 0.44,
    tints: ['#6bb04f', '#58a35f', '#86b84a'],
    shapes: U(
      'body',
      circ(-22, 16, 20),
      circ(0, 4, 25),
      circ(22, 16, 20),
      circ(-6, 24, 20),
      circ(8, 24, 20),
    ).concat([
      F(circ(-12, 6, 3.2), '#dd4b39', false),
      F(circ(10, 14, 3.2), '#dd4b39', false),
      F(circ(2, -6, 3.2), '#dd4b39', false),
    ]),
  },
  {
    id: 'rock',
    name: 'Rock',
    weight: 3,
    size: 130,
    base: 0.3,
    tints: ['#a9b0a6', '#b9b2a1', '#98a3a8'],
    shapes: [
      F(svg('M-42,30 L-32,-8 L-8,-28 L22,-20 L42,8 L38,30 Z'), 'body'),
      F(poly(-32, -8, -8, -28, 2, 4), 'light', false),
      L(line(-8, -28, 2, 4, 38, 30)),
      L(line(2, 4, -32, -8)),
    ],
  },
  {
    id: 'cottage',
    name: 'Cottage',
    weight: 1.5,
    size: 290,
    base: 0.4,
    tints: ['#c0563f', '#3f6aa8', '#8a5a9c', '#d08a2e'],
    shapes: [
      F(rr(16, -40, 10, 24, 1), '#9c6b4f'),
      F(rr(-32, -8, 64, 48, 2), '#f3e6c8'),
      F(poly(-44, -6, 0, -44, 44, -6), 'body'),
      F(rr(-9, 14, 18, 26, 3), '#7b5a3c'),
      F(rr(14, 4, 14, 14, 2), '#bfe3f2'),
      F(rr(-28, 4, 14, 14, 2), '#bfe3f2'),
    ],
  },
  {
    id: 'tent',
    name: 'Tent',
    weight: 1,
    size: 200,
    base: 0.36,
    tints: ['#f08a24', '#3a6fd8', '#dd4b39', '#1fa39a'],
    shapes: [
      L(line(0, -36, 0, -45)),
      F(poly(-42, 36, 0, -36, 42, 36), 'body'),
      F(poly(-11, 36, 0, 2, 11, 36), 'dark'),
    ],
  },
  {
    id: 'haystack',
    name: 'Haystack',
    weight: 1.5,
    size: 180,
    base: 0.36,
    tints: ['#e8c95a', '#dcb848'],
    shapes: [
      F(svg('M-38,36 C-38,-22 -12,-38 0,-38 C12,-38 38,-22 38,36 Z'), 'body'),
      L(line(-14, -10, -18, 20)),
      L(line(8, -16, 12, 18)),
      L(line(-2, 6, -4, 30)),
    ],
  },
  {
    id: 'fence',
    name: 'Fence',
    weight: 1.5,
    size: 230,
    base: 0.32,
    tints: ['#b98f62', '#c9a77a'],
    shapes: [
      F(rr(-44, -2, 88, 7, 2), 'body'),
      F(rr(-44, 14, 88, 7, 2), 'body'),
      F(rr(-40, -14, 9, 46, 2), 'body'),
      F(rr(-5, -14, 9, 46, 2), 'body'),
      F(rr(31, -14, 9, 46, 2), 'body'),
    ],
  },
  {
    id: 'log',
    name: 'Log',
    weight: 1.5,
    size: 170,
    base: 0.14,
    tints: ['#9a714b', '#8a6444'],
    shapes: [
      F(rr(-42, -14, 84, 28, 14), 'body'),
      F(ell(32, 0, 9, 13), 'light'),
      L(line(-28, -4, -6, -4)),
      L(line(-18, 5, 8, 5)),
    ],
  },
  // harbour
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    weight: 0.5,
    size: 360,
    base: 0.46,
    tints: ['#f3efe6'],
    shapes: [
      F(poly(-17, 46, 17, 46, 11, -22, -11, -22), 'body'),
      F(poly(-15.5, 32, 15.5, 32, 14.4, 22, -14.4, 22), '#dd4b39', false),
      F(poly(-13.4, 12, 13.4, 12, 12.4, 2, -12.4, 2), '#dd4b39', false),
      F(poly(-11.8, -8, 11.8, -8, 11, -16, -11, -16), '#dd4b39', false),
      L(poly(-17, 46, 17, 46, 11, -22, -11, -22)),
      F(rr(-16, -25, 32, 5, 2), 'dark'),
      F(rr(-9, -38, 18, 13, 2), '#fdeaa8'),
      F(poly(-13, -38, 0, -50, 13, -38), '#dd4b39'),
      F(rr(-5, 32, 10, 14, 2), '#5a4535'),
    ],
  },
  {
    id: 'crates',
    name: 'Crates',
    weight: 3,
    size: 160,
    base: 0.44,
    tints: ['#c9a26b', '#b88f5a', '#a8804e'],
    shapes: [
      F(rr(-42, 4, 40, 40, 2), 'body'),
      L(line(-42, 4, -2, 44)),
      L(line(-2, 4, -42, 44)),
      F(rr(2, 4, 40, 40, 2), 'body'),
      L(line(2, 4, 42, 44)),
      L(line(42, 4, 2, 44)),
      F(rr(-20, -36, 40, 40, 2), 'light'),
      L(line(-20, -36, 20, 4)),
      L(line(20, -36, -20, 4)),
    ],
  },
  {
    id: 'dinghy',
    name: 'Rowing boat',
    weight: 2,
    size: 230,
    base: 0.28,
    tints: ['#3a6fd8', '#dd4b39', '#1fa39a', '#f3e6c8'],
    shapes: [
      F(svg('M-46,-2 L46,-2 Q44,22 30,28 L-30,28 Q-44,22 -46,-2 Z'), 'body'),
      F(rr(-46, -4, 92, 7, 3), 'light'),
      L(line(-24, 2, -24, 26)),
      L(line(24, 2, 24, 26)),
      F(rr(-36, -16, 6, 16, 2), '#8a6a4a'),
      F(rr(30, -14, 6, 14, 2), '#8a6a4a'),
    ],
  },
  {
    id: 'netrack',
    name: 'Fishing nets',
    weight: 2,
    size: 220,
    base: 0.44,
    tints: ['#7d9a8a', '#a0866a', '#8aa0a8'],
    shapes: [
      F(rr(-42, -36, 7, 80, 2), '#8a6a4a'),
      F(rr(35, -36, 7, 80, 2), '#8a6a4a'),
      F(rr(-44, -38, 88, 7, 2), '#9a714b'),
      F(svg('M-34,-30 L34,-30 L30,30 Q0,40 -30,30 Z'), 'body'),
      L(line(-17, -30, -14, 33)),
      L(line(0, -30, 0, 36)),
      L(line(17, -30, 14, 33)),
      L(line(-33, -12, 33, -12)),
      L(line(-32, 8, 32, 8)),
      F(circ(-20, 36, 5), '#f08a24'),
      F(circ(22, 34, 5), '#f08a24'),
    ],
  },
  {
    id: 'boathouse',
    name: 'Boathouse',
    weight: 1.5,
    size: 300,
    base: 0.44,
    tints: ['#6d8ea8', '#b04a3a', '#d9c59a', '#4f8a7a'],
    shapes: [
      F(rr(-40, -12, 80, 56, 2), 'body'),
      F(poly(-46, -10, 0, -40, 46, -10), 'dark'),
      F(rr(-16, 8, 32, 36, 2), '#5a4535'),
      L(line(0, 8, 0, 44)),
      F(rr(-34, -2, 12, 12, 2), '#bfe3f2'),
      F(rr(22, -2, 12, 12, 2), '#bfe3f2'),
      F(circ(0, -20, 6), '#f3efe6'),
    ],
  },
  {
    id: 'pilings',
    name: 'Pilings',
    weight: 2,
    size: 180,
    base: 0.44,
    tints: ['#8a6444', '#9a714b'],
    shapes: [
      F(rr(-36, -16, 16, 60, 4), 'body'),
      F(rr(-8, -34, 16, 78, 4), 'body'),
      F(rr(20, -8, 16, 52, 4), 'body'),
      F(ell(-28, -16, 8, 3), 'light'),
      F(ell(0, -34, 8, 3), 'light'),
      F(ell(28, -8, 8, 3), 'light'),
      L(svg('M-28,0 Q-14,12 0,-4 Q14,10 28,6'), 1.6),
    ],
  },
  // night market
  {
    id: 'stall',
    name: 'Market stall',
    weight: 3,
    size: 270,
    base: 0.44,
    tints: ['#dd4b39', '#1fa39a', '#f08a24', '#3a6fd8'],
    shapes: [
      F(rr(-40, -30, 5, 40, 1), '#8a6a4a'),
      F(rr(35, -30, 5, 40, 1), '#8a6a4a'),
      F(rr(-44, 4, 88, 40, 3), '#9a714b'),
      F(rr(-44, 4, 88, 8, 2), '#b98f62'),
      F(circ(-28, 0, 7), '#f08a24'),
      F(circ(-14, 0, 7), '#dd4b39'),
      F(circ(16, 0, 7), '#f4c430'),
      F(circ(30, 0, 7), '#57a639'),
      F(
        svg(
          'M-48,-28 L-36,-46 L36,-46 L48,-28 Q42,-20 36,-28 Q30,-20 24,-28 Q18,-20 12,-28 Q6,-20 0,-28 Q-6,-20 -12,-28 Q-18,-20 -24,-28 Q-30,-20 -36,-28 Q-42,-20 -48,-28 Z',
        ),
        'body',
      ),
      F(poly(-24, -46, -12, -46, -12, -28, -24, -28), 'light', false),
      F(poly(12, -46, 24, -46, 24, -28, 12, -28), 'light', false),
    ],
  },
  {
    id: 'barrels',
    name: 'Barrels',
    weight: 3,
    size: 165,
    base: 0.44,
    tints: ['#9a6a3e', '#8a5a34', '#a8784a'],
    shapes: [
      F(rr(-42, 0, 40, 44, 12), 'body'),
      L(line(-42, 12, -2, 12)),
      L(line(-42, 32, -2, 32)),
      F(rr(2, 0, 40, 44, 12), 'body'),
      L(line(2, 12, 42, 12)),
      L(line(2, 32, 42, 32)),
      F(rr(-20, -40, 40, 44, 12), 'body'),
      L(line(-20, -28, 20, -28)),
      L(line(-20, -8, 20, -8)),
    ],
  },
  {
    id: 'cart',
    name: 'Cart',
    weight: 2,
    size: 230,
    base: 0.44,
    tints: ['#3a6fd8', '#c0563f', '#4f8a7a'],
    shapes: [
      L(line(30, -6, 48, -22), 2),
      F(ell(-14, -14, 18, 14), '#d9c59a'),
      F(ell(12, -16, 18, 15), '#cdb98a'),
      F(ell(-2, -26, 14, 11), '#e6d6a8'),
      F(rr(-44, -8, 76, 26, 3), 'body'),
      F(circ(-24, 30, 14), '#5a4535'),
      F(circ(-24, 30, 4), '#b98f62', false),
      F(circ(16, 30, 14), '#5a4535'),
      F(circ(16, 30, 4), '#b98f62', false),
    ],
  },
  {
    id: 'well',
    name: 'Well',
    weight: 1.5,
    size: 230,
    base: 0.44,
    tints: ['#c0563f', '#3f6aa8', '#4f8a7a'],
    shapes: [
      F(rr(-30, -26, 6, 40, 1), '#8a6a4a'),
      F(rr(24, -26, 6, 40, 1), '#8a6a4a'),
      F(poly(-40, -24, 0, -48, 40, -24), 'body'),
      F(rr(-36, 4, 72, 40, 6), '#a9b0a6'),
      L(line(-36, 18, 36, 18)),
      L(line(-36, 31, 36, 31)),
      L(line(-12, 4, -12, 18)),
      L(line(14, 18, 14, 31)),
      L(line(-4, 31, -4, 44)),
      F(rr(-38, 0, 76, 8, 3), '#b9b2a1'),
    ],
  },
  {
    id: 'kiosk',
    name: 'Kiosk',
    weight: 1,
    size: 280,
    base: 0.44,
    tints: ['#1fa39a', '#dd4b39', '#f08a24'],
    shapes: [
      L(line(0, -40, 0, -50)),
      F(poly(1, -50, 12, -47, 1, -44), '#f4c430'),
      F(rr(-28, -14, 56, 58, 3), '#f3e6c8'),
      F(svg('M-36,-12 C-36,-40 36,-40 36,-12 Z'), 'body'),
      F(rr(-36, -14, 72, 6, 2), 'dark'),
      F(rr(-20, 0, 40, 18, 2), '#fdeaa8'),
      F(rr(-30, 24, 60, 20, 2), 'body'),
    ],
  },
];

// residents: one body, a head feature per character, and anything worn on top
const resBody = (): Shape[] => [
  F(ell(-10, 34, 9, 5), 'dark'),
  F(ell(10, 34, 9, 5), 'dark'),
  F(svg('M-24,32 C-31,0 -22,-27 0,-27 C22,-27 31,0 24,32 Z'), 'body'),
  F(ell(0, 14, 12, 12), 'light', false),
  F(circ(-8, -7, 3.4), INK, false),
  F(circ(8, -7, 3.4), INK, false),
];
interface ResSrc {
  id: string;
  name: string;
  color: string;
  rarity: 'common' | 'uncommon' | 'rare';
  description: string;
  feature: Shape[];
  after: Shape[];
}
const RES: ResSrc[] = [
  // meadow
  {
    id: 'mossy',
    name: 'Mossy',
    color: '#6aa84f',
    rarity: 'common',
    description: 'Sleeps under ferns. Collects buttons.',
    feature: [L(line(0, -26, 0, -38)), F(ell(9, -41, 10, 5, -0.5), LEAF)],
    after: [],
  },
  {
    id: 'bram',
    name: 'Bram',
    color: '#b07a52',
    rarity: 'common',
    description: 'Keeps a tidy burrow and an untidy hat.',
    feature: [F(poly(-17, -20, -23, -42, -7, -26), 'light'), F(poly(17, -20, 23, -42, 7, -26), 'light')],
    after: [],
  },
  {
    id: 'tuck',
    name: 'Tuck',
    color: '#ef8e2f',
    rarity: 'uncommon',
    description: 'Wears a top hat to every picnic.',
    feature: [],
    after: [F(rr(-18, -31, 36, 6, 3), 'dark'), F(rr(-11, -48, 22, 19, 3), 'dark')],
  },
  {
    id: 'wren',
    name: 'Wren',
    color: '#8f5fd0',
    rarity: 'rare',
    description: 'Hums to the bees. Seldom seen before noon.',
    feature: [F(poly(-23, -16, -15, -44, -3, -24), 'body'), F(poly(23, -16, 15, -44, 3, -24), 'body')],
    after: [],
  },
  // harbour
  {
    id: 'odo',
    name: 'Odo',
    color: '#4f86d9',
    rarity: 'common',
    description: 'Counts the boats every morning, twice.',
    feature: [F(circ(-18, -24, 9), 'body'), F(circ(18, -24, 9), 'body')],
    after: [],
  },
  {
    id: 'fen',
    name: 'Fen',
    color: '#22a79c',
    rarity: 'common',
    description: 'Listens to the tide through two long feelers.',
    feature: [
      L(line(-8, -26, -14, -42)),
      L(line(8, -26, 14, -42)),
      F(circ(-14, -44, 4.5), '#f4c430'),
      F(circ(14, -44, 4.5), '#f4c430'),
    ],
    after: [],
  },
  {
    id: 'marlo',
    name: 'Marlo',
    color: '#5d7f99',
    rarity: 'uncommon',
    description: 'Retired sailor. Still salutes the lighthouse.',
    feature: [],
    after: [
      F(svg('M-22,-24 C-22,-40 22,-40 22,-24 Z'), '#f3efe6'),
      F(rr(-24, -27, 48, 6, 3), '#1d3557'),
      F(circ(0, -34, 3), '#dd4b39', false),
    ],
  },
  {
    id: 'sol',
    name: 'Sol',
    color: '#f0c02e',
    rarity: 'rare',
    description: 'Arrives with the sunrise. Leaves no footprints.',
    feature: [],
    after: [F(rr(14, 4, 9, 22, 3), '#dd4b39'), F(rr(-23, 0, 46, 9, 4), '#dd4b39')],
  },
  // night market
  {
    id: 'juno',
    name: 'Juno',
    color: '#ef7fa9',
    rarity: 'common',
    description: 'Ties bows on everything that stands still.',
    feature: [],
    after: [
      F(poly(0, -30, -17, -42, -17, -20), '#f07fa8'),
      F(poly(0, -30, 17, -42, 17, -20), '#f07fa8'),
      F(circ(0, -30, 4.5), '#f07fa8'),
    ],
  },
  {
    id: 'pip',
    name: 'Pip',
    color: '#c9874a',
    rarity: 'common',
    description: 'Big ears, bigger appetite. Loves the pie stall.',
    feature: [
      F(ell(-24, -18, 12, 16, -0.5), 'body'),
      F(ell(24, -18, 12, 16, 0.5), 'body'),
      F(ell(-24, -18, 6, 9, -0.5), 'light', false),
      F(ell(24, -18, 6, 9, 0.5), 'light', false),
    ],
    after: [L(line(-12, 0, -30, -4)), L(line(-12, 4, -30, 6)), L(line(12, 0, 30, -4)), L(line(12, 4, 30, 6))],
  },
  {
    id: 'quill',
    name: 'Quill',
    color: '#7f8b54',
    rarity: 'uncommon',
    description: 'Writes the market gossip. Prickly about edits.',
    feature: U(
      'dark',
      poly(-22, -12, -26, -34, -12, -24),
      poly(-12, -22, -10, -44, 0, -26),
      poly(0, -26, 10, -44, 12, -22),
      poly(12, -24, 26, -34, 22, -12),
    ),
    after: [],
  },
  {
    id: 'nell',
    name: 'Nell',
    color: '#3f6aa8',
    rarity: 'rare',
    description: 'Lights the lanterns at dusk, one by one.',
    feature: [
      F(svg('M-31,34 C-37,4 -28,-26 0,-32 C28,-26 37,4 31,34 Z'), 'dark'),
      L(line(0, -32, 0, -40), 1.4),
      F(circ(0, -44, 6), '#fdeaa8'),
      F(circ(0, -44, 2.5), '#f8b93a', false),
    ],
    after: [],
  },
];

const CLOUD = U('body', circ(-24, 6, 18), circ(0, -6, 24), circ(24, 6, 18), rr(-38, 6, 76, 18, 9));

export const VECTOR_DEFS: VectorDef[] = [
  ...SMALL.map((s): VectorDef => ({
    id: s.id,
    kind: 'small',
    name: s.name,
    shapes: s.shapes,
    base: 0.42,
    size: 58,
    skyOk: !!s.sky,
    allowRotate: true,
  })),
  ...OCC.map((o): VectorDef => ({ ...o, kind: 'occluder', allowRotate: false })),
  {
    id: 'cloud',
    kind: 'sky',
    name: 'Cloud',
    shapes: CLOUD,
    base: 0,
    size: 260,
    tints: ['#ffffff', '#f4f8fb'],
    allowRotate: false,
  },
  {
    id: 'duskcloud',
    kind: 'sky',
    name: 'Cloud',
    shapes: CLOUD,
    base: 0,
    size: 260,
    tints: ['#f3b49a', '#d98f8a', '#8f86b4'],
    allowRotate: false,
  },
  ...RES.map((r): VectorDef => ({
    id: r.id,
    kind: 'resident',
    name: r.name,
    color: r.color,
    rarity: r.rarity,
    description: r.description,
    shapes: r.feature.concat(resBody(), r.after),
    base: 0.4,
    size: 64,
    allowRotate: false,
  })),
];
