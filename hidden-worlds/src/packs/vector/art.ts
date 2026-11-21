// Painters for the vector pack. Paths are built once, lazily, from the shape data in defs.ts,
// using whichever Path2D the host provides (the browser's, or @napi-rs/canvas in Node).
import type { Ctx2D, DrawOpts, Palette, SpriteArt } from '../../engine/pack/types';
import { mix } from '../../engine/render/palette';
import { INK, UNIT_BOX, VECTOR_DEFS, type Geo, type VectorDef } from './defs';

type P2DCtor = new (d?: string) => Path2D;
let P2D: P2DCtor | null = null;
/** Node tools call this with @napi-rs/canvas's Path2D before drawing. */
export function setPath2D(ctor: P2DCtor): void {
  P2D = ctor;
  built.clear();
}

function path(g: Geo): Path2D {
  const Ctor = P2D ?? (globalThis as unknown as { Path2D: P2DCtor }).Path2D;
  if (g[0] === 'svg') return new Ctor(g[1]);
  const p = new Ctor();
  switch (g[0]) {
    case 'circ':
      p.arc(g[1], g[2], g[3], 0, Math.PI * 2);
      break;
    case 'ell':
      p.ellipse(g[1], g[2], g[3], g[4], g[5] ?? 0, 0, Math.PI * 2);
      break;
    case 'arc':
      p.arc(g[1], g[2], g[3], g[4], g[5]);
      break;
    case 'rr': {
      const [, x, y, w, h] = g;
      const r = Math.min(g[5] ?? 0, w / 2, h / 2);
      if (!r) {
        p.rect(x, y, w, h);
        break;
      }
      p.moveTo(x + r, y);
      p.lineTo(x + w - r, y);
      p.arcTo(x + w, y, x + w, y + r, r);
      p.lineTo(x + w, y + h - r);
      p.arcTo(x + w, y + h, x + w - r, y + h, r);
      p.lineTo(x + r, y + h);
      p.arcTo(x, y + h, x, y + h - r, r);
      p.lineTo(x, y + r);
      p.arcTo(x, y, x + r, y, r);
      p.closePath();
      break;
    }
    case 'poly':
    case 'line': {
      const a = g.slice(1) as number[];
      p.moveTo(a[0]!, a[1]!);
      for (let i = 2; i < a.length; i += 2) p.lineTo(a[i]!, a[i + 1]!);
      if (g[0] === 'poly') p.closePath();
      break;
    }
  }
  return p;
}

interface Built {
  def: VectorDef;
  paths: Path2D[];
}
const built = new Map<string, Built>();
const defsById = new Map(VECTOR_DEFS.map((d) => [d.id, d]));
function get(id: string): Built {
  let b = built.get(id);
  if (!b) {
    const def = defsById.get(id);
    if (!def) throw new Error(`No vector sprite "${id}"`);
    b = { def, paths: def.shapes.map((s) => path(s.g)) };
    built.set(id, b);
  }
  return b;
}

const fillCache = new Map<string, string>();
function fillFor(f: string, color: string): string {
  if (f === 'body') return color;
  if (f !== 'dark' && f !== 'light') return f;
  const key = f + color;
  let v = fillCache.get(key);
  if (!v) {
    v = f === 'dark' ? mix(color, '#1d2a24', 0.4) : mix(color, '#ffffff', 0.62);
    fillCache.set(key, v);
  }
  return v;
}

export function vectorBodyColor(def: VectorDef, color: string | null, palette: Palette): string {
  if (def.kind === 'resident') return def.color ?? '#888888';
  if (def.kind === 'small') return (color && palette[color]) || '#888888';
  return color ?? def.tints?.[0] ?? '#888888';
}

export function drawVector(
  ctx: Ctx2D,
  id: string,
  color: string | null,
  size: number,
  palette: Palette,
  opts?: DrawOpts,
): void {
  const { def, paths } = get(id);
  const k = size / UNIT_BOX;
  const ref = opts?.lineRefSize ?? size;
  // Outline weight in world pixels follows the prototype: thicker relative to small sprites.
  const lwPx = Math.min(4.6, Math.max(1.8, 1.5 + ref * 0.011)) * (size / ref);
  const lw = lwPx / k;
  const body = vectorBodyColor(def, color, palette);
  ctx.save();
  ctx.scale(k, k);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  def.shapes.forEach((sh, i) => {
    const p = paths[i]!;
    if (sh.f !== null) {
      ctx.fillStyle = fillFor(sh.f, body);
      ctx.fill(p);
    }
    if (sh.s) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = lw * sh.w;
      ctx.stroke(p);
    }
  });
  ctx.restore();
}

export const vectorArt = (backgrounds: Record<string, string>): SpriteArt => ({
  kind: 'vector',
  draw: drawVector,
  ready: () => Promise.resolve(),
  background: (worldId) => backgrounds[worldId] ?? 'meadow',
});
