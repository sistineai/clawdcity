// Background painters, one per world (WORLD-1). Seeded from the puzzle seed so each puzzle
// gets its own landscape, but they only paint; nothing here feeds back into placement.
import { makeRng, type Rng } from '../logic';
import type { Ctx2D } from '../pack/types';

const TAU = Math.PI * 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

type Painter = (ctx: Ctx2D, W: number, H: number, hz: number, rng: Rng) => void;

function hills(ctx: Ctx2D, rng: Rng, W: number, bottom: number, base: number, amp: number, color: string) {
  const f1 = rng.range(0.0016, 0.0026);
  const f2 = rng.range(0.004, 0.006);
  const p1 = rng.range(0, TAU);
  const p2 = rng.range(0, TAU);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, bottom);
  for (let x = 0; x <= W; x += 16)
    ctx.lineTo(x, base - amp * (0.55 + 0.3 * Math.sin(x * f1 + p1) + 0.15 * Math.sin(x * f2 + p2)));
  ctx.lineTo(W, bottom);
  ctx.closePath();
  ctx.fill();
}

function tufts(ctx: Ctx2D, rng: Rng, W: number, H: number, hz: number, n: number, color: string) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  for (let i = 0; i < n; i++) {
    const y = rng.range(hz + 24, H - 6);
    const s = 0.6 + ((y - hz) / (H - hz)) * 0.9;
    const x = rng.range(0, W);
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 3 * s, y - 9 * s);
    ctx.moveTo(x + 4 * s, y);
    ctx.lineTo(x + 6 * s, y - 8 * s);
    ctx.stroke();
  }
}

const meadow: Painter = (ctx, W, H, hz, rng) => {
  let g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#9fd3ee');
  g.addColorStop(1, '#e4f3ef');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hz + 4);
  const sx = W * rng.range(0.15, 0.85);
  const sy = hz * 0.34;
  ctx.fillStyle = 'rgba(255,244,200,0.45)';
  ctx.beginPath();
  ctx.arc(sx, sy, 120, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff1bd';
  ctx.beginPath();
  ctx.arc(sx, sy, 68, 0, TAU);
  ctx.fill();
  hills(ctx, rng, W, hz + 40, hz + 2, 130, '#a9cfc4');
  hills(ctx, rng, W, hz + 40, hz + 8, 80, '#93c4a5');
  g = ctx.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, '#b6db97');
  g.addColorStop(1, '#8cc678');
  ctx.fillStyle = g;
  ctx.fillRect(0, hz, W, H - hz);
  const patch = ['#a6d488', '#c9e08f', '#9ccf86', '#d9e6a0', '#86c07c'];
  for (let i = 0; i < 30; i++) {
    const y = rng.range(hz + 30, H);
    const t = (y - hz) / (H - hz);
    const rx = rng.range(140, 420) * (0.5 + t);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = rng.pick(patch);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, W), y, rx, rx * rng.range(0.22, 0.4), rng.range(-0.15, 0.15), 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // winding path from the foreground to the horizon
  const px0 = W * rng.range(0.25, 0.75);
  const a1 = rng.range(180, 420);
  const a2 = rng.range(60, 160);
  const q1 = rng.range(0, TAU);
  const q2 = rng.range(0, TAU);
  ctx.fillStyle = '#ead9a8';
  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const y = lerp(H + 40, hz + 14, t);
    const x = px0 + a1 * Math.sin(t * 5 + q1) * (1 - t * 0.5) + a2 * Math.sin(t * 13 + q2);
    ctx.beginPath();
    ctx.arc(x, y, lerp(78, 9, Math.pow(t, 0.8)), 0, TAU);
    ctx.fill();
  }
  const ponds = 1 + (rng.chance(0.6) ? 1 : 0);
  for (let i = 0; i < ponds; i++) {
    const y = rng.range(hz + 260, H - 200);
    const t = (y - hz) / (H - hz);
    const rx = rng.range(170, 280) * (0.6 + t * 0.6);
    const x = rng.range(rx, W - rx);
    const rot = rng.range(-0.1, 0.1);
    ctx.fillStyle = '#8ecae6';
    ctx.strokeStyle = '#6bb3d6';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, rx * 0.4, rot, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.25, y - rx * 0.1, rx * 0.4, rx * 0.1, rot, 0, TAU);
    ctx.fill();
  }
  tufts(ctx, rng, W, H, hz, 1100, 'rgba(92,150,84,0.55)');
  const petals = ['#ffffff', '#f9d5e5', '#fde68a', '#f6c1d0'];
  for (let i = 0; i < 320; i++) {
    const y = rng.range(hz + 24, H - 6);
    const s = 0.6 + ((y - hz) / (H - hz)) * 0.9;
    ctx.fillStyle = rng.pick(petals);
    ctx.beginPath();
    ctx.arc(rng.range(0, W), y, 3.2 * s, 0, TAU);
    ctx.fill();
  }
};

