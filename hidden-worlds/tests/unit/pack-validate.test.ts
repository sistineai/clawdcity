import { cpSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { validatePack, type Code } from '../../tools/lib/validate';
import { createCanvas } from '../../tools/lib/canvas';

const tmp = mkdtempSync(join(tmpdir(), 'hw-pack-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Manifest {
  sprites: {
    id: string;
    w: number;
    files?: Record<string, string>;
    file?: string;
    mask?: { offset: number; w: number; h: number };
  }[];
  worlds: { smalls: Record<string, number>; occluders: string[] }[];
}
/** A copy of sample-png with one thing broken. */
function fixture(name: string, mutate: (dir: string, m: Manifest) => void): string {
  const dir = join(tmp, name);
  cpSync('public/packs/sample-png', dir, { recursive: true });
  const m = JSON.parse(readFileSync(join(dir, 'pack.json'), 'utf8')) as Manifest;
  mutate(dir, m);
  writeFileSync(join(dir, 'pack.json'), JSON.stringify(m));
  return dir;
}
const codes = async (dir: string) => new Set((await validatePack(dir)).map((p) => p.code));
const expectCode = async (dir: string, code: Code) => {
  const problems = await validatePack(dir);
  expect(problems.map((p) => p.code)).toContain(code);
  // every problem names a file and a field or message
  for (const p of problems) expect(p.file.length + p.message.length).toBeGreaterThan(0);
};

describe('PACK-A1: shipped packs are valid', () => {
  it('vector pack', async () => expect(await validatePack('vector')).toEqual([]));
  it('sample-png pack', async () => expect(await validatePack('public/packs/sample-png')).toEqual([]));
});

describe('PACK-A3: the validator rejects broken packs', () => {
  it('missing file', async () => {
    await expectCode(
      fixture('missing', (d) => unlinkSync(join(d, 'sprites/key.red.png'))),
      'missing-file',
    );
  });
  it('wrong dimensions', async () => {
    const dir = fixture('dims', () => {});
    const c = createCanvas(100, 120);
    const x = c.getContext('2d');
    x.fillStyle = '#c00';
    x.fillRect(20, 20, 60, 80);
    writeFileSync(join(dir, 'sprites/key.blue.png'), c.toBuffer('image/png'));
    await expectCode(dir, 'wrong-dimensions');
  });
  it('missing colour variant', async () => {
    await expectCode(
      fixture('colour', (_d, m) => delete m.sprites.find((s) => s.id === 'heart')!.files!.teal),
      'missing-colour',
    );
  });
  it('empty mask', async () => {
    const dir = fixture('emptymask', (d, m) => {
      const s = m.sprites.find((x) => x.id === 'star')!.mask!;
      const bin = readFileSync(join(d, 'masks.bin'));
      bin.fill(0, s.offset, s.offset + Math.ceil((s.w * s.h) / 8));
      writeFileSync(join(d, 'masks.bin'), bin);
    });
    await expectCode(dir, 'mask-empty');
  });
  it('duplicate id', async () => {
    await expectCode(
      fixture('dup', (_d, m) => (m.sprites[1]!.id = m.sprites[0]!.id)),
      'duplicate-id',
    );
  });
  it('unknown world reference', async () => {
    await expectCode(
      fixture('unknown', (_d, m) => m.worlds[0]!.occluders.push('spaceship')),
      'unknown-reference',
    );
  });
  it('an empty image and a filled background fail the fill rule; a cropped sprite fails the edge rule', async () => {
    const dir = fixture('fill', () => {});
    const blank = createCanvas(192, 192);
    writeFileSync(join(dir, 'sprites/bell.red.png'), blank.toBuffer('image/png'));
    const full = createCanvas(192, 192);
    const fx = full.getContext('2d');
    fx.fillStyle = '#fff';
    fx.fillRect(0, 0, 192, 192);
    writeFileSync(join(dir, 'sprites/bell.blue.png'), full.toBuffer('image/png'));
    const got = await codes(dir);
    expect(got.has('fill')).toBe(true);
    expect(got.has('edge')).toBe(true);
    expect(got.has('mask-mismatch')).toBe(true);
  });
  it('a world with too few small sprites fails composition', async () => {
    const dir = fixture('few', (_d, m) => {
      for (const s of m.sprites) m.worlds[1]!.smalls[s.id] = 0;
      m.worlds[1]!.smalls = Object.fromEntries(
        Object.entries(m.worlds[1]!.smalls).filter(([k]) =>
          m.sprites.some((s) => s.id === k && k !== 'files'),
        ),
      );
    });
    expect(await codes(dir)).toContain('world-composition');
  });
});
