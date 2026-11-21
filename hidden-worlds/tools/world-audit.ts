// TOOL-4: `npm run world:audit -- --pack <id> --days 60`. Generates the next N daily puzzles
// and every Explore level, checks the engine invariants, and reports on what players will see.
// Writes contact sheets to out/audit/. Exits non-zero on any invariant failure.
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXPLORE_LEVELS, WORLD_ORDER } from '../src/config.ts';
import { generate, type PuzzleSpec } from '../src/engine/logic/index.ts';
import { renderWorld } from '../src/engine/render/draw.ts';
import { COLORS } from '../src/engine/render/palette.ts';
import { addDays, dailyDifficulty, dailySeed, dailyWorld, todayKey } from '../src/game/dates.ts';
import { exploreDifficulty } from '../src/game/puzzles.ts';
import { createCanvas, ctx2d } from './lib/canvas.ts';
import { checkSpec, mean } from './lib/invariants.ts';
import { loadPackNode } from './lib/node-pack.ts';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? (process.argv[i + 1] as string) : d;
};
const packId = arg('pack', 'vector');
const days = Number(arg('days', '60'));
const start = arg('from', todayKey(Date.now()));
const sheets = arg('sheets', 'yes') !== 'no';
const pack = await loadPackNode(packId);

interface Item {
  label: string;
  spec: PuzzleSpec;
  ms: number;
}
const items: Item[] = [];
const failures: string[] = [];
const gen = (label: string, seed: string, difficulty: number, worldId: string) => {
  const t0 = performance.now();
  const spec = generate({ seed, difficulty, worldId, pack: pack.logic });
  const ms = performance.now() - t0;
  checkSpec(spec, pack.logic, failures);
  items.push({ label, spec, ms });
  if (globalThis.gc && items.length % 20 === 0) globalThis.gc();
};
for (let i = 0; i < days; i++) {
  const k = addDays(start, i);
  gen(`daily ${k}`, dailySeed(k), dailyDifficulty(k), dailyWorld(k));
}
for (const w of WORLD_ORDER)
  for (let n = 1; n <= EXPLORE_LEVELS; n++) gen(`${w} ${n}`, `explore-${w}-${n}`, exploreDifficulty(n), w);

// report
const pct = (a: number, b: number) => `${((100 * a) / b).toFixed(1)}%`;
const times = items.map((i) => i.ms).sort((a, b) => a - b);
console.log(
  `pack ${pack.id} v${pack.logic.version}: ${items.length} puzzles (${days} daily from ${start}, ${WORLD_ORDER.length * EXPLORE_LEVELS} Explore)`,
);
console.log(
  `generation: mean ${mean(times).toFixed(1)} ms, p95 ${times[Math.floor(times.length * 0.95)]!.toFixed(1)} ms, max ${times[times.length - 1]!.toFixed(1)} ms`,
);
const forced = items.filter((i) => i.spec.stats.forced > 0).length;
console.log(`forced to front: ${forced} puzzles (${pct(forced, items.length)})`);
console.log('\nvisibility by difficulty (targets):');
for (let d = 1; d <= 5; d++) {
  const v = items
    .filter((i) => i.spec.difficulty === d)
    .flatMap((i) => i.spec.targets.map((t) => t.visibility));
  if (v.length)
    console.log(`  d${d}: n=${v.length} mean ${mean(v).toFixed(3)} min ${Math.min(...v).toFixed(3)}`);
}
const typeCount = new Map<string, number>();
for (const i of items)
  for (const t of i.spec.targets)
    typeCount.set(i.spec.sprites[t.uid]!.spriteId, (typeCount.get(i.spec.sprites[t.uid]!.spriteId) ?? 0) + 1);
const totalTargets = [...typeCount.values()].reduce((a, b) => a + b, 0);
console.log('\nhow often each sprite type is a target:');
console.log(
  '  ' +
    [...typeCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${pct(v, totalTargets)}`)
      .join(', '),
);
const never = pack.logic.sprites.filter((s) => s.kind === 'small' && !typeCount.has(s.id)).map((s) => s.id);
if (never.length) console.log(`  never a target: ${never.join(', ')}`);
// repeats of the same target (type + colour) on consecutive days
const daily = items.filter((i) => i.label.startsWith('daily'));
let repeats = 0;
for (let i = 1; i < daily.length; i++) {
  const key = (s: PuzzleSpec) =>
    new Set(s.targets.map((t) => `${s.sprites[t.uid]!.color} ${s.sprites[t.uid]!.spriteId}`));
  const a = key(daily[i - 1]!.spec);
  const same = [...key(daily[i]!.spec)].filter((x) => a.has(x));
  if (same.length) {
    repeats += same.length;
    console.log(`  repeat ${daily[i]!.label}: ${same.join(', ')}`);
  }
}
console.log(`\nconsecutive-day repeats of the same target: ${repeats}`);
const resCount = new Map<string, number>();
for (const i of items)
  if (i.spec.resident) {
    const id = i.spec.sprites[i.spec.resident.uid]!.spriteId;
    resCount.set(id, (resCount.get(id) ?? 0) + 1);
  }
console.log(
  'resident distribution: ' +
    [...resCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(', '),
);

if (sheets) {
  mkdirSync('out/audit', { recursive: true });
  const cols = 5;
  const tw = 320;
  const th = 200;
  for (let s = 0; s * 30 < items.length; s++) {
    const chunk = items.slice(s * 30, s * 30 + 30);
    const c = createCanvas(cols * tw, Math.ceil(chunk.length / cols) * (th + 22));
    const x = ctx2d(c);
    x.fillStyle = '#f1f5ea';
    x.fillRect(0, 0, c.width, c.height);
    chunk.forEach((it, i) => {
      const ox = (i % cols) * tw;
      const oy = Math.floor(i / cols) * (th + 22);
      x.save();
      x.beginPath();
      x.rect(ox, oy, tw, th);
      x.clip();
      x.translate(ox, oy);
      x.scale(tw / it.spec.W, th / it.spec.H);
      renderWorld(x, it.spec, pack, COLORS);
      x.restore();
      x.fillStyle = '#13231d';
      x.font = '13px sans-serif';
      x.fillText(`${it.label} · d${it.spec.difficulty}`, ox + 4, oy + th + 15);
    });
    writeFileSync(
      `out/audit/${pack.id}-sheet-${String(s + 1).padStart(2, '0')}.png`,
      c.toBuffer('image/png'),
    );
    if (globalThis.gc) globalThis.gc();
  }
  console.log(`contact sheets: out/audit/${pack.id}-sheet-*.png`);
}

if (failures.length) {
  console.log(`\nINVARIANT FAILURES (${failures.length}):\n` + failures.slice(0, 50).join('\n'));
  process.exit(1);
}
console.log('\nall invariants hold');
