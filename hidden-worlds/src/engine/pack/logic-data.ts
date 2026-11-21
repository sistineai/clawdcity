// Turn a manifest plus masks.bin bytes into the engine's PackLogicData.
import type { PackLogicData, SpriteLogic } from '../logic';
import type { PackManifest } from './schema';

export function toLogicData(m: PackManifest, masks: Uint8Array): PackLogicData {
  const sprites: SpriteLogic[] = m.sprites.map((s) => {
    if (!s.mask) throw new Error(`Sprite "${s.id}" has no mask entry; run pack:build`);
    const bytes = Math.ceil((s.mask.w * s.mask.h) / 8);
    if (s.mask.offset + bytes > masks.length)
      throw new Error(`Mask for "${s.id}" runs past the end of masks.bin`);
    const out: SpriteLogic = {
      id: s.id,
      kind: s.kind,
      name: s.name,
      w: s.w,
      h: s.h,
      anchor: [s.anchor[0], s.anchor[1]],
      baseSize: s.baseSize,
      colored: s.colored,
      allowRotate: s.allowRotate,
      allowFlip: s.allowFlip,
      mask: { w: s.mask.w, h: s.mask.h, bits: masks.subarray(s.mask.offset, s.mask.offset + bytes) },
    };
    if (s.skyOk !== undefined) out.skyOk = s.skyOk;
    if (s.tints) out.tints = s.tints;
    if (s.weight !== undefined) out.weight = s.weight;
    if (s.rarity) out.rarity = s.rarity;
    if (s.description) out.description = s.description;
    return out;
  });
  return { id: m.id, version: m.version, colors: m.colors, sprites, worlds: m.worlds };
}
