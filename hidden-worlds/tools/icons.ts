// App icons for the manifest and iOS, drawn in code: a magnifier over a spruce tag.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createCanvas } from './lib/canvas.ts';

mkdirSync('public/icons', { recursive: true });
function icon(size: number, maskable: boolean): Buffer {
  const c = createCanvas(size, size);
  const x = c.getContext('2d');
  const s = size / 64;
  x.fillStyle = '#1b3a30';
  if (maskable) x.fillRect(0, 0, size, size);
  else {
    x.beginPath();
    x.roundRect(0, 0, size, size, 14 * s);
    x.fill();
  }
  // keep the glyph inside the maskable safe zone (inner 80%)
  const k = maskable ? 0.78 : 1;
  x.translate(size / 2, size / 2);
  x.scale(k * s, k * s);
  x.translate(-32, -32);
  x.strokeStyle = '#ffb81c';
  x.lineCap = 'round';
  x.lineWidth = 6;
  x.beginPath();
  x.arc(28, 28, 15, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(39, 39);
  x.lineTo(52, 52);
  x.stroke();
  x.fillStyle = '#f1f5ea';
  x.beginPath();
  x.arc(28, 28, 5, 0, Math.PI * 2);
  x.fill();
  return c.toBuffer('image/png');
}
writeFileSync('public/icons/icon-192.png', icon(192, false));
writeFileSync('public/icons/icon-512.png', icon(512, false));
writeFileSync('public/icons/icon-maskable-512.png', icon(512, true));
writeFileSync('public/icons/apple-touch-icon.png', icon(180, true));
console.log('icons written');
