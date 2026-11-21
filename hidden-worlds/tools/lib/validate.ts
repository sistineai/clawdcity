// Pack validator (PACK-5, CONTENT_PACK.md "Rules the validator enforces"). Reports every problem
// with the file and field it concerns. Thresholds live in one object.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { PackManifest, type SpriteEntry } from '../../src/engine/pack/schema.ts';
import { PAINTERS } from '../../src/engine/render/backgrounds.ts';
import { VECTOR_DEFS } from '../../src/packs/vector/defs.ts';
import { halfMask, solidSource, alphaOf } from './masks.ts';
import { imageAlpha, spriteFiles } from './png-pack.ts';
import { renderVectorSprite } from './vector-manifest.ts';
import { packDir } from './node-pack.ts';

export const VALIDATOR = {
  minFill: 0.06,
  maxFill: 0.9,
  edgePx: 1,
  variantMaxDiff: 0.02,
  minOccluders: 6,
  minSmalls: 24,
  minSky: 1,
  residents: { common: 2, uncommon: 1, rare: 1 },
  recogniseHeightPx: 40,
  recogniseMinSolid: 120,
  maxPackBytes: 12 * 1024 * 1024,
  maxImageBytes: 600 * 1024,
} as const;

export type Code =
  | 'schema'
  | 'duplicate-id'
  | 'missing-file'
  | 'wrong-dimensions'
  | 'no-alpha'
  | 'fill'
  | 'edge'
  | 'missing-colour'
  | 'anchor'
  | 'mask-missing'
  | 'mask-size'
  | 'mask-empty'
  | 'mask-mismatch'
  | 'unknown-reference'
  | 'world-composition'
  | 'unrecognisable'
  | 'size'
  | 'painter';

export interface Problem {
  code: Code;
  file: string;
  field: string;
  message: string;
}

