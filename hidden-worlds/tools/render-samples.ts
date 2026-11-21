// Write PNGs to out/ to look at: a sprite sheet, and one puzzle per world and difficulty,
// plus an answers overlay. `npm run render:samples [-- --pack sample-png]`
import { mkdirSync, writeFileSync } from 'node:fs';
import { generate } from '../src/engine/logic/index.ts';
import { renderWorld, drawIcon, spriteBounds } from '../src/engine/render/draw.ts';
import { COLORS } from '../src/engine/render/palette.ts';
import { createCanvas, ctx2d } from './lib/canvas.ts';
import { loadPackNode } from './lib/node-pack.ts';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? (process.argv[i + 1] as string) : d;
};
const packId = arg('pack', 'vector');
const pack = await loadPackNode(packId);
const out = `out/samples/${packId}`;
mkdirSync(out, { recursive: true });

// sprite sheet
const items = pack.logic.sprites;
const cols = 12,
  cell = 130,
  rows = Math.ceil(items.length / cols);
let c = createCanvas(cols * cell, rows * cell);
let x = ctx2d(c);
x.fillStyle = '#b6db97';
x.fillRect(0, 0, c.width, c.height);
items.forEach((s, i) => {
  const cx = (i % cols) * cell + cell / 2,
    cy = Math.floor(i / cols) * cell + cell / 2 - 8;
  drawIcon(
    x,
    pack,
    s.id,
    s.colored ? pack.logic.colors[i % 8]! : (s.tints?.[0] ?? null),
    cx,
    cy,
    100,
    COLORS,
  );
  x.fillStyle = '#22302a';
  x.font = '13px sans-serif';
  x.textAlign = 'center';
  x.fillText(s.id, cx, cy + 62);
});
writeFileSync(`${out}/sprites.png`, c.toBuffer('image/png'));

const worlds = arg('worlds', 'meadow,harbour,market').split(',');
const diffs = arg('d', '1,3,5').split(',').map(Number);
for (const w of worlds)
  for (const d of diffs) {
    const spec = generate({ seed: arg('seed', 'sample'), difficulty: d, worldId: w, pack: pack.logic });
    c = createCanvas(spec.W, spec.H);
    x = ctx2d(c);
    renderWorld(x, spec, pack, COLORS);
    const small = createCanvas(1600, 1000);
    ctx2d(small).drawImage(c as unknown as CanvasImageSource, 0, 0, 1600, 1000);
    writeFileSync(`${out}/${w}-d${d}.png`, small.toBuffer('image/png'));
    // answers overlay
    x.lineWidth = 6;
    for (const t of [...spec.targets, ...(spec.resident ? [spec.resident] : [])]) {
      const b = spriteBounds(spec.sprites[t.uid]!);
      x.strokeStyle = t === spec.resident ? '#ffb81c' : '#e5532d';
      x.strokeRect(b.x, b.y, b.w, b.h);
    }
    ctx2d(small).drawImage(c as unknown as CanvasImageSource, 0, 0, 1600, 1000);
    writeFileSync(`${out}/${w}-d${d}-answers.png`, small.toBuffer('image/png'));
    console.log(
      w,
      d,
      'targets',
      spec.targets
        .map(
          (t) => `${spec.sprites[t.uid]!.color} ${spec.sprites[t.uid]!.spriteId} ${t.visibility.toFixed(2)}`,
        )
        .join(', '),
      'resident',
      spec.resident && spec.sprites[spec.resident.uid]!.spriteId,
      spec.stats,
    );
  }
