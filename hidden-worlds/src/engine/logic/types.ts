// Plain data types shared by the logic layer, the renderer and the pack loaders.

export type SpriteKind = 'small' | 'occluder' | 'sky' | 'resident';
export type Rarity = 'common' | 'uncommon' | 'rare';
export type Role = 'target' | 'decoy' | 'clutter' | 'occluder' | 'sky' | 'resident';

/** 1 bit per pixel, row-major, MSB first, at half the source resolution. */
export interface MaskData {
  w: number;
  h: number;
  bits: Uint8Array;
}

/** Everything the engine needs to know about one sprite. No art. */
export interface SpriteLogic {
  id: string;
  kind: SpriteKind;
  name: string;
  /** Source image size in pixels. */
  w: number;
  h: number;
  /** The point that touches the ground, in source pixels. */
  anchor: [number, number];
  /** World pixels of the longer side at size multiplier 1. */
  baseSize: number;
  colored: boolean;
  allowRotate: boolean;
  allowFlip: boolean;
  /** Small sprites that may also float in the sky (kites, balloons, stars). */
  skyOk?: boolean;
  /** Optional decorative tints for uncoloured sprites; the engine picks one and the art may use it. */
  tints?: string[];
  /** Relative frequency when chosen as an occluder. Default 1. */
  weight?: number;
  rarity?: Rarity;
  description?: string;
  mask: MaskData;
}

export interface WorldLogic {
  id: string;
  name: string;
  background: { painter: string };
  /** Fraction of the world height. */
  horizon: number;
  occluders: string[];
  /** Relative weights by small sprite id. Omitted ids default to 1; 0 excludes. */
  smalls: Record<string, number>;
  sky: string[];
  residents: string[];
}

export interface PackLogicData {
  id: string;
  version: number;
  colors: string[];
  sprites: SpriteLogic[];
  worlds: WorldLogic[];
}

export interface GenerateInput {
  seed: string;
  difficulty: number;
  worldId: string;
  pack: PackLogicData;
}

export interface SpriteSpec {
  uid: number;
  spriteId: string;
  role: Role;
  /** Colour name for coloured sprites, a tint for tinted ones, otherwise null. */
  color: string | null;
  /** Centre of the sprite box, world pixels. */
  x: number;
  y: number;
  /** World pixels of the box's longer side. */
  size: number;
  /** Index into the rotation table, -4..4 (0.1 rad per step). */
  rotStep: number;
  flip: boolean;
  /** Sky layer order (higher draws later). 0 for ground sprites. */
  z: number;
  /** Forced to the front by the repair loop. */
  front: boolean;
}

export interface FoundTarget {
  uid: number;
  visibility: number;
}

export interface PuzzleStats {
  passes: number;
  moved: number;
  forced: number;
  counts: Record<Role, number>;
}

export interface PuzzleSpec {
  engineVersion: number;
  packId: string;
  packVersion: number;
  seed: string;
  difficulty: number;
  worldId: string;
  W: number;
  H: number;
  horizon: number;
  sprites: SpriteSpec[];
  order: number[];
  targets: FoundTarget[];
  resident: FoundTarget | null;
  stats: PuzzleStats;
}