const harbour: Painter = (ctx, W, H, hz, rng) => {
  // pale morning sky over a deep blue sea, then a sandy shore and a plank quay
  let g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#bfe0f0');
  g.addColorStop(1, '#f3efe2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hz + 4);
  const sx = W * rng.range(0.1, 0.9);
  ctx.fillStyle = 'rgba(255,236,190,0.5)';
  ctx.beginPath();
  ctx.arc(sx, hz * 0.4, 110, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.arc(sx, hz * 0.4, 60, 0, TAU);
  ctx.fill();
  // a distant headland
  hills(ctx, rng, W, hz + 2, hz + 2, 70, '#9fb9b4');
  const sea = hz + 70;
  g = ctx.createLinearGradient(0, hz, 0, sea);
  g.addColorStop(0, '#3f7fa6');
  g.addColorStop(1, '#2e6b8f');
  ctx.fillStyle = g;
  ctx.fillRect(0, hz, W, sea - hz + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 160; i++) {
    const x = rng.range(0, W);
    const y = rng.range(hz + 6, sea - 4);
    const w = rng.range(14, 40);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 4, x + w, y);
    ctx.stroke();
  }
  // shoreline foam and sand
  ctx.fillStyle = '#e9dcb4';
  ctx.beginPath();
  ctx.moveTo(0, H);
  ctx.lineTo(0, sea);
  for (let x = 0; x <= W; x += 20) ctx.lineTo(x, sea + 6 * Math.sin(x * 0.01 + rng.range(0, 0.4)));
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) {
    const y = sea + 4 + 5 * Math.sin(x * 0.013);
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // wet sand bands
  for (let i = 0; i < 26; i++) {
    const y = rng.range(sea + 40, H);
    const rx = rng.range(160, 420);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = rng.pick(['#d9c999', '#efe3c0', '#d2c08e']);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, W), y, rx, rx * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // a plank quay across the foreground
  const qy = H - rng.range(330, 420);
  ctx.fillStyle = '#b98f62';
  ctx.fillRect(0, qy, W, H - qy);
  ctx.strokeStyle = 'rgba(80,55,35,0.45)';
  ctx.lineWidth = 3;
  for (let y = qy; y < H; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  for (let y = qy; y < H; y += 34) {
    const off = rng.range(0, 160);
    for (let x = off; x < W; x += 160 + rng.range(0, 80)) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 34);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(0, qy - 6, W, 10);
  // pebbles on the sand
  for (let i = 0; i < 380; i++) {
    const y = rng.range(sea + 20, qy - 10);
    const s = 0.6 + ((y - hz) / (H - hz)) * 0.9;
    ctx.fillStyle = rng.pick(['#c7b88e', '#b8ab88', '#d8cfb0', '#a99c7a']);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, W), y, 4 * s, 2.6 * s, 0, 0, TAU);
    ctx.fill();
  }
};

