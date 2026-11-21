// Hand-made masks (ellipses and rectangles) for engine tests that should not depend on art.
import type { MaskData, PackLogicData, SpriteLogic } from '../../src/engine/logic';

function maskOf(w: number, h: number, inside: (u: number, v: number) => boolean): MaskData {
  const mw = Math.ceil(w / 2);
  const mh = Math.ceil(h / 2);
  const bits = new Uint8Array(Math.ceil((mw * mh) / 8));
  for (let y = 0; y < mh; y++)
    for (let x = 0; x < mw; x++) {
      const u = ((x + 0.5) / mw) * 2 - 1;
      const v = ((y + 0.5) / mh) * 2 - 1;
      if (inside(u, v)) {
        const i = y * mw + x;
        bits[i >> 3]! |= 1 << (7 - (i & 7));
      }
    }
  return { w: mw, h: mh, bits };
}
const ellipse = (rx: number, ry: number) => (u: number, v: number) =>
  (u * u) / (rx * rx) + (v * v) / (ry * ry) <= 1;
const rect = (rx: number, ry: number) => (u: number, v: number) => Math.abs(u) <= rx && Math.abs(v) <= ry;

export function syntheticPack(): PackLogicData {
  const sprites: SpriteLogic[] = [];
  for (let i = 0; i < 33; i++) {
    const shape = i % 3 === 0 ? rect(0.8, 0.6 + (i % 4) * 0.08) : ellipse(0.85 - (i % 5) * 0.05, 0.85);
    sprites.push({
      id: 's' + i,
      kind: 'small',
      name: 'Thing ' + i,
      w: 192,
      h: 192,
      anchor: [96, 177],
      baseSize: 58,
      colored: true,
      allowRotate: true,
      allowFlip: true,
      skyOk: i % 7 === 0,
      mask: maskOf(192, 192, shape),
    });
  }
  for (let i = 0; i < 12; i++) {
    sprites.push({
      id: 'o' + i,
      kind: 'occluder',
      name: 'Big ' + i,
      w: 512,
      h: 512,
      anchor: [256, 500],
      baseSize: 150 + (i % 4) * 50,
      colored: false,
      allowRotate: false,
      allowFlip: true,
      tints: ['#557755'],
      mask: maskOf(512, 512, i % 2 ? ellipse(0.9, 0.95) : rect(0.85, 0.9)),
    });
  }
  sprites.push({
    id: 'cloud',
    kind: 'sky',
    name: 'Cloud',
    w: 512,
    h: 512,
    anchor: [256, 256],
    baseSize: 260,
    colored: false,
    allowRotate: false,
    allowFlip: true,
    mask: maskOf(512, 512, ellipse(0.9, 0.5)),
  });
  const rar = ['common', 'common', 'uncommon', 'rare'] as const;
  for (let i = 0; i < 12; i++) {
    sprites.push({
      id: 'r' + i,
      kind: 'resident',
      name: 'Res ' + i,
      w: 192,
      h: 192,
      anchor: [96, 182],
      baseSize: 62,
      colored: false,
      allowRotate: false,
      allowFlip: true,
      rarity: rar[i % 4],
      description: 'x',
      mask: maskOf(192, 192, ellipse(0.6, 0.85)),
    });
  }
  const occ = (a: number) => [0, 1, 2, 3, 4, 5, 6, 7].map((k) => 'o' + ((a + k) % 12));
  const ids = ['meadow', 'harbour', 'market'];
  return {
    id: 'synthetic',
    version: 1,
    colors: ['red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'pink'],
    sprites,
    worlds: ids.map((id, w) => ({
      id,
      name: id,
      background: { painter: id },
      horizon: 0.25 + w * 0.03,
      occluders: occ(w * 4),
      smalls: { s0: 2, s1: 0 },
      sky: ['cloud'],
      residents: [0, 1, 2, 3].map((k) => 'r' + (w * 4 + k)),
    })),
  };
}
