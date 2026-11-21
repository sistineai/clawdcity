// Browser pack loading (PACK-3). The vector pack ships with the app; PNG packs live under
// packs/<id>/ next to index.html and are fetched with relative URLs (STACK-11).
import { DEFAULT_PACK } from '../../config';
import { vectorArt } from '../../packs/vector/art';
import vectorManifest from '../../packs/vector/pack.json';
import vectorMasksUrl from '../../packs/vector/masks.bin?url';
import { toLogicData } from './logic-data';
import { PackManifest } from './schema';
import type { ArtKey, SpriteArt, SpritePack } from './types';

const backgroundsOf = (m: PackManifest) =>
  Object.fromEntries(m.worlds.map((w) => [w.id, w.background.painter]));

async function fetchBytes(url: string): Promise<Uint8Array> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Could not load ${url} (${r.status})`);
  return new Uint8Array(await r.arrayBuffer());
}

function pngArt(base: string, m: PackManifest): SpriteArt {
  const byId = new Map(m.sprites.map((s) => [s.id, s]));
  const images = new Map<string, HTMLImageElement>();
  const pending = new Map<string, Promise<void>>();
  const fileFor = (id: string, color: string | null): string | undefined => {
    const s = byId.get(id);
    if (!s) return undefined;
    return s.colored ? s.files?.[color ?? ''] : s.file;
  };
  const keyOf = (id: string, color: string | null) => id + '|' + (byId.get(id)?.colored ? (color ?? '') : '');
  const load = (id: string, color: string | null): Promise<void> => {
    const key = keyOf(id, color);
    const have = pending.get(key);
    if (have) return have;
    const file = fileFor(id, color);
    if (!file) return Promise.resolve();
    const img = new Image();
    img.decoding = 'async';
    const p = new Promise<void>((resolve, reject) => {
      img.onload = () => {
        images.set(key, img);
        // decode before first draw so painting never stalls on an undecoded image
        img.decode().then(resolve, () => resolve());
      };
      img.onerror = () => reject(new Error(`Could not load ${base}${file}`));
    });
    img.src = base + file;
    pending.set(key, p);
    return p;
  };
  return {
    kind: 'png',
    background: (w) => backgroundsOf(m)[w] ?? 'meadow',
    async ready(items?: readonly ArtKey[]) {
      const list: ArtKey[] = items
        ? [...items]
        : m.sprites.flatMap((s): ArtKey[] =>
            s.colored
              ? m.colors.map((c) => ({ spriteId: s.id, color: c }))
              : [{ spriteId: s.id, color: null }],
          );
      const seen = new Set<string>();
      const jobs: Promise<void>[] = [];
      for (const it of list) {
        const k = keyOf(it.spriteId, it.color);
        if (seen.has(k)) continue;
        seen.add(k);
        jobs.push(load(it.spriteId, it.color));
      }
      await Promise.all(jobs);
    },
    draw(ctx, id, color, size) {
      const s = byId.get(id);
      const img = images.get(keyOf(id, color));
      if (!s || !img) return;
      const k = size / Math.max(s.w, s.h);
      ctx.drawImage(img, (-s.w * k) / 2, (-s.h * k) / 2, s.w * k, s.h * k);
    },
  };
}

export function requestedPackId(): string {
  try {
    const q = new URLSearchParams(location.search).get('pack');
    if (q && /^[a-z0-9-]+$/.test(q)) return q;
  } catch {
    // no location (tests)
  }
  return DEFAULT_PACK;
}

const cache = new Map<string, Promise<SpritePack>>();
export function loadPack(id: string = requestedPackId()): Promise<SpritePack> {
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      if (id === 'vector') {
        const m = PackManifest.parse(vectorManifest);
        const masks = await fetchBytes(vectorMasksUrl);
        return {
          id: m.id,
          name: m.name,
          credits: m.credits,
          logic: toLogicData(m, masks),
          art: vectorArt(backgroundsOf(m)),
        };
      }
      const base = `packs/${id}/`;
      const r = await fetch(base + 'pack.json');
      if (!r.ok) throw new Error(`Pack "${id}" not found`);
      const m = PackManifest.parse(await r.json());
      const masks = await fetchBytes(base + 'masks.bin');
      return {
        id: m.id,
        name: m.name,
        credits: m.credits,
        logic: toLogicData(m, masks),
        art: pngArt(base, m),
      };
    })();
    p.catch(() => cache.delete(id));
    cache.set(id, p);
  }
  return p;
}
