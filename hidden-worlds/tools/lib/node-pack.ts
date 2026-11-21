// Load packs in Node for tools and tests: logic data from pack.json + masks.bin, and art
// that draws with @napi-rs/canvas.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PackManifest } from '../../src/engine/pack/schema.ts';
import { toLogicData } from '../../src/engine/pack/logic-data.ts';
import type { SpriteArt, SpritePack } from '../../src/engine/pack/types.ts';
import { vectorArt } from '../../src/packs/vector/art.ts';
import { loadImage } from './canvas.ts';
import { spriteFiles } from './png-pack.ts';

export function packDir(idOrDir: string): string {
  if (idOrDir === 'vector') return 'src/packs/vector';
  if (existsSync(join(idOrDir, 'pack.json'))) return idOrDir;
  return join('public/packs', idOrDir);
}

const backgroundsOf = (m: PackManifest) =>
  Object.fromEntries(m.worlds.map((w) => [w.id, w.background.painter]));

export async function loadPackNode(idOrDir: string): Promise<SpritePack> {
  const dir = packDir(idOrDir);
  const manifest = PackManifest.parse(JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8')));
  const logic = toLogicData(manifest, new Uint8Array(readFileSync(join(dir, 'masks.bin'))));
  let art: SpriteArt;
  if (manifest.art === 'vector') art = vectorArt(backgroundsOf(manifest));
  else {
    const images = new Map<string, Awaited<ReturnType<typeof loadImage>>>();
    for (const s of manifest.sprites)
      for (const f of spriteFiles(s))
        images.set(s.id + '|' + (f.color ?? ''), await loadImage(readFileSync(join(dir, f.file))));
    const dims = new Map(manifest.sprites.map((s) => [s.id, s]));
    art = {
      kind: 'png',
      ready: () => Promise.resolve(),
      background: (w) => backgroundsOf(manifest)[w] ?? 'meadow',
      draw(ctx, id, color, size) {
        const s = dims.get(id)!;
        const img = images.get(id + '|' + (s.colored ? (color ?? '') : ''));
        if (!img) return;
        const k = size / Math.max(s.w, s.h);
        ctx.drawImage(img as unknown as CanvasImageSource, (-s.w * k) / 2, (-s.h * k) / 2, s.w * k, s.h * k);
      },
    };
  }
  return { id: manifest.id, name: manifest.name, credits: manifest.credits, logic, art };
}
