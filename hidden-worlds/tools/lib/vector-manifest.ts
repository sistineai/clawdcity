// Build the vector pack's manifest and masks by rendering its painters in Node (PACK-2).
import { COLORS } from '../../src/engine/render/palette.ts';
import { UNIT_BOX, VECTOR_DEFS, type VectorDef } from '../../src/packs/vector/defs.ts';
import { drawVector } from '../../src/packs/vector/art.ts';
import { VECTOR_COLORS, VECTOR_WORLDS } from '../../src/packs/vector/worlds.ts';
import type { PackManifest, SpriteEntry } from '../../src/engine/pack/schema.ts';
import { createCanvas, ctx2d } from './canvas.ts';
import { alphaOf, halfMask, solidSource } from './masks.ts';

export const VECTOR_PACK_VERSION = 1;
export const sourceSize = (d: VectorDef) => (d.kind === 'occluder' || d.kind === 'sky' ? 512 : 192);
export const worldBaseSize = (d: VectorDef) => Math.round((d.size * UNIT_BOX) / 100);

/** Render one vector sprite at its source size; returns RGBA data. */
export function renderVectorSprite(
  d: VectorDef,
  color: string | null,
): { data: Uint8ClampedArray; w: number; h: number; png: () => Buffer } {
  const s = sourceSize(d);
  const c = createCanvas(s, s);
  const ctx = ctx2d(c);
  ctx.translate(s / 2, s / 2);
  drawVector(ctx, d.id, color, s, COLORS, { lineRefSize: worldBaseSize(d) * 1.15 });
  const data = c.getContext('2d').getImageData(0, 0, s, s).data as unknown as Uint8ClampedArray;
  return { data, w: s, h: s, png: () => c.toBuffer('image/png') };
}

export function vectorSpriteEntry(d: VectorDef): SpriteEntry {
  const s = sourceSize(d);
  const e: SpriteEntry = {
    id: d.id,
    kind: d.kind,
    name: d.kind === 'small' ? d.name[0]!.toUpperCase() + d.name.slice(1) : d.name,
    w: s,
    h: s,
    anchor: [s / 2, Math.round(s / 2 + (d.base * 100 * s) / UNIT_BOX)],
    baseSize: worldBaseSize(d),
    colored: d.kind === 'small',
    allowRotate: !!d.allowRotate,
    allowFlip: true,
  };
  if (d.kind === 'small') e.skyOk = !!d.skyOk;
  if (d.tints) e.tints = d.tints;
  if (d.weight !== undefined) e.weight = d.weight;
  if (d.rarity) e.rarity = d.rarity;
  if (d.description) e.description = d.description;
  if (d.color) e.color = d.color;
  return e;
}

export function buildVectorPack(): { manifest: PackManifest; masks: Uint8Array } {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  const sprites = VECTOR_DEFS.map((d) => {
    const e = vectorSpriteEntry(d);
    const img = renderVectorSprite(d, d.kind === 'small' ? 'red' : null);
    const m = halfMask(solidSource(alphaOf(img.data, img.w), img.w, img.h), img.w, img.h);
    e.mask = { offset, w: m.w, h: m.h };
    chunks.push(m.bits);
    offset += m.bits.length;
    return e;
  });
  const masks = new Uint8Array(offset);
  let o = 0;
  for (const c of chunks) {
    masks.set(c, o);
    o += c.length;
  }
  return {
    manifest: {
      id: 'vector',
      version: VECTOR_PACK_VERSION,
      name: 'Placeholder vector art',
      credits: 'Placeholder vector art drawn in code for the v1 test. Commissioned art will replace it.',
      art: 'vector',
      pixelScale: 1,
      colors: VECTOR_COLORS,
      sprites,
      worlds: VECTOR_WORLDS,
    },
    masks,
  };
}
