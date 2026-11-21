// TOOL-1: `npm run pack:build` builds the vector pack's manifest and masks;
// `npm run pack:build -- <folder>` builds masks.bin and fills in mask entries for a PNG pack.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildVectorPack } from './lib/vector-manifest.ts';
import { buildPngMasks } from './lib/png-pack.ts';

const dir = process.argv[2];
if (!dir || dir === 'vector') {
  const { manifest, masks } = buildVectorPack();
  writeFileSync('src/packs/vector/pack.json', JSON.stringify(manifest, null, 1) + '\n');
  writeFileSync('src/packs/vector/masks.bin', masks);
  console.log(`vector pack: ${manifest.sprites.length} sprites, masks.bin ${masks.length} bytes`);
} else {
  const { manifest, masks } = await buildPngMasks(dir);
  writeFileSync(join(dir, 'pack.json'), JSON.stringify(manifest, null, 1) + '\n');
  writeFileSync(join(dir, 'masks.bin'), masks);
  console.log(`${manifest.id}: ${manifest.sprites.length} sprites, masks.bin ${masks.length} bytes`);
}
