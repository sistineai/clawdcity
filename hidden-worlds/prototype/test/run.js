// Headless check of the engine: invariants over many seeds, plus PNGs to look at.
const fs = require('fs');
const path = require('path');
const { createCanvas, Path2D } = require('@napi-rs/canvas');
globalThis.Path2D = Path2D;
require(path.join(__dirname, '..', 'src', 'engine.js'));
const HW = globalThis.HW;
HW.setCanvasFactory((w, h) => createCanvas(w, h));

const out = path.join(__dirname, 'out');
fs.mkdirSync(out, { recursive: true });

let puzzles = 0, failures = [], totalMs = 0, maxMs = 0, forced = 0, moved = 0, passes = 0;
const visByDiff = {};
for (let d = 1; d <= 5; d++) {
  visByDiff[d] = [];
  for (let s = 0; s < 24; s++) {
    const seed = 'test-' + s;
    const P = HW.generate({ seed, difficulty: d });
    if (global.gc) global.gc();
    puzzles++; totalMs += P.stats.ms; maxMs = Math.max(maxMs, P.stats.ms);
    forced += P.stats.forced; moved += P.stats.moved; passes += P.stats.passes;
    // every target is visible enough
    for (const uid of P.targets) {
      const t = P.sprites[uid];
      visByDiff[d].push(t.vis);
      if (t.vis < P.cfg.minVis - 1e-9) failures.push(`${seed}/d${d}: ${t.label} vis ${t.vis.toFixed(2)} < ${P.cfg.minVis.toFixed(2)}`);
      // the engine can find its own target: its pixels exist in the ID map
      let owned = 0;
      for (let i = 0; i < P.idMap.length; i++) if (P.idMap[i] === uid) owned++;
      if (owned < 20) failures.push(`${seed}/d${d}: ${t.label} owns only ${owned} px`);
      // clicking its centre region finds it (forgiving radius 12 world px)
      const hit = HW.findNear(P, t.x, t.y, 12, u => u === uid);
      if (hit !== uid && t.vis > 0.95) failures.push(`${seed}/d${d}: ${t.label} centre click missed`);
    }
    // each object target is the only sprite with its type and colour
    for (const uid of P.targets) {
      const t = P.sprites[uid];
      if (t.role !== 'target') continue;
      const twins = P.sprites.filter(q => q !== t && q.def === t.def && q.colorName === t.colorName);
      if (twins.length) failures.push(`${seed}/d${d}: ${t.label} has ${twins.length} twin(s)`);
    }
    // determinism: same seed gives the same world
    if (s < 3) {
      const Q = HW.generate({ seed, difficulty: d });
      const same = Q.sprites.length === P.sprites.length && Q.sprites.every((q, i) => q.x === P.sprites[i].x && q.y === P.sprites[i].y && q.size === P.sprites[i].size);
      if (!same) failures.push(`${seed}/d${d}: not deterministic`);
    }
  }
}
console.log(`puzzles ${puzzles}, avg ${Math.round(totalMs / puzzles)} ms, max ${maxMs} ms, avg passes ${(passes / puzzles).toFixed(2)}, targets moved ${moved}, forced to front ${forced}`);
for (let d = 1; d <= 5; d++) {
  const v = visByDiff[d];
  console.log(`difficulty ${d}: targets ${v.length}, min vis ${Math.min(...v).toFixed(2)}, mean vis ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}`);
}
console.log(failures.length ? 'FAILURES:\n' + failures.slice(0, 30).join('\n') : 'all invariants hold');

// pictures
const P = HW.generate({ seed: '2026-11-20', difficulty: 3 });
console.log('sample', P.stats, 'targets:', P.targets.map(u => `${P.sprites[u].label} ${Math.round(P.sprites[u].vis * 100)}% s${P.sprites[u].score}`).join(', '));
let c = createCanvas(1600, 1000), x = c.getContext('2d');
x.drawImage(P.canvas, 0, 0, 1600, 1000);
fs.writeFileSync(path.join(out, 'world.png'), c.toBuffer('image/png'));
c = createCanvas(1400, 900); x = c.getContext('2d');
x.drawImage(P.canvas, 900, 900, 1400, 900, 0, 0, 1400, 900);
fs.writeFileSync(path.join(out, 'crop.png'), c.toBuffer('image/png'));
c = createCanvas(1600, 1000); x = c.getContext('2d');
x.fillStyle = '#16302a'; x.fillRect(0, 0, 1600, 1000); x.drawImage(P.idCanvas, 0, 0, 1600, 1000);
fs.writeFileSync(path.join(out, 'ids.png'), c.toBuffer('image/png'));

// sprite sheet
const D = HW.defs();
const items = [].concat(
  D.small.map(d => ({ def: d, color: HW.COLORS.red, label: d.label })),
  D.occ.map(d => ({ def: d, color: d.tints[0], label: d.id })),
  [{ def: D.cloud, color: '#ffffff', label: 'cloud' }],
  HW.RESIDENTS.map(r => ({ def: D.residentDefs[r.variant], color: r.color, label: r.name }))
);
const cols = 11, cell = 130, rows = Math.ceil(items.length / cols);
c = createCanvas(cols * cell, rows * cell); x = c.getContext('2d');
x.fillStyle = '#b6db97'; x.fillRect(0, 0, c.width, c.height);
items.forEach((it, i) => {
  const cx = (i % cols) * cell + cell / 2, cy = Math.floor(i / cols) * cell + cell / 2 - 8;
  HW.drawIcon(x, it.def, it.color, cx, cy, 96);
  x.fillStyle = '#22302a'; x.font = '13px sans-serif'; x.textAlign = 'center'; x.fillText(it.label, cx, cy + 62);
});
fs.writeFileSync(path.join(out, 'sprites.png'), c.toBuffer('image/png'));
console.log('wrote', fs.readdirSync(out).join(', '));
