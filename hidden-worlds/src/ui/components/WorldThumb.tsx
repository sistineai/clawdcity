// A small painting of a world's background (no sprites, so it never gives anything away).
import { useEffect, useRef } from 'react';
import { WORLD_H, WORLD_W } from '../../config';
import { paintBackground } from '../../engine/render/backgrounds';
import { useApp } from '../../state/store';

const HORIZONS: Record<string, number> = { meadow: 0.25, harbour: 0.29, market: 0.27 };

export function WorldThumb({
  world,
  seed,
  className = '',
  locked = false,
}: {
  world: string;
  seed: string;
  className?: string;
  locked?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pack = useApp((s) => s.pack);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const w = pack?.logic.worlds.find((x) => x.id === world);
    const painter = w?.background.painter ?? world;
    const horizon = w?.horizon ?? HORIZONS[world] ?? 0.25;
    const scale = 0.15;
    c.width = Math.round(WORLD_W * scale);
    c.height = Math.round(WORLD_H * scale);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.scale(scale, scale);
    paintBackground(ctx, painter, seed, WORLD_W, WORLD_H, Math.round(WORLD_H * horizon));
    ctx.restore();
    if (locked) {
      ctx.fillStyle = 'rgba(19,35,29,0.55)';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    return () => {
      c.width = 0;
      c.height = 0;
    };
  }, [pack, world, seed, locked]);
  return <canvas ref={ref} className={`world-thumb ${className}`} aria-hidden="true" />;
}
