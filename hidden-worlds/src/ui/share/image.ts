// SHARE-2: a 1080 x 1350 result card over a blurred, cropped view of the world. Only the
// background and the big occluders are painted (never a small object or resident), then
// heavily blurred by down- and up-scaling, so the picture cannot reveal a target.
import { APP_NAME, SHARE_IMAGE } from '../../config';
import { isSkySprite, type PuzzleSpec } from '../../engine/logic';
import type { SpritePack } from '../../engine/pack/types';
import { paintBackground } from '../../engine/render/backgrounds';
import { drawSpriteAt } from '../../engine/render/draw';
import { COLORS } from '../../engine/render/palette';
import { indexPack } from '../../engine/logic';
import { starString } from '../../game/scoring';

export interface CardInfo {
  title: string;
  worldName: string;
  stars: number;
  lines: string[];
}

const DISPLAY = "'Bricolage Grotesque', 'Arial Narrow', Arial, sans-serif";
const BODY = "'Figtree', system-ui, sans-serif";

/** Paint the scenery only (no small sprites), then blur it hard. */
function blurredScene(spec: PuzzleSpec, pack: SpritePack, w: number, h: number): HTMLCanvasElement {
  const scale = 0.25;
  const src = document.createElement('canvas');
  src.width = Math.round(spec.W * scale);
  src.height = Math.round(spec.H * scale);
  const ctx = src.getContext('2d')!;
  ctx.scale(scale, scale);
  const world = indexPack(pack.logic).world(spec.worldId);
  paintBackground(ctx, world.background.painter, spec.seed, spec.W, spec.H, spec.horizon);
  for (const uid of spec.order) {
    const s = spec.sprites[uid]!;
    if (s.role === 'occluder' || (s.role === 'sky' && isSkySprite(s))) drawSpriteAt(ctx, pack, s, COLORS);
  }
  // crop a portrait window around the horizon, then blur by shrinking to a tiny canvas
  const cropH = src.height * 0.78;
  const cropW = Math.min(src.width, (cropH * w) / h);
  const cx = src.width * 0.5 - cropW / 2;
  const tiny = document.createElement('canvas');
  tiny.width = 18;
  tiny.height = 22;
  const t = tiny.getContext('2d')!;
  t.imageSmoothingEnabled = true;
  t.drawImage(src, cx, 0, cropW, cropH, 0, 0, tiny.width, tiny.height);
  // upscale in doubling steps with smoothing: a soft, even blur in every browser (no ctx.filter)
  let cur = tiny;
  while (cur.width < w / 4) {
    const next = document.createElement('canvas');
    next.width = cur.width * 2;
    next.height = cur.height * 2;
    const n = next.getContext('2d')!;
    n.imageSmoothingEnabled = true;
    n.imageSmoothingQuality = 'high';
    n.drawImage(cur, 0, 0, next.width, next.height);
    if (cur !== tiny) cur.width = 0;
    cur = next;
  }
  const mid = cur;
  src.width = 0;
  tiny.width = 0;
  return mid;
}

export async function renderShareCard(
  spec: PuzzleSpec,
  pack: SpritePack,
  info: CardInfo,
): Promise<Blob | null> {
  const { w, h } = SHARE_IMAGE;
  // use the display font if it is already loaded; never wait long for it
  try {
    await Promise.race([document.fonts?.load(`800 80px ${DISPLAY}`), new Promise((r) => setTimeout(r, 300))]);
  } catch {
    // fall back to system fonts
  }
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const scene = blurredScene(spec, pack, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(scene, 0, 0, w, h);
  scene.width = 0;
  ctx.fillStyle = 'rgba(19,35,29,0.25)';
  ctx.fillRect(0, 0, w, h);

  // the card: a field-guide label
  const pad = 90;
  const top = 300;
  const cardH = 760;
  ctx.fillStyle = '#f1f5ea';
  ctx.fillRect(pad, top, w - pad * 2, cardH);
  ctx.fillStyle = '#ffb81c';
  ctx.fillRect(pad, top, w - pad * 2, 16);
  ctx.strokeStyle = '#13231d';
  ctx.lineWidth = 3;
  ctx.strokeRect(pad + 24, top + 40, w - pad * 2 - 48, cardH - 64);

  ctx.fillStyle = '#13231d';
  ctx.textAlign = 'center';
  ctx.font = `800 44px ${DISPLAY}`;
  ctx.fillText(APP_NAME.toUpperCase(), w / 2, top + 130);
  ctx.font = `800 120px ${DISPLAY}`;
  ctx.fillText(info.title.toUpperCase(), w / 2, top + 270);
  ctx.font = `600 46px ${BODY}`;
  ctx.fillStyle = '#586c61';
  ctx.fillText(info.worldName, w / 2, top + 340);
  ctx.font = `800 110px ${DISPLAY}`;
  ctx.fillStyle = '#e0a100';
  ctx.fillText(starString(info.stars), w / 2, top + 480);
  ctx.fillStyle = '#13231d';
  ctx.font = `600 44px ${BODY}`;
  info.lines.forEach((l, i) => ctx.fillText(l, w / 2, top + 580 + i * 62));

  ctx.fillStyle = '#f1f5ea';
  ctx.font = `700 38px ${BODY}`;
  ctx.fillText('Can you find them all?', w / 2, h - 130);
  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}
