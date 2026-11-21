// PACK-2: the committed vector masks are exactly what pack:build produces from the painters,
// so the browser never needs to compute them and they never drift from the art.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildVectorPack } from '../../tools/lib/vector-manifest';

describe('vector pack build output is committed and current', () => {
  it('pack.json and masks.bin match a fresh build', () => {
    const { manifest, masks } = buildVectorPack();
    expect(JSON.parse(readFileSync('src/packs/vector/pack.json', 'utf8'))).toEqual(
      JSON.parse(JSON.stringify(manifest)),
    );
    expect(Buffer.compare(readFileSync('src/packs/vector/masks.bin'), Buffer.from(masks))).toBe(0);
  });
  it('has 33 small objects, 3 worlds and 12 residents', () => {
    const { manifest } = buildVectorPack();
    expect(manifest.sprites.filter((s) => s.kind === 'small')).toHaveLength(33);
    expect(manifest.sprites.filter((s) => s.kind === 'resident')).toHaveLength(12);
    expect(manifest.worlds.map((w) => w.id)).toEqual(['meadow', 'harbour', 'market']);
    for (const w of manifest.worlds) expect(w.residents).toHaveLength(4);
  });
});
