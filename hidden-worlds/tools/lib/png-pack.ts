// Reading and mask-building for PNG packs on disk.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PackManifest, type SpriteEntry } from '../../src/engine/pack/schema.ts';
import { createCanvas, loadImage } from './canvas.ts';
import { alphaOf, halfMask, solidSource } from './masks.ts';

export function readManifestRaw(dir: string): unknown {
  return JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8'));
}

/** Files a sprite references: every colour variant, or its single file. */
export function spriteFiles(s: SpriteEntry): { color: string | null; file: string }[] {
  if (s.colored) return Object.entries(s.files ?? {}).map(([color, file]) => ({ color, file }));
  return s.file ? [{ color: null, file: s.file }] : [];
}

export async function imageAlpha(path: string): Promise<{ data: Uint8ClampedArray; w: number; h: number }> {
  const img = await loadImage(readFileSync(path));
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  return {
    data: ctx.getImageData(0, 0, img.width, img.height).data as unknown as Uint8ClampedArray,
    w: img.width,
    h: img.height,
  };
}

export async function buildPngMasks(dir: string): Promise<{ manifest: PackManifest; masks: Uint8Array }> {
  const manifest = PackManifest.parse(readManifestRaw(dir));
  const chunks: Uint8Array[] = [];
  let offset = 0;
  for (const s of manifest.sprites) {
    const first = spriteFiles(s)[0];
    if (!first) throw new Error(`${s.id}: no image file listed`);
    const img = await imageAlpha(join(dir, first.file));
    const m = halfMask(solidSource(alphaOf(img.data, img.w), img.w, img.h), img.w, img.h);
    s.mask = { offset, w: m.w, h: m.h };
    chunks.push(m.bits);
    offset += m.bits.length;
  }
  const masks = new Uint8Array(offset);
  let o = 0;
  for (const c of chunks) {
    masks.set(c, o);
    o += c.length;
  }
  return { manifest, masks };
}
