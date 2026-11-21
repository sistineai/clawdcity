/* Hidden Worlds: placement engine (prototype).
   Everything is deterministic from (seed, difficulty). The engine places every
   sprite itself, so it always knows where each one is and how much of it shows. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  // ---------- seeded random ----------
  function xmur3(str) {
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
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seed) {
    const r = mulberry32(xmur3(String(seed))());
    r.range = (a, b) => a + (b - a) * r();
    r.pick = arr => arr[Math.floor(r() * arr.length)];
    r.chance = p => r() < p;
    r.shuffle = arr => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    };
    r.weighted = items => {
      let total = 0;
      for (const it of items) total += it.w;
      let x = r() * total;
      for (const it of items) { if ((x -= it.w) <= 0) return it; }
      return items[items.length - 1];
    };
    return r;
  }

  // ---------- colour ----------
  const INK = '#22302a';
  const COLORS = {
    red: '#dd4b39', orange: '#f08a24', yellow: '#f4c430', green: '#57a639',
    teal: '#1fa39a', blue: '#3a6fd8', purple: '#8a55c8', pink: '#f07fa8'
  };
  const COLOR_NAMES = Object.keys(COLORS);
  const LEAF = '#58a844';
  function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(h1, h2, t) {
    const a = hexToRgb(h1), b = hexToRgb(h2);
    return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
  }
  const fillCache = new Map();
  function fillFor(f, color) {
    if (f === 'body') return color;
    if (f !== 'dark' && f !== 'light') return f;
    const key = f + color;
    let v = fillCache.get(key);
    if (!v) { v = f === 'dark' ? mix(color, '#1d2a24', 0.4) : mix(color, '#ffffff', 0.62); fillCache.set(key, v); }
    return v;
  }

  // ---------- placeholder sprite library ----------
  // Each sprite is drawn in a 100 x 100 box centred on 0,0. Shapes: {p, f, s, w}
  // p = path, f = fill ('body' | 'dark' | 'light' | hex | null), s = outlined, w = outline weight.
  let DEFS = null;
  function defs() { return DEFS || (DEFS = buildDefs()); }

  function buildDefs() {
    const P = fn => { const p = new Path2D(); fn(p); return p; };
    const circ = (x, y, r) => P(p => p.arc(x, y, r, 0, TAU));
    const ell = (x, y, rx, ry, rot) => P(p => p.ellipse(x, y, rx, ry, rot || 0, 0, TAU));
    const rr = (x, y, w, h, r) => P(p => {
      r = Math.min(r || 0, w / 2, h / 2);
      if (!r) { p.rect(x, y, w, h); return; }
      p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.arcTo(x + w, y, x + w, y + r, r);
      p.lineTo(x + w, y + h - r); p.arcTo(x + w, y + h, x + w - r, y + h, r);
      p.lineTo(x + r, y + h); p.arcTo(x, y + h, x, y + h - r, r);
      p.lineTo(x, y + r); p.arcTo(x, y, x + r, y, r); p.closePath();
    });
    const poly = (...a) => P(p => { p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); p.closePath(); });
    const line = (...a) => P(p => { p.moveTo(a[0], a[1]); for (let i = 2; i < a.length; i += 2) p.lineTo(a[i], a[i + 1]); });
    const svg = d => new Path2D(d);
    const F = (p, f, s) => ({ p, f, s: s !== false, w: 1 });
    const L = (p, w) => ({ p, f: null, s: true, w: w || 1 });
    // union: several overlapping shapes that read as one silhouette with a single outline
    const U = (f, ...ps) => ps.map(p => ({ p, f: null, s: true, w: 2 })).concat(ps.map(p => ({ p, f, s: false, w: 1 })));
    const starPts = (ro, ri) => { const a = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? ri : ro, t = -Math.PI / 2 + i * Math.PI / 5; a.push(Math.cos(t) * r, Math.sin(t) * r); } return a; };

    const small = [
      { id: 'key', label: 'key', shapes: [F(rr(-10, -5, 52, 10, 3), 'body'), F(rr(24, 3, 8, 13, 2), 'body'), F(rr(35, 3, 7, 10, 2), 'body'), F(circ(-24, 0, 17), 'body'), F(circ(-24, 0, 7), 'dark')] },
      { id: 'star', label: 'star', sky: true, shapes: [F(poly(...starPts(44, 19)), 'body')] },
      { id: 'heart', label: 'heart', shapes: [F(svg('M0,36 C-52,2 -44,-38 -20,-38 C-8,-38 0,-30 0,-20 C0,-30 8,-38 20,-38 C44,-38 52,2 0,36 Z'), 'body'), F(ell(-18, -20, 6, 9, -0.5), 'light', false)] },
      { id: 'fish', label: 'fish', shapes: [F(poly(18, 0, 44, -20, 44, 20), 'body'), F(poly(-8, -16, 6, -32, 12, -14), 'body'), F(ell(-6, 0, 30, 19), 'body'), F(circ(-20, -4, 3.6), INK, false)] },
      { id: 'mushroom', label: 'mushroom', shapes: [F(rr(-10, -2, 20, 38, 8), 'light'), F(svg('M-42,4 C-42,-44 42,-44 42,4 Z'), 'body'), F(circ(-16, -16, 6), 'light', false), F(circ(12, -12, 5), 'light', false), F(circ(-2, -28, 4), 'light', false)] },
      { id: 'leaf', label: 'leaf', shapes: [F(svg('M0,-44 C32,-26 32,22 0,44 C-32,22 -32,-26 0,-44 Z'), 'body'), L(line(0, -34, 0, 36)), L(line(0, -8, 14, -18)), L(line(0, 10, -14, 0))] },
      { id: 'moon', label: 'moon', sky: true, shapes: [F(svg('M10,-42 A42,42 0 1,0 10,42 A50,50 0 0,1 10,-42 Z'), 'body')] },
      { id: 'cup', label: 'cup', shapes: [F(ell(0, 34, 38, 7), 'light'), F(circ(30, 2, 13), 'body'), F(circ(30, 2, 6), 'dark'), F(svg('M-30,-20 L30,-20 L24,22 C22,32 -22,32 -24,22 Z'), 'body'), F(rr(-31, -25, 62, 8, 4), 'light')] },
      { id: 'hat', label: 'top hat', shapes: [F(ell(0, 28, 44, 10), 'dark'), F(rr(-25, -38, 50, 64, 5), 'body'), F(rr(-25, 8, 50, 11, 0), 'light')] },
      { id: 'boot', label: 'boot', shapes: [F(svg('M-20,-42 L10,-42 L10,6 C30,6 42,14 42,28 L42,34 L-20,34 Z'), 'body'), F(rr(-23, 30, 68, 10, 4), 'dark'), F(rr(-23, -45, 36, 9, 3), 'light')] },
      { id: 'bell', label: 'bell', shapes: [F(circ(0, -38, 6), 'body'), F(circ(0, 34, 7), 'dark'), F(svg('M-30,20 C-30,-12 -22,-36 0,-36 C22,-36 30,-12 30,20 L38,28 L-38,28 Z'), 'body'), L(line(-25, 14, 25, 14))] },
      { id: 'kite', label: 'kite', sky: true, shapes: [F(poly(0, -46, 28, -10, 0, 30, -28, -10), 'body'), L(line(0, -46, 0, 30)), L(line(-28, -10, 28, -10)), L(svg('M0,30 C-8,36 10,40 2,47'))] },
      { id: 'umbrella', label: 'umbrella', shapes: [L(svg('M0,-4 L0,34 Q0,44 -10,42'), 1.4), F(svg('M-42,0 C-42,-48 42,-48 42,0 Q28,-10 14,0 Q0,-10 -14,0 Q-28,-10 -42,0 Z'), 'body'), L(svg('M-14,0 Q-10,-28 0,-36')), L(svg('M14,0 Q10,-28 0,-36'))] },
      { id: 'apple', label: 'apple', shapes: [F(svg('M0,-18 C-14,-34 -42,-22 -38,8 C-36,30 -16,44 0,36 C16,44 36,30 38,8 C42,-22 14,-34 0,-18 Z'), 'body'), L(svg('M0,-18 Q2,-32 10,-38'), 1.3), F(ell(18, -33, 10, 5, -0.5), LEAF), F(ell(-18, -2, 5, 9, 0.3), 'light', false)] },
      { id: 'carrot', label: 'carrot', shapes: [F(ell(4, -32, 6, 14, 0.4), LEAF), F(ell(14, -27, 6, 13, 0.95), LEAF), F(ell(-7, -33, 6, 13, -0.15), LEAF), F(svg('M-16,-20 C-4,-30 18,-22 20,-12 C10,10 -10,34 -24,44 C-28,24 -26,-4 -16,-20 Z'), 'body'), L(line(-10, -6, 0, -4)), L(line(-14, 10, -6, 12))] },
      { id: 'candle', label: 'candle', shapes: [F(rr(-18, 36, 36, 9, 3), 'dark'), F(rr(-12, -12, 24, 50, 3), 'body'), L(line(0, -18, 0, -12)), F(svg('M0,-46 C11,-33 9,-20 0,-18 C-9,-20 -11,-33 0,-46 Z'), '#f8b93a')] },
      { id: 'book', label: 'book', shapes: [F(rr(-27, -36, 54, 72, 5), 'body'), F(rr(-27, -36, 12, 72, 3), 'dark'), F(rr(-6, -22, 24, 14, 2), 'light')] },
      { id: 'lantern', label: 'lantern', shapes: [L(P(p => p.arc(0, -40, 6, Math.PI, 0))), F(rr(-15, -38, 30, 8, 2), 'dark'), F(rr(-22, -30, 44, 56, 8), 'body'), F(rr(-13, -20, 26, 36, 5), '#fdeaa8'), F(rr(-18, 26, 36, 9, 2), 'dark')] },
      { id: 'balloon', label: 'balloon', sky: true, shapes: [L(svg('M0,31 Q8,38 0,46')), F(poly(-5, 24, 5, 24, 0, 32), 'body'), F(ell(0, -10, 28, 34), 'body'), F(ell(-10, -22, 6, 10, -0.4), 'light', false)] },
      { id: 'bottle', label: 'bottle', shapes: [F(rr(-8, -48, 16, 8, 2), '#b98b5e'), F(rr(-7, -42, 14, 22, 3), 'body'), F(rr(-18, -24, 36, 68, 10), 'body'), F(rr(-18, -2, 36, 20, 0), 'light')] },
      { id: 'flag', label: 'flag', shapes: [F(rr(-32, -46, 6, 92, 3), '#8a6a4a'), F(svg('M-26,-42 L34,-34 L20,-20 L34,-6 L-26,-6 Z'), 'body')] },
      { id: 'anchor', label: 'anchor', shapes: [F(svg('M-36,8 C-36,34 -16,44 0,44 C16,44 36,34 36,8 L26,14 C24,26 12,33 0,33 C-12,33 -24,26 -26,14 Z'), 'body'), F(rr(-5, -28, 10, 66, 3), 'body'), F(rr(-20, -22, 40, 8, 3), 'body'), F(circ(0, -36, 9), 'body'), F(circ(0, -36, 3.5), 'dark', false)] },
      { id: 'acorn', label: 'acorn', shapes: [F(svg('M-24,-6 C-24,30 -8,44 0,44 C8,44 24,30 24,-6 Z'), 'body'), F(rr(-3, -38, 6, 12, 2), 'dark'), F(svg('M-30,-4 C-30,-32 30,-32 30,-4 Z'), 'dark')] },
      { id: 'feather', label: 'feather', sky: true, shapes: [F(svg('M-6,44 C-32,10 -22,-30 6,-46 C32,-20 26,14 -6,44 Z'), 'body'), L(line(-12, 48, 4, -36)), L(line(-4, 8, 12, -2)), L(line(-8, 24, 6, 16))] },
      { id: 'shell', label: 'shell', shapes: [F(poly(-10, 32, 10, 32, 7, 42, -7, 42), 'body'), F(svg('M0,34 L-36,-4 C-36,-30 -14,-42 0,-42 C14,-42 36,-30 36,-4 Z'), 'body'), L(line(0, 34, 0, -40)), L(line(0, 34, -18, -34)), L(line(0, 34, 18, -34)), L(line(0, 34, -31, -18)), L(line(0, 34, 31, -18))] },
      { id: 'envelope', label: 'envelope', shapes: [F(rr(-38, -26, 76, 52, 4), 'body'), L(line(-37, -24, 0, 6, 37, -24)), F(circ(0, 6, 5), 'light')] },
      { id: 'crown', label: 'crown', shapes: [F(svg('M-36,26 L-42,-22 L-18,0 L0,-36 L18,0 L42,-22 L36,26 Z'), 'body'), F(rr(-36, 16, 72, 12, 3), 'dark'), F(circ(0, 22, 4), 'light', false), F(circ(-20, 22, 3), 'light', false), F(circ(20, 22, 3), 'light', false)] },
      { id: 'tulip', label: 'tulip', shapes: [F(rr(-3, 0, 6, 46, 3), LEAF), F(ell(-13, 28, 13, 5, 0.6), LEAF), F(svg('M-22,-38 L-10,-24 L0,-40 L10,-24 L22,-38 C26,-8 14,6 0,6 C-14,6 -26,-8 -22,-38 Z'), 'body')] },
      { id: 'bone', label: 'bone', shapes: U('body', circ(-30, -9, 9), circ(-30, 9, 9), circ(30, -9, 9), circ(30, 9, 9), rr(-30, -7, 60, 14, 4)) },
      { id: 'pumpkin', label: 'pumpkin', shapes: [F(rr(-5, -36, 10, 16, 3), LEAF), F(ell(0, 6, 40, 31), 'body'), L(ell(0, 6, 20, 31)), L(line(0, -25, 0, 37))] },
      { id: 'button', label: 'button', shapes: [F(circ(0, 0, 38), 'body'), L(circ(0, 0, 27)), F(circ(-9, -9, 4.5), 'dark', false), F(circ(9, -9, 4.5), 'dark', false), F(circ(-9, 9, 4.5), 'dark', false), F(circ(9, 9, 4.5), 'dark', false)] },
      { id: 'gem', label: 'gem', shapes: [F(poly(-38, -8, -18, -32, 18, -32, 38, -8, 0, 42), 'body'), F(poly(-18, -32, -9, -8, -38, -8), 'light', false), F(poly(18, -32, 9, -8, -9, -8, -18, -32), 'light', false), L(poly(-38, -8, -18, -32, 18, -32, 38, -8, 0, 42)), L(line(-38, -8, 38, -8)), L(line(-18, -32, -9, -8, 0, 42)), L(line(18, -32, 9, -8, 0, 42))] },
      { id: 'boat', label: 'sailboat', shapes: [F(poly(2, -42, 2, 6, 32, 6), 'light'), F(poly(-4, -28, -4, 6, -28, 6), 'light'), F(svg('M-42,10 L42,10 L26,34 L-26,34 Z'), 'body')] }
    ];
    for (const d of small) { d.base = 0.42; d.sky = !!d.sky; }

    const occ = [
      { id: 'tree', w: 4, size: 250, base: 0.48, tints: ['#4f9d4a', '#3f8f5a', '#6aaa3f', '#e0903a'],
        shapes: [F(rr(-7, 8, 14, 40, 4), '#8a6a4a')].concat(U('body', circ(-18, -6, 24), circ(18, -6, 24), circ(0, -24, 26), circ(0, 4, 22)), [F(circ(-10, -24, 4), 'light', false), F(circ(14, -8, 3), 'light', false)]) },
      { id: 'pine', w: 3, size: 260, base: 0.48, tints: ['#2f7d5b', '#3b8a52', '#2b6f6a'],
        shapes: [F(rr(-6, 32, 12, 16, 2), '#7a5a3e')].concat(U('body', poly(0, -48, 24, -16, -24, -16), poly(0, -30, 31, 8, -31, 8), poly(0, -8, 38, 34, -38, 34))) },
      { id: 'bush', w: 4, size: 140, base: 0.44, tints: ['#6bb04f', '#58a35f', '#86b84a'],
        shapes: U('body', circ(-22, 16, 20), circ(0, 4, 25), circ(22, 16, 20), circ(-6, 24, 20), circ(8, 24, 20)).concat([F(circ(-12, 6, 3.2), '#dd4b39', false), F(circ(10, 14, 3.2), '#dd4b39', false), F(circ(2, -6, 3.2), '#dd4b39', false)]) },
      { id: 'rock', w: 3, size: 130, base: 0.3, tints: ['#a9b0a6', '#b9b2a1', '#98a3a8'],
        shapes: [F(svg('M-42,30 L-32,-8 L-8,-28 L22,-20 L42,8 L38,30 Z'), 'body'), F(poly(-32, -8, -8, -28, 2, 4), 'light', false), L(line(-8, -28, 2, 4, 38, 30)), L(line(2, 4, -32, -8))] },
      { id: 'cottage', w: 1.5, size: 290, base: 0.4, tints: ['#c0563f', '#3f6aa8', '#8a5a9c', '#d08a2e'],
        shapes: [F(rr(16, -40, 10, 24, 1), '#9c6b4f'), F(rr(-32, -8, 64, 48, 2), '#f3e6c8'), F(poly(-44, -6, 0, -44, 44, -6), 'body'), F(rr(-9, 14, 18, 26, 3), '#7b5a3c'), F(rr(14, 4, 14, 14, 2), '#bfe3f2'), F(rr(-28, 4, 14, 14, 2), '#bfe3f2')] },
      { id: 'tent', w: 1, size: 200, base: 0.36, tints: ['#f08a24', '#3a6fd8', '#dd4b39', '#1fa39a'],
        shapes: [L(line(0, -36, 0, -45)), F(poly(-42, 36, 0, -36, 42, 36), 'body'), F(poly(-11, 36, 0, 2, 11, 36), 'dark')] },
      { id: 'haystack', w: 1.5, size: 180, base: 0.36, tints: ['#e8c95a', '#dcb848'],
        shapes: [F(svg('M-38,36 C-38,-22 -12,-38 0,-38 C12,-38 38,-22 38,36 Z'), 'body'), L(line(-14, -10, -18, 20)), L(line(8, -16, 12, 18)), L(line(-2, 6, -4, 30))] },
      { id: 'fence', w: 1.5, size: 230, base: 0.32, tints: ['#b98f62', '#c9a77a'],
        shapes: [F(rr(-44, -2, 88, 7, 2), 'body'), F(rr(-44, 14, 88, 7, 2), 'body'), F(rr(-40, -14, 9, 46, 2), 'body'), F(rr(-5, -14, 9, 46, 2), 'body'), F(rr(31, -14, 9, 46, 2), 'body')] },
      { id: 'log', w: 1.5, size: 170, base: 0.14, tints: ['#9a714b', '#8a6444'],
        shapes: [F(rr(-42, -14, 84, 28, 14), 'body'), F(ell(32, 0, 9, 13), 'light'), L(line(-28, -4, -6, -4)), L(line(-18, 5, 8, 5))] }
    ];
    const cloud = { id: 'cloud', size: 260, base: 0, tints: ['#ffffff', '#f4f8fb'],
      shapes: U('body', circ(-24, 6, 18), circ(0, -6, 24), circ(24, 6, 18), rr(-38, 6, 76, 18, 9)) };

    // residents: one body, eight head features
    const feature = [
      () => [F(circ(-18, -24, 9), 'body'), F(circ(18, -24, 9), 'body')],
      () => [F(poly(-23, -16, -15, -44, -3, -24), 'body'), F(poly(23, -16, 15, -44, 3, -24), 'body')],
      () => [L(line(-8, -26, -14, -42)), L(line(8, -26, 14, -42)), F(circ(-14, -44, 4.5), '#f4c430'), F(circ(14, -44, 4.5), '#f4c430')],
      () => [],
      () => [L(line(0, -26, 0, -38)), F(ell(9, -41, 10, 5, -0.5), LEAF)],
      () => [F(poly(-17, -20, -23, -42, -7, -26), 'light'), F(poly(17, -20, 23, -42, 7, -26), 'light')],
      () => [],
      () => []
    ];
    const after = [
      () => [], () => [], () => [],
      () => [F(rr(-18, -31, 36, 6, 3), 'dark'), F(rr(-11, -48, 22, 19, 3), 'dark')],
      () => [], () => [],
      () => [F(rr(14, 4, 9, 22, 3), '#dd4b39'), F(rr(-23, 0, 46, 9, 4), '#dd4b39')],
      () => [F(poly(0, -30, -17, -42, -17, -20), '#f07fa8'), F(poly(0, -30, 17, -42, 17, -20), '#f07fa8'), F(circ(0, -30, 4.5), '#f07fa8')]
    ];
    const residentDefs = [];
    for (let v = 0; v < 8; v++) {
      residentDefs.push({ id: 'resident' + v, label: 'resident', base: 0.4, sky: false, shapes: feature[v]().concat([
        F(ell(-10, 34, 9, 5), 'dark'), F(ell(10, 34, 9, 5), 'dark'),
        F(svg('M-24,32 C-31,0 -22,-27 0,-27 C22,-27 31,0 24,32 Z'), 'body'),
        F(ell(0, 14, 12, 12), 'light', false),
        F(circ(-8, -7, 3.4), INK, false), F(circ(8, -7, 3.4), INK, false)
      ], after[v]()) });
    }
    return { small, occ, cloud, residentDefs };
  }

  const RESIDENTS = [
    { id: 'mossy', name: 'Mossy', color: '#6aa84f', variant: 4 },
    { id: 'odo', name: 'Odo', color: '#4f86d9', variant: 0 },
    { id: 'bram', name: 'Bram', color: '#b07a52', variant: 5 },
    { id: 'tuck', name: 'Tuck', color: '#ef8e2f', variant: 3 },
    { id: 'wren', name: 'Wren', color: '#8f5fd0', variant: 1 },
    { id: 'fen', name: 'Fen', color: '#22a79c', variant: 2 },
    { id: 'juno', name: 'Juno', color: '#ef7fa9', variant: 7 },
    { id: 'sol', name: 'Sol', color: '#f0c02e', variant: 6 }
  ];

  // ---------- drawing ----------
  function drawSprite(ctx, sp, mode) {
    const k = sp.size / 100;
    const lw = clamp(1.5 + sp.size * 0.011, 1.8, 4.6) / k;
    const flat = mode === 'id' ? sp.idColor : null;
    ctx.save();
    ctx.translate(sp.x, sp.y);
    if (sp.rot) ctx.rotate(sp.rot);
    ctx.scale(sp.flip ? -k : k, k);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (const sh of sp.def.shapes) {
      if (sh.f !== null) { ctx.fillStyle = flat || fillFor(sh.f, sp.color); ctx.fill(sh.p); }
      if (sh.s) { ctx.strokeStyle = flat || INK; ctx.lineWidth = lw * sh.w; ctx.stroke(sh.p); }
    }
    ctx.restore();
  }
  function drawIcon(ctx, def, color, cx, cy, size, flatColor) {
    drawSprite(ctx, { def, color, x: cx, y: cy, size, rot: 0, flip: false, idColor: flatColor }, flatColor ? 'id' : 'art');
  }

  function paintBackground(ctx, W, H, hz, rng) {
    let g = ctx.createLinearGradient(0, 0, 0, hz);
    g.addColorStop(0, '#9fd3ee'); g.addColorStop(1, '#e4f3ef');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, hz + 4);
    const sx = W * rng.range(0.15, 0.85), sy = hz * 0.34;
    ctx.fillStyle = 'rgba(255,244,200,0.45)'; ctx.beginPath(); ctx.arc(sx, sy, 120, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff1bd'; ctx.beginPath(); ctx.arc(sx, sy, 68, 0, TAU); ctx.fill();
    const hills = (base, amp, color) => {
      const f1 = rng.range(0.0016, 0.0026), f2 = rng.range(0.004, 0.006), p1 = rng.range(0, TAU), p2 = rng.range(0, TAU);
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, hz + 40);
      for (let x = 0; x <= W; x += 16) ctx.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(x * f1 + p1) + 0.15 * Math.sin(x * f2 + p2)));
      ctx.lineTo(W, hz + 40); ctx.closePath(); ctx.fill();
    };
    hills(hz + 2, 130, '#a9cfc4'); hills(hz + 8, 80, '#93c4a5');
    g = ctx.createLinearGradient(0, hz, 0, H);
    g.addColorStop(0, '#b6db97'); g.addColorStop(1, '#8cc678');
    ctx.fillStyle = g; ctx.fillRect(0, hz, W, H - hz);
    const patch = ['#a6d488', '#c9e08f', '#9ccf86', '#d9e6a0', '#86c07c'];
    for (let i = 0; i < 30; i++) {
      const y = rng.range(hz + 30, H), t = (y - hz) / (H - hz), rx = rng.range(140, 420) * (0.5 + t);
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = rng.pick(patch);
      ctx.beginPath(); ctx.ellipse(rng.range(0, W), y, rx, rx * rng.range(0.22, 0.4), rng.range(-0.15, 0.15), 0, TAU); ctx.fill(); ctx.restore();
    }
    // winding path from the foreground to the horizon
    const px0 = W * rng.range(0.25, 0.75), a1 = rng.range(180, 420), a2 = rng.range(60, 160), q1 = rng.range(0, TAU), q2 = rng.range(0, TAU);
    ctx.fillStyle = '#ead9a8';
    for (let i = 0; i <= 260; i++) {
      const t = i / 260, y = lerp(H + 40, hz + 14, t);
      const x = px0 + a1 * Math.sin(t * 5 + q1) * (1 - t * 0.5) + a2 * Math.sin(t * 13 + q2);
      ctx.beginPath(); ctx.arc(x, y, lerp(78, 9, Math.pow(t, 0.8)), 0, TAU); ctx.fill();
    }
    // ponds
    const ponds = 1 + (rng.chance(0.6) ? 1 : 0);
    for (let i = 0; i < ponds; i++) {
      const y = rng.range(hz + 260, H - 200), t = (y - hz) / (H - hz), rx = rng.range(170, 280) * (0.6 + t * 0.6), x = rng.range(rx, W - rx), rot = rng.range(-0.1, 0.1);
      ctx.fillStyle = '#8ecae6'; ctx.strokeStyle = '#6bb3d6'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.4, rot, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.ellipse(x - rx * 0.25, y - rx * 0.1, rx * 0.4, rx * 0.1, rot, 0, TAU); ctx.fill();
    }
    // grass tufts and flowers for texture
    ctx.lineCap = 'round';
    for (let i = 0; i < 1100; i++) {
      const y = rng.range(hz + 24, H - 6), s = 0.6 + ((y - hz) / (H - hz)) * 0.9, x = rng.range(0, W);
      ctx.strokeStyle = 'rgba(92,150,84,0.55)'; ctx.lineWidth = 2 * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3 * s, y - 9 * s); ctx.moveTo(x + 4 * s, y); ctx.lineTo(x + 6 * s, y - 8 * s); ctx.stroke();
    }
    const petals = ['#ffffff', '#f9d5e5', '#fde68a', '#f6c1d0'];
    for (let i = 0; i < 320; i++) {
      const y = rng.range(hz + 24, H - 6), s = 0.6 + ((y - hz) / (H - hz)) * 0.9;
      ctx.fillStyle = rng.pick(petals); ctx.beginPath(); ctx.arc(rng.range(0, W), y, 3.2 * s, 0, TAU); ctx.fill();
    }
  }

  // ---------- canvases ----------
  let makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  function setCanvasFactory(fn) { makeCanvas = fn; }

  // ---------- generator ----------
  function generate(opts) {
    const t0 = now();
    const W = opts.W || 3200, H = opts.H || 2000, idScale = opts.idScale || 0.5;
    const d = clamp(Math.round(opts.difficulty || 3), 1, 5), u = (d - 1) / 4;
    const seed = String(opts.seed);
    const rng = makeRng(seed + '#' + d);
    const D = defs();
    const cfg = {
      targets: 5 + d, decoys: d - 1,
      clutter: Math.round(lerp(150, 440, u)), occluders: Math.round(lerp(24, 42, u)), clouds: 7,
      minVis: lerp(0.92, 0.5, u), tuck: lerp(0, 0.7, u), sizeMul: lerp(1.2, 0.86, u),
      overlap: lerp(0.02, 0.3, u), targetOverlap: lerp(0, 0.16, u)
    };
    const hz = Math.round(H * 0.25), gTop = hz + 40, gBot = H - 46;
    const depth = y => lerp(0.62, 1.34, clamp((y - hz) / (H - hz), 0, 1));

    const all = [], smalls = [], occs = [];
    function add(sp) {
      // a flat display colour for the ID map view
      sp.rgb = [60 + Math.floor(rng() * 190), 60 + Math.floor(rng() * 190), 60 + Math.floor(rng() * 190)];
      sp.idColor = '#000000'; sp.mask = null;
      sp.uid = all.length; all.push(sp); return sp;
    }

    // ID-map storage and the per-sprite mask builder (used during placement too)
    const idW = Math.round(W * idScale), idH = Math.round(H * idScale);
    const idMap = new Int32Array(idW * idH);
    let counts = null;
    const scratch = makeCanvas(8, 8);
    let order = [];

    function buildMask(sp) {
      const s = Math.ceil(sp.size * idScale * (sp.rot ? 1.7 : 1.2)) + 8;
      scratch.width = s; scratch.height = s;
      const sctx = scratch.getContext('2d', { willReadFrequently: true });
      const ox = Math.floor(sp.x * idScale - s / 2), oy = Math.floor(sp.y * idScale - s / 2);
      sctx.setTransform(idScale, 0, 0, idScale, -ox, -oy);
      drawSprite(sctx, sp, 'id');
      const data = sctx.getImageData(0, 0, s, s).data;
      const bits = new Uint8Array(s * s);
      let n = 0;
      for (let i = 0, j = 3; i < bits.length; i++, j += 4) { if (data[j] >= 128) { bits[i] = 1; n++; } }
      sp.mask = { ox, oy, s, bits, n };
    }
    // 1. big things that can hide small things
    for (let i = 0; i < cfg.occluders; i++) {
      const def = rng.weighted(D.occ);
      for (let a = 0; a < 24; a++) {
        const baseY = rng.range(gTop + 30, gBot - 6);
        const size = def.size * depth(baseY) * rng.range(0.85, 1.15);
        const x = rng.range(40, W - 40);
        let ok = true;
        for (const o of occs) {
          const dx = o.x - x, dy = (o.baseY - baseY) * 2.2, min = (o.size + size) * 0.33;
          if (dx * dx + dy * dy < min * min) { ok = false; break; }
        }
        if (ok || a === 23) {
          occs.push(add({ def, role: 'occluder', color: rng.pick(def.tints), x, y: baseY - def.base * size, size, rot: 0, flip: rng.chance(0.5), sky: false, baseY, z: 0 }));
          break;
        }
      }
    }
    for (const o of occs) buildMask(o);
    for (let i = 0; i < cfg.clouds; i++) {
      add({ def: D.cloud, role: 'cloud', color: rng.pick(D.cloud.tints), x: rng.range(0, W), y: rng.range(60, hz - 80), size: rng.range(190, 330), rot: 0, flip: rng.chance(0.5), sky: true, baseY: 0, z: rng() });
    }

    // 2. decide what goes in the world: targets, lookalike decoys, filler
    const types = rng.shuffle(D.small);
    const targetTypes = types.slice(0, cfg.targets), fillerTypes = types.slice(cfg.targets);
    const specs = [];
    for (const def of targetTypes) {
      const cn = rng.pick(COLOR_NAMES);
      specs.push({ def, colorName: cn, role: 'target' });
    }
    const res = rng.pick(RESIDENTS);
    specs.push({ def: D.residentDefs[res.variant], role: 'resident', resident: res });
    for (const t of specs.filter(s => s.role === 'target')) {
      for (const oc of rng.shuffle(COLOR_NAMES.filter(c => c !== t.colorName)).slice(0, cfg.decoys)) specs.push({ def: t.def, colorName: oc, role: 'decoy' });
    }
    for (let i = 0; i < cfg.clutter; i++) specs.push({ def: rng.pick(fillerTypes), colorName: rng.pick(COLOR_NAMES), role: 'clutter' });

    // 3. placement
    function place(sp, mode) {
      let cand = null;
      for (let a = 0; a < 60; a++) {
        let x, y, size, baseY;
        if (mode === 'sky') {
          size = 56 * cfg.sizeMul * rng.range(0.85, 1.1);
          x = rng.range(60, W - 60); y = rng.range(70, hz - 60); baseY = 0;
        } else if (mode === 'tuck' && occs.length) {
          const o = rng.pick(occs);
          x = o.x + rng.range(-0.5, 0.5) * o.size; y = o.y + rng.range(-0.42, 0.28) * o.size;
          size = 58 * cfg.sizeMul * depth(y) * rng.range(0.9, 1.1); baseY = y + 0.42 * size;
          if (baseY >= o.baseY - 2) continue;
        } else {
          baseY = rng.range(gTop + 20, gBot);
          size = 58 * cfg.sizeMul * depth(baseY) * rng.range(0.9, 1.1);
          x = rng.range(60, W - 60); y = baseY - 0.42 * size;
        }
        if (x < 60 || x > W - 60) continue;
        if (mode !== 'sky' && (y - size * 0.5 < hz + 8 || y + size * 0.5 > H - 8)) continue;
        const r = size * 0.36;
        if (mode === 'open') {
          let covered = false;
          for (const o of occs) {
            if (o.baseY > baseY && Math.abs(o.x - x) < o.size * 0.5 + r * 0.6 && y > o.y - o.size * 0.52 - r * 0.6 && y < o.y + o.size * 0.5) { covered = true; break; }
          }
          if (covered) continue;
        }
        cand = { x, y, size, baseY, r };
        let ok = true;
        for (const q of smalls) {
          if (q === sp || q.sky !== (mode === 'sky')) continue;
          const lim = (q.protect || sp.protect) ? cfg.targetOverlap : cfg.overlap;
          const dx = q.x - x, dy = q.y - y, min = (q.r + r) * (1 - lim);
          if (dx * dx + dy * dy < min * min) { ok = false; break; }
        }
        if (ok) break;
      }
      if (!cand) { const size = 58 * cfg.sizeMul; cand = { x: W / 2, y: (gTop + gBot) / 2, size, baseY: (gTop + gBot) / 2 + 0.42 * size, r: size * 0.36 }; }
      sp.x = cand.x; sp.y = cand.y; sp.size = cand.size; sp.baseY = cand.baseY; sp.r = cand.r; sp.sky = mode === 'sky';
      if (sp.sky && sp.z === undefined) sp.z = rng();
    }

    // hide a target partly behind one occluder: sample spots and keep one where the
    // occluder covers some of it but leaves at least the minimum visible
    function placeTucked(sp) {
      for (let a = 0; a < 50; a++) {
        const o = rng.pick(occs);
        const x = o.x + rng.range(-0.55, 0.55) * o.size, y = o.y + rng.range(-0.45, 0.3) * o.size;
        const size = 58 * cfg.sizeMul * depth(y) * rng.range(0.9, 1.1), baseY = y + 0.42 * size, r = size * 0.36;
        if (baseY >= o.baseY - 2 || x < 60 || x > W - 60 || y - size * 0.5 < hz + 8 || y + size * 0.5 > H - 8) continue;
        let ok = true;
        for (const q of smalls) {
          if (q === sp || q.sky) continue;
          const dx = q.x - x, dy = q.y - y, min = (q.r + r) * (1 - cfg.targetOverlap);
          if (dx * dx + dy * dy < min * min) { ok = false; break; }
        }
        if (!ok) continue;
        sp.x = x; sp.y = y; sp.size = size; sp.baseY = baseY; sp.r = r; sp.sky = false;
        buildMask(sp);
        const m = sp.mask, om = o.mask;
        let cov = 0;
        for (let yy = 0; yy < m.s; yy++) {
          const oy = m.oy + yy - om.oy;
          if (oy < 0 || oy >= om.s) continue;
          for (let xx = 0; xx < m.s; xx++) {
            if (!m.bits[yy * m.s + xx]) continue;
            const ox = m.ox + xx - om.ox;
            if (ox >= 0 && ox < om.s && om.bits[oy * om.s + ox]) cov++;
          }
        }
        const v = m.n ? 1 - cov / m.n : 0;
        if (v >= cfg.minVis + 0.04 && v <= 0.9) return true;
      }
      sp.mask = null;
      return false;
    }

    const targets = [];
    for (const s of specs) {
      const isTarget = s.role === 'target' || s.role === 'resident';
      const sp = add({
        def: s.def, role: s.role, resident: s.resident || null,
        colorName: s.colorName || null, color: s.resident ? s.resident.color : COLORS[s.colorName],
        rot: s.role === 'resident' ? rng.range(-0.12, 0.12) : rng.range(-0.4, 0.4), flip: rng.chance(0.5),
        protect: isTarget, front: false, x: 0, y: 0, size: 0, baseY: 0, r: 0, sky: false, z: undefined
      });
      sp.label = s.resident ? s.resident.name : s.colorName[0].toUpperCase() + s.colorName.slice(1) + ' ' + s.def.label;
      let mode;
      if (s.def.sky && rng.chance(0.6)) mode = 'sky';
      else if (isTarget) mode = rng.chance(cfg.tuck) ? 'tuck' : 'open';
      else mode = rng.chance(0.25) ? 'tuck' : 'any';
      sp.tucked = false;
      if (isTarget && mode === 'tuck') { sp.tucked = placeTucked(sp); if (!sp.tucked) place(sp, 'open'); }
      else place(sp, mode);
      smalls.push(sp);
      if (isTarget) targets.push(sp);
    }

    // 4. build the ID map: for every pixel (at reduced size), which sprite is on top.
    //    Each sprite is rasterised once into a 1-bit mask, then masks are stacked in
    //    draw order. Reading the map gives exact ground truth for clicks and visibility.
    function buildOrder() {
      const sky = all.filter(s => s.sky).sort((a, b) => a.z - b.z || a.uid - b.uid);
      const ground = all.filter(s => !s.sky && !s.front).sort((a, b) => a.baseY - b.baseY || a.uid - b.uid);
      return sky.concat(ground, all.filter(s => !s.sky && s.front));
    }
    function measure() {
      order = buildOrder();
      idMap.fill(-1); counts = new Uint32Array(all.length);
      for (const sp of order) {
        if (!sp.mask) buildMask(sp);
        const m = sp.mask, x0 = Math.max(0, -m.ox), x1 = Math.min(m.s, idW - m.ox);
        for (let yy = 0; yy < m.s; yy++) {
          const gy = m.oy + yy;
          if (gy < 0 || gy >= idH) continue;
          let gi = gy * idW + m.ox + x0, mi = yy * m.s + x0;
          for (let xx = x0; xx < x1; xx++, gi++, mi++) { if (m.bits[mi]) idMap[gi] = sp.uid; }
        }
      }
      for (let i = 0; i < idMap.length; i++) { const v = idMap[i]; if (v >= 0) counts[v]++; }
      for (const t of targets) t.vis = t.mask.n ? counts[t.uid] / t.mask.n : 0;
    }

    // 5. check every target and repair any that ended up too hidden
    let passes = 0, forced = 0, moved = 0;
    for (;;) {
      measure(); passes++;
      const bad = targets.filter(t => t.vis < cfg.minVis);
      if (!bad.length) break;
      if (passes >= 10) { for (const t of bad) { t.front = true; forced++; } measure(); passes++; break; }
      for (const t of bad) {
        moved++; t.mask = null;
        if (t.sky) { t.z = 2 + rng(); place(t, 'sky'); }
        else if (t.tucked && (t.tries = (t.tries || 0) + 1) <= 2 && placeTucked(t)) { /* found another hiding spot */ }
        else { t.tucked = false; t.mask = null; place(t, 'open'); }
      }
    }

    // 6. paint the world the player sees
    const canvas = makeCanvas(W, H), ctx = canvas.getContext('2d');
    paintBackground(ctx, W, H, hz, makeRng(seed + '#bg'));
    for (const sp of order) {
      if (!sp.sky) {
        ctx.fillStyle = 'rgba(30,55,38,0.17)';
        ctx.beginPath(); ctx.ellipse(sp.x, sp.baseY, sp.size * 0.36, sp.size * 0.085, 0, 0, TAU); ctx.fill();
      }
      drawSprite(ctx, sp, 'art');
    }

    const idCanvas = makeCanvas(idW, idH), idCtx = idCanvas.getContext('2d');
    const img = idCtx.createImageData(idW, idH);
    for (let i = 0, j = 0; i < idMap.length; i++, j += 4) {
      const v = idMap[i];
      if (v >= 0) { const c = all[v].rgb; img.data[j] = c[0]; img.data[j + 1] = c[1]; img.data[j + 2] = c[2]; img.data[j + 3] = 255; }
    }
    idCtx.putImageData(img, 0, 0);
    for (const sp of all) sp.mask = sp.protect ? { n: sp.mask.n } : null;

    // 7. rate how hard each target is to spot
    for (const t of targets) {
      let crowd = 0;
      for (const q of smalls) { if (q !== t && q.sky === t.sky && Math.hypot(q.x - t.x, q.y - t.y) < 170) crowd++; }
      t.crowd = crowd; t.decoys = t.role === 'target' ? cfg.decoys : 0;
      t.score = Math.round(100 * clamp(0.38 * (1 - t.vis) / 0.5 + 0.22 * clamp((70 - t.size) / 40, 0, 1) + 0.2 * Math.min(1, t.decoys / 4) + 0.2 * Math.min(1, crowd / 9), 0, 1));
    }

    return {
      seed, difficulty: d, cfg, W, H, hz, canvas, idCanvas, idMap, idW, idH, idScale,
      sprites: all, order, targets: targets.map(t => t.uid), resident: res,
      stats: { ms: Math.round(now() - t0), passes, moved, forced, sprites: all.length, occluders: occs.length, smalls: smalls.length, decoys: cfg.decoys * cfg.targets, clutter: cfg.clutter }
    };
  }

  // which sprite owns this world point (-1 for background)
  function hitAt(P, x, y) {
    const ix = Math.floor(x * P.idScale), iy = Math.floor(y * P.idScale);
    if (ix < 0 || iy < 0 || ix >= P.idW || iy >= P.idH) return -1;
    return P.idMap[iy * P.idW + ix];
  }
  // forgiving version: accept a wanted sprite within `rad` world pixels of the point
  function findNear(P, x, y, rad, wanted) {
    let uid = hitAt(P, x, y);
    if (uid >= 0 && wanted(uid)) return uid;
    for (const f of [0.5, 1]) {
      for (let i = 0; i < 12; i++) {
        const a = i * TAU / 12;
        uid = hitAt(P, x + Math.cos(a) * rad * f, y + Math.sin(a) * rad * f);
        if (uid >= 0 && wanted(uid)) return uid;
      }
    }
    return -1;
  }

  root.HW = { generate, drawSprite, drawIcon, hitAt, findNear, setCanvasFactory, COLORS, RESIDENTS, defs, INK };
})(typeof window !== 'undefined' ? window : globalThis);
