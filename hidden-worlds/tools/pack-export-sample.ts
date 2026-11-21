// TOOL-2 / PACK-4: rasterise the vector pack to PNG files and write a complete PNG pack to
// public/packs/sample-png/. Proves that new art is a data change, not a code change.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { VECTOR_DEFS } from '../src/packs/vector/defs.ts';
import { VECTOR_COLORS, VECTOR_WORLDS } from '../src/packs/vector/worlds.ts';
import type { PackManifest, SpriteEntry } from '../src/engine/pack/schema.ts';
import { renderVectorSprite, vectorSpriteEntry } from './lib/vector-manifest.ts';
import { buildPngMasks } from './lib/png-pack.ts';

const out = 'public/packs/sample-png';
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'sprites'), { recursive: true });
const sprites: SpriteEntry[] = VECTOR_DEFS.map((d) => {
  const e = vectorSpriteEntry(d);
  delete e.tints;
  delete e.color;
  if (e.colored) {
    e.files = {};
    for (const c of VECTOR_COLORS) {
      const f = `sprites/${d.id}.${c}.png`;
      writeFileSync(join(out, f), renderVectorSprite(d, c).png());
      e.files[c] = f;
    }
  } else {
    e.file = `sprites/${d.id}.png`;
    writeFileSync(join(out, e.file), renderVectorSprite(d, null).png());
  }
  return e;
});
const manifest: PackManifest = {
  id: 'sample-png',
  version: 1,
  name: 'Sample PNG pack',
  credits: 'Exported from the placeholder vector art to prove the PNG pack path.',
  art: 'png',
  pixelScale: 1,
  colors: VECTOR_COLORS,
  sprites,
  worlds: VECTOR_WORLDS,
};
writeFileSync(join(out, 'pack.json'), JSON.stringify(manifest, null, 1) + '\n');
const built = await buildPngMasks(out);
writeFileSync(join(out, 'pack.json'), JSON.stringify(built.manifest, null, 1) + '\n');
writeFileSync(join(out, 'masks.bin'), built.masks);
console.log(`sample-png: ${sprites.length} sprites written to ${out}`);
