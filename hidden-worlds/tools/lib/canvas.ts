// Node canvas setup for tools and tests (@napi-rs/canvas).
import { createCanvas, loadImage, Path2D, type Canvas, type SKRSContext2D } from '@napi-rs/canvas';
import { setPath2D } from '../../src/packs/vector/art.ts';
import type { Ctx2D } from '../../src/engine/pack/types.ts';

setPath2D(Path2D as unknown as new (d?: string) => globalThis.Path2D);
(globalThis as unknown as { Path2D: unknown }).Path2D = Path2D;

export { createCanvas, loadImage };
export type { Canvas };
export const ctx2d = (c: Canvas): Ctx2D => c.getContext('2d') as unknown as Ctx2D;
export type NodeCtx = SKRSContext2D;
