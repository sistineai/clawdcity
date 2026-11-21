// A sprite drawn by the active pack onto a small canvas (tray chips, collection, cards).
import { useEffect, useRef } from 'react';
import { drawIcon } from '../../engine/render/draw';
import { useApp } from '../../state/store';
import { usePalette } from '../hooks';

export function SpriteIcon({
  spriteId,
  color,
  size,
  silhouette = false,
  label,
}: {
  spriteId: string;
  color: string | null;
  size: number;
  silhouette?: boolean;
  label?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pack = useApp((s) => s.pack);
  const palette = usePalette();
  useEffect(() => {
    const c = ref.current;
    if (!c || !pack) return;
    let live = true;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    void pack.art.ready([{ spriteId, color }]).then(() => {
      if (!live) return;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      drawIcon(ctx, pack, spriteId, color, size / 2, size / 2, size * 0.98, palette);
      if (silhouette) {
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#586c61';
        ctx.fillRect(0, 0, size, size);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    return () => {
      live = false;
    };
  }, [pack, spriteId, color, size, silhouette, palette]);
  return (
    <canvas
      ref={ref}
      className="sprite-icon"
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
