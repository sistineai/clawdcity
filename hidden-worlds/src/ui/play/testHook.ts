// The documented E2E hook (SPEC 13). Compiled only into the `--mode e2e` build via __E2E__;
// tools/budget.ts fails if the marker `__hwTest` appears in the production bundle.
import { findNear, hitAt, ID_H, ID_W, type PuzzleSpec } from '../../engine/logic';
import { getAnalytics, type MemoryAnalytics } from '../../adapters';
import type { ActivePuzzle } from '../../state/schema';
import type { WorldController } from './WorldController';

interface Live {
  ctl: WorldController | null;
  spec: PuzzleSpec;
  idMap: Int32Array;
  active: ActivePuzzle | null;
  canvas: HTMLCanvasElement | null;
}

/** The owned ID-map pixel nearest the centroid of a sprite's visible pixels, in world coords. */
function bestPoint(
  idMap: Int32Array,
  uid: number,
  sx: number,
  sy: number,
  size: number,
): { x: number; y: number } | null {
  const r = Math.ceil(size * 0.4);
  const x0 = Math.max(0, Math.floor((sx - r) / 2));
  const x1 = Math.min(ID_W - 1, Math.ceil((sx + r) / 2));
  const y0 = Math.max(0, Math.floor((sy - r) / 2));
  const y1 = Math.min(ID_H - 1, Math.ceil((sy + r) / 2));
  const pts: [number, number][] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) if (idMap[y * ID_W + x] === uid) pts.push([x, y]);
  if (!pts.length) return null;
  let cx = 0;
  let cy = 0;
  for (const [x, y] of pts) {
    cx += x;
    cy += y;
  }
  cx /= pts.length;
  cy /= pts.length;
  // prefer a pixel whose neighbours are also owned, so a tap lands squarely on it
  let best = pts[0]!;
  let bd = Infinity;
  for (const [x, y] of pts) {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) if (idMap[(y + dy) * ID_W + x + dx] === uid) n++;
    const d = (x - cx) ** 2 + (y - cy) ** 2 - n * 4;
    if (d < bd) {
      bd = d;
      best = [x, y];
    }
  }
  return { x: best[0] * 2 + 1, y: best[1] * 2 + 1 };
}

export function installTestHook(get: () => Live): () => void {
  const toClient = (wx: number, wy: number) => {
    const l = get();
    const r = l.canvas!.getBoundingClientRect();
    const p = l.ctl!.worldToScreen(wx, wy);
    return { x: r.left + p.x, y: r.top + p.y };
  };
  const hook = {
    /** Unfound targets (and the resident) with a world point that a tap there will hit. */
    items() {
      const l = get();
      const found = new Set(l.active?.found ?? []);
      const list = l.spec.targets.map((t) => ({
        uid: t.uid,
        kind: 'target' as const,
        found: found.has(t.uid),
      }));
      if (l.spec.resident)
        list.push({
          uid: l.spec.resident.uid,
          kind: 'resident' as unknown as 'target',
          found: !!l.active?.resident,
        });
      return list.map((it) => {
        const sp = l.spec.sprites[it.uid]!;
        const p = bestPoint(l.idMap, it.uid, sp.x, sp.y, sp.size) ?? { x: sp.x, y: sp.y };
        return { ...it, spriteId: sp.spriteId, color: sp.color, wx: p.x, wy: p.y };
      });
    },
    /** Move the camera so a world point is on screen at a comfortable zoom; returns client coords. */
    reveal(wx: number, wy: number) {
      const l = get();
      // zoomed in enough that even a sprite at the world's edge sits clear of the corner buttons
      l.ctl!.centerOn(wx, wy, Math.max(l.ctl!.cam.s, 2.2), false);
      const p = toClient(wx, wy);
      const el = document.elementFromPoint(p.x, p.y);
      if (el !== l.canvas) throw new Error(`point ${wx},${wy} is covered by ${el?.className ?? 'nothing'}`);
      return p;
    },
    toClient,
    /** A visible point where a tap misses everything wanted: client coords. */
    emptyPoint(avoid: { x: number; y: number }[] = []) {
      const l = get();
      const c = l.ctl!;
      const { w, h } = c.viewSize;
      const r = c.tapRadiusWorld() * 1.5;
      const found = new Set(l.active?.found ?? []);
      const want = (u: number) =>
        (l.spec.targets.some((t) => t.uid === u) && !found.has(u)) ||
        (u === l.spec.resident?.uid && !l.active?.resident);
      for (let gy = 0.15; gy < 0.9; gy += 0.07)
        for (let gx = 0.1; gx < 0.9; gx += 0.07) {
          const sx = w * gx;
          const sy = h * gy;
          const wpt = c.screenToWorld(sx, sy);
          const cl = toClient(wpt.x, wpt.y);
          if (avoid.some((a) => Math.hypot(a.x - cl.x, a.y - cl.y) < 60)) continue;
          if (document.elementFromPoint(cl.x, cl.y) !== l.canvas) continue;
          if (hitAt(l.idMap, wpt.x, wpt.y) !== -1) continue;
          if (findNear(l.idMap, wpt.x, wpt.y, r, want) !== -1) continue;
          return toClient(wpt.x, wpt.y);
        }
      return null;
    },
    camera: () => ({ ...get().ctl!.cam }),
    state: () => get().active,
  };
  const w = window as unknown as { __hwTest?: Record<string, unknown> };
  w.__hwTest = { ...(w.__hwTest ?? {}), ...hook };
  return () => {
    if (w.__hwTest) for (const k of Object.keys(hook)) delete w.__hwTest[k];
  };
}

/** Always-present part of the hook: analytics events and the saved document. */
export function installBaseHook(getDoc: () => unknown): void {
  const w = window as unknown as { __hwTest?: Record<string, unknown> };
  w.__hwTest = {
    ...(w.__hwTest ?? {}),
    events: () => (getAnalytics() as MemoryAnalytics).events ?? [],
    doc: getDoc,
  };
}
