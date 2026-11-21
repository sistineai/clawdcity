// Canvas drawing of a PuzzleSpec. Placement is fixed by the spec; this only paints it.
import { baseFrac, indexPack, isSkySprite, ROT_STEP_RAD, type PuzzleSpec, type SpriteSpec } from '../logic';
import type { Ctx2D, Palette, SpritePack } from '../pack/types';
import { paintBackground } from './backgrounds';

export function spriteBaseY(pack: SpritePack, s: SpriteSpec): number {
  const def = indexPack(pack.logic).byId.get(s.spriteId);
  return def ? s.y + Math.round(baseFrac(def) * s.size) : s.y;
}

export function drawSpriteAt(ctx: Ctx2D, pack: SpritePack, s: SpriteSpec, palette: Palette): void {
  ctx.save();
  ctx.translate(s.x, s.y);
  if (s.rotStep) ctx.rotate(s.rotStep * ROT_STEP_RAD);
  if (s.flip) ctx.scale(-1, 1);
  pack.art.draw(ctx, s.spriteId, s.color, s.size, palette);
  ctx.restore();
}

function drawShadow(ctx: Ctx2D, pack: SpritePack, s: SpriteSpec): void {
  const by = spriteBaseY(pack, s);
  ctx.fillStyle = 'rgba(30,55,38,0.17)';
  ctx.beginPath();
  ctx.ellipse(s.x, by, s.size * 0.36, s.size * 0.085, 0, 0, Math.PI * 2);
  ctx.fill();
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of a sprite in world pixels, generous enough for rotation and outlines. */
export function spriteBounds(s: SpriteSpec): Rect {
  const r = s.size * 0.6;
  return { x: s.x - r, y: s.y - r, w: r * 2, h: r * 2 };
}
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export interface RenderOpts {
  background?: boolean;
  /** Only draw sprites that touch this world rectangle. */
  region?: Rect;
}

export function renderWorld(
  ctx: Ctx2D,
  spec: PuzzleSpec,
  pack: SpritePack,
  palette: Palette,
  opts: RenderOpts = {},
): void {
  if (opts.background !== false) {
    const world = indexPack(pack.logic).world(spec.worldId);
    paintBackground(ctx, world.background.painter, spec.seed, spec.W, spec.H, spec.horizon);
  }
  for (const uid of spec.order) {
    const s = spec.sprites[uid]!;
    if (opts.region && !intersects(spriteBounds(s), opts.region)) continue;
    if (!isSkySprite(s)) drawShadow(ctx, pack, s);
    drawSpriteAt(ctx, pack, s, palette);
  }
}

/** Draw a sprite as an icon (tray chips, collection), centred at cx, cy. */
export function drawIcon(
  ctx: Ctx2D,
  pack: SpritePack,
  spriteId: string,
  color: string | null,
  cx: number,
  cy: number,
  size: number,
  palette: Palette,
): void {
  ctx.save();
  ctx.translate(cx, cy);
  pack.art.draw(ctx, spriteId, color, size, palette);
  ctx.restore();
}
