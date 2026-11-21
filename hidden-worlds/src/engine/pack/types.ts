import type { PackLogicData } from '../logic';

/** The 2D context surface the renderer and painters use (browser canvas, offscreen, or Node). */
export type Ctx2D = CanvasRenderingContext2D;

/** Colour name -> hex for coloured sprites. Swapped for colour-blind mode; never affects placement. */
export type Palette = Record<string, string>;

export interface ArtKey {
  spriteId: string;
  color: string | null;
}

export interface DrawOpts {
  /** World size whose outline weight to use (masks are built at source size with play-size lines). */
  lineRefSize?: number;
}

/** The art half of a pack (PACK-1). The engine never calls this; the renderer does. */
export interface SpriteArt {
  kind: 'vector' | 'png';
  /** Draw a sprite centred at the origin, unrotated, with its box's longer side `size` px. */
  draw(
    ctx: Ctx2D,
    spriteId: string,
    color: string | null,
    size: number,
    palette: Palette,
    opts?: DrawOpts,
  ): void;
  /** Resolves when the art for these sprites (default: all) is decoded and drawable. */
  ready(items?: readonly ArtKey[]): Promise<void>;
  /** Background painter for a world. */
  background: (worldId: string) => string;
}

export interface SpritePack {
  id: string;
  name: string;
  credits: string;
  logic: PackLogicData;
  art: SpriteArt;
}