function hasAlphaChannel(buf: Buffer): boolean {
  if (buf.length < 33 || buf.toString('ascii', 1, 4) !== 'PNG') return false;
  const colorType = buf[25];
  if (colorType === 6 || colorType === 4) return true;
  return colorType === 3 && buf.includes(Buffer.from('tRNS'));
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** Solid pixels left when the mask is drawn so the box is `heightPx` world pixels tall. */
export function solidAtHeight(bits: Uint8Array, mw: number, mh: number, heightPx: number): number {
  const scale = heightPx / mh;
  const w = Math.max(1, Math.round(mw * scale));
  let n = 0;
  for (let y = 0; y < heightPx; y++)
    for (let x = 0; x < w; x++) {
      const mx = Math.min(mw - 1, Math.floor((x + 0.5) / scale));
      const my = Math.min(mh - 1, Math.floor((y + 0.5) / scale));
      const i = my * mw + mx;
      if ((bits[i >> 3]! >> (7 - (i & 7))) & 1) n++;
    }
  return n;
}

export async function validatePack(idOrDir: string): Promise<Problem[]> {
  const dir = packDir(idOrDir);
  const P: Problem[] = [];
  const add = (code: Code, file: string, field: string, message: string) =>
    P.push({ code, file, field, message });
  const manifestFile = join(dir, 'pack.json');
  if (!existsSync(manifestFile)) {
    add('missing-file', manifestFile, '', 'pack.json not found');
    return P;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch (e) {
    add('schema', manifestFile, '', `not valid JSON: ${String(e)}`);
    return P;
  }
  const parsed = PackManifest.safeParse(raw);
  if (!parsed.success) {
    for (const i of parsed.error.issues) add('schema', manifestFile, i.path.join('.'), i.message);
    return P;
  }
  const m = parsed.data;
  const isVector = m.art === 'vector';
  const masksFile = join(dir, 'masks.bin');
  const masks = existsSync(masksFile) ? new Uint8Array(readFileSync(masksFile)) : null;
  if (!masks) add('missing-file', masksFile, '', 'masks.bin not found; run pack:build');

  // 1. unique ids
  const seen = new Set<string>();
  m.sprites.forEach((s, i) => {
    if (seen.has(s.id)) add('duplicate-id', manifestFile, `sprites.${i}.id`, `duplicate sprite id "${s.id}"`);
    seen.add(s.id);
  });
  const wseen = new Set<string>();
  m.worlds.forEach((w, i) => {
    if (wseen.has(w.id)) add('duplicate-id', manifestFile, `worlds.${i}.id`, `duplicate world id "${w.id}"`);
    wseen.add(w.id);
  });
  const byId = new Map(m.sprites.map((s) => [s.id, s]));
  const vectorIds = new Set(VECTOR_DEFS.map((d) => d.id));

  for (const [i, s] of m.sprites.entries()) {
    const f = `sprites.${i}(${s.id})`;
    // 6. anchor inside the image
    if (s.anchor[0] < 0 || s.anchor[1] < 0 || s.anchor[0] > s.w || s.anchor[1] > s.h)
      add('anchor', manifestFile, `${f}.anchor`, `anchor ${s.anchor} outside ${s.w}x${s.h}`);
    if (s.kind === 'resident' && !s.rarity)
      add('schema', manifestFile, `${f}.rarity`, 'residents need a rarity');
    // 7. mask entry
    let maskBits: Uint8Array | null = null;
    if (!s.mask) add('mask-missing', manifestFile, `${f}.mask`, 'no mask entry; run pack:build');
    else {
      const ew = Math.ceil(s.w / 2);
      const eh = Math.ceil(s.h / 2);
      if (s.mask.w !== ew || s.mask.h !== eh)
        add('mask-size', manifestFile, `${f}.mask`, `mask is ${s.mask.w}x${s.mask.h}, expected ${ew}x${eh}`);
      const bytes = Math.ceil((s.mask.w * s.mask.h) / 8);
      if (masks && s.mask.offset + bytes > masks.length)
        add('mask-size', masksFile, `${f}.mask.offset`, 'mask runs past the end of masks.bin');
      else if (masks) {
        maskBits = masks.subarray(s.mask.offset, s.mask.offset + bytes);
        if (!maskBits.some((b) => b !== 0))
          add('mask-empty', masksFile, `${f}.mask`, 'mask has no solid pixels');
      }
    }
    // 9. recognisable at play size
    const smallWeight = s.kind === 'small' && m.worlds.some((w) => (w.smalls[s.id] ?? 1) > 0);
    if (smallWeight && maskBits && s.mask) {
      const n = solidAtHeight(maskBits, s.mask.w, s.mask.h, VALIDATOR.recogniseHeightPx);
      if (n < VALIDATOR.recogniseMinSolid)
        add(
          'unrecognisable',
          masksFile,
          `${f}.mask`,
          `only ${n} solid px at ${VALIDATOR.recogniseHeightPx} px tall (need ${VALIDATOR.recogniseMinSolid})`,
        );
    }

    // images (PNG packs), or the painter (vector pack)
    const variants: {
      color: string | null;
      file: string;
      alpha: () => Promise<{ data: Uint8ClampedArray; w: number; h: number } | null>;
    }[] = [];
    if (isVector) {
      if (!vectorIds.has(s.id)) {
        add('painter', manifestFile, `${f}.id`, `no vector painter for "${s.id}"`);
        continue;
      }
      const def = VECTOR_DEFS.find((d) => d.id === s.id)!;
      const colors = s.colored ? m.colors : [null];
      for (const c of colors)
        variants.push({
          color: c,
          file: `painter:${s.id}${c ? '.' + c : ''}`,
          alpha: async () => renderVectorSprite(def, c),
        });
    } else {
      // 5. every colour
      if (s.colored) {
        for (const c of m.colors)
          if (!s.files?.[c]) add('missing-colour', manifestFile, `${f}.files.${c}`, `colour "${c}" missing`);
      } else if (!s.file) add('missing-file', manifestFile, `${f}.file`, 'no file listed');
      for (const v of spriteFiles(s)) {
        const path = join(dir, v.file);
        variants.push({
          color: v.color,
          file: path,
          alpha: async () => {
            // 2. file exists, 3. PNG with alpha
            if (!existsSync(path)) {
              add('missing-file', path, `${f}.files`, 'file not found');
              return null;
            }
            const buf = readFileSync(path);
            if (buf.length > VALIDATOR.maxImageBytes)
              add(
                'size',
                path,
                `${f}`,
                `image is ${(buf.length / 1024).toFixed(0)} KB (max ${VALIDATOR.maxImageBytes / 1024})`,
              );
            if (!hasAlphaChannel(buf)) {
              add('no-alpha', path, `${f}`, 'not a PNG with an alpha channel');
              return null;
            }
            return imageAlpha(path);
          },
        });
      }
    }
    await checkImages(s, f, variants, maskBits, add);
  }

  // 8. worlds
  m.worlds.forEach((w, i) => {
    const f = `worlds.${i}(${w.id})`;
    if (!PAINTERS[w.background.painter])
      add(
        'unknown-reference',
        manifestFile,
        `${f}.background.painter`,
        `unknown painter "${w.background.painter}"`,
      );
    const ref = (list: string[], kind: SpriteEntry['kind'], field: string) => {
      for (const id of list) {
        const s = byId.get(id);
        if (!s) add('unknown-reference', manifestFile, `${f}.${field}`, `unknown sprite "${id}"`);
        else if (s.kind !== kind)
          add('unknown-reference', manifestFile, `${f}.${field}`, `"${id}" is a ${s.kind}, not a ${kind}`);
      }
    };
    ref(w.occluders, 'occluder', 'occluders');
    ref(w.sky, 'sky', 'sky');
    ref(w.residents, 'resident', 'residents');
    for (const id of Object.keys(w.smalls)) {
      const s = byId.get(id);
      if (!s || s.kind !== 'small')
        add('unknown-reference', manifestFile, `${f}.smalls.${id}`, `unknown small sprite "${id}"`);
    }
    const smalls = m.sprites.filter((s) => s.kind === 'small' && (w.smalls[s.id] ?? 1) > 0).length;
    if (w.occluders.length < VALIDATOR.minOccluders)
      add(
        'world-composition',
        manifestFile,
        `${f}.occluders`,
        `${w.occluders.length} occluders (need ${VALIDATOR.minOccluders})`,
      );
    if (smalls < VALIDATOR.minSmalls)
      add(
        'world-composition',
        manifestFile,
        `${f}.smalls`,
        `${smalls} small sprites (need ${VALIDATOR.minSmalls})`,
      );
    if (w.sky.length < VALIDATOR.minSky) add('world-composition', manifestFile, `${f}.sky`, 'no sky sprite');
    const rar = { common: 0, uncommon: 0, rare: 0 };
    for (const id of w.residents) {
      const r = byId.get(id)?.rarity;
      if (r) rar[r]++;
    }
    const want = VALIDATOR.residents;
    if (
      w.residents.length !== 4 ||
      rar.common !== want.common ||
      rar.uncommon !== want.uncommon ||
      rar.rare !== want.rare
    )
      add(
        'world-composition',
        manifestFile,
        `${f}.residents`,
        `need exactly 4 residents (2 common, 1 uncommon, 1 rare); have ${w.residents.length} (${JSON.stringify(rar)})`,
      );
  });

  // 10. total size
  if (!isVector) {
    const total = walk(dir).reduce((a, p) => a + statSync(p).size, 0);
    if (total > VALIDATOR.maxPackBytes)
      add(
        'size',
        dir,
        '',
        `pack is ${(total / 1048576).toFixed(1)} MB (max ${VALIDATOR.maxPackBytes / 1048576})`,
      );
  }
  return P.map((p) => ({
    ...p,
    file: p.file.startsWith('painter:') ? p.file : relative('.', p.file) || p.file,
  }));
}

async function checkImages(
  s: SpriteEntry,
  f: string,
  variants: {
    color: string | null;
    file: string;
    alpha: () => Promise<{ data: Uint8ClampedArray; w: number; h: number } | null>;
  }[],
  maskBits: Uint8Array | null,
  add: (code: Code, file: string, field: string, message: string) => void,
): Promise<void> {
  for (const v of variants) {
    const img = await v.alpha();
    if (!img) continue;
    if (img.w !== s.w || img.h !== s.h) {
      add('wrong-dimensions', v.file, `${f}.w/h`, `image is ${img.w}x${img.h}, manifest says ${s.w}x${s.h}`);
      continue;
    }
    const solid = solidSource(alphaOf(img.data, img.w), img.w, img.h);
    let n = 0;
    let edge = 0;
    const e = VALIDATOR.edgePx;
    for (let y = 0; y < img.h; y++)
      for (let x = 0; x < img.w; x++) {
        if (!solid[y * img.w + x]) continue;
        n++;
        if (x < e || y < e || x >= img.w - e || y >= img.h - e) edge++;
      }
    const fill = n / (img.w * img.h);
    if (fill < VALIDATOR.minFill || fill > VALIDATOR.maxFill)
      add(
        'fill',
        v.file,
        f,
        `solid pixels cover ${(fill * 100).toFixed(1)}% (allowed ${VALIDATOR.minFill * 100}-${VALIDATOR.maxFill * 100}%)`,
      );
    if (edge) add('edge', v.file, f, `${edge} solid pixel(s) touch the image edge (cropped?)`);
    if (maskBits && s.mask && s.mask.w === Math.ceil(img.w / 2)) {
      const hm = halfMask(solid, img.w, img.h);
      let diff = 0;
      for (let i = 0; i < hm.w * hm.h; i++) {
        const a = (hm.bits[i >> 3]! >> (7 - (i & 7))) & 1;
        const b = (maskBits[i >> 3]! >> (7 - (i & 7))) & 1;
        if (a !== b) diff++;
      }
      if (diff / (hm.w * hm.h) > VALIDATOR.variantMaxDiff)
        add(
          'mask-mismatch',
          v.file,
          f,
          `${((diff / (hm.w * hm.h)) * 100).toFixed(1)}% of pixels differ from the mask (max ${VALIDATOR.variantMaxDiff * 100}%)`,
        );
    }
  }
}