const market: Painter = (ctx, W, H, hz, rng) => {
  // dusk: deep blue overhead warming to amber at the rooftops
  let g = ctx.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, '#1f2f4f');
  g.addColorStop(0.6, '#4a4f74');
  g.addColorStop(1, '#e79a62');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, hz + 4);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = 'rgba(255,248,220,' + rng.range(0.4, 0.9).toFixed(2) + ')';
    ctx.beginPath();
    ctx.arc(rng.range(0, W), rng.range(10, hz * 0.55), rng.range(1.2, 2.6), 0, TAU);
    ctx.fill();
  }
  // rooftops of the town behind the square
  let x = 0;
  ctx.fillStyle = '#2b3550';
  ctx.beginPath();
  ctx.moveTo(0, hz + 10);
  while (x < W) {
    const w = rng.range(90, 210);
    const h = rng.range(60, 170);
    ctx.lineTo(x, hz - h + 40);
    if (rng.chance(0.5)) ctx.lineTo(x + w / 2, hz - h - rng.range(10, 50));
    ctx.lineTo(x + w, hz - h + 40);
    x += w;
  }
  ctx.lineTo(W, hz + 10);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = rng.chance(0.7) ? '#ffcf6b' : '#f59f4c';
    ctx.fillRect(rng.range(0, W), hz - rng.range(10, 110), 9, 12);
  }
  // cobbled square
  g = ctx.createLinearGradient(0, hz, 0, H);
  g.addColorStop(0, '#6c6577');
  g.addColorStop(1, '#8a7f86');
  ctx.fillStyle = g;
  ctx.fillRect(0, hz, W, H - hz);
  for (let i = 0; i < 2600; i++) {
    const y = rng.range(hz + 8, H);
    const s = 0.5 + ((y - hz) / (H - hz)) * 1.1;
    ctx.fillStyle = rng.pick(['#7a7283', '#9a8f95', '#857b88', '#a39aa0', '#6f6878']);
    ctx.beginPath();
    ctx.ellipse(rng.range(0, W), y, 13 * s, 7 * s, 0, 0, TAU);
    ctx.fill();
  }
  // warm pools of lamplight on the cobbles
  for (let i = 0; i < 14; i++) {
    const y = rng.range(hz + 100, H - 60);
    const r = rng.range(160, 300);
    const cx = rng.range(0, W);
    const rg = ctx.createRadialGradient(cx, y, 0, cx, y, r);
    rg.addColorStop(0, 'rgba(255,205,120,0.38)');
    rg.addColorStop(1, 'rgba(255,205,120,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(cx, y, r, r * 0.45, 0, 0, TAU);
    ctx.fill();
  }
  // strings of lights across the sky
  for (let k = 0; k < 4; k++) {
    const y0 = rng.range(hz * 0.3, hz * 0.8);
    const sag = rng.range(40, 110);
    ctx.strokeStyle = 'rgba(30,30,40,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const pts: [number, number][] = [];
    for (let xx = 0; xx <= W; xx += 20) {
      const t = (xx % 800) / 800;
      const y = y0 + sag * 4 * t * (1 - t);
      pts.push([xx, y]);
      if (xx === 0) ctx.moveTo(xx, y);
      else ctx.lineTo(xx, y);
    }
    ctx.stroke();
    for (let i = 0; i < pts.length; i += 3) {
      const p = pts[i]!;
      ctx.fillStyle = ['#ffd36e', '#ff9b6b', '#fff1c1', '#9ee0d0'][i % 4]!;
      ctx.beginPath();
      ctx.arc(p[0], p[1] + 6, 6, 0, TAU);
      ctx.fill();
    }
  }
};

export const PAINTERS: Record<string, Painter> = { meadow, harbour, market };

export function paintBackground(
  ctx: Ctx2D,
  painter: string,
  seed: string,
  W: number,
  H: number,
  hz: number,
): void {
  const p = PAINTERS[painter] ?? meadow;
  p(ctx, W, H, hz, makeRng(seed + '#bg'));
}
