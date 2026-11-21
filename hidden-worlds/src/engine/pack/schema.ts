// Zod schema for pack.json (CONTENT_PACK.md). Used by loaders, the build tool and the validator.
import { z } from 'zod';

const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase [a-z0-9-]');
export const MaskEntry = z.object({
  offset: z.number().int().min(0),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
});

export const SpriteEntry = z.object({
  id,
  kind: z.enum(['small', 'occluder', 'sky', 'resident']),
  name: z.string().min(1),
  description: z.string().optional(),
  rarity: z.enum(['common', 'uncommon', 'rare']).optional(),
  w: z.number().int().positive(),
  h: z.number().int().positive(),
  anchor: z.tuple([z.number(), z.number()]),
  baseSize: z.number().positive(),
  colored: z.boolean(),
  files: z.record(z.string(), z.string()).optional(),
  file: z.string().optional(),
  allowRotate: z.boolean(),
  allowFlip: z.boolean(),
  skyOk: z.boolean().optional(),
  tints: z.array(z.string()).optional(),
  weight: z.number().min(0).optional(),
  /** Vector pack only: the resident's own body colour. */
  color: z.string().optional(),
  mask: MaskEntry.optional(),
});

export const WorldEntry = z.object({
  id,
  name: z.string().min(1),
  background: z.object({ painter: z.string() }),
  horizon: z.number().min(0.1).max(0.6),
  occluders: z.array(z.string()),
  smalls: z.record(z.string(), z.number().min(0)),
  sky: z.array(z.string()),
  residents: z.array(z.string()),
});

export const PackManifest = z.object({
  id,
  version: z.number().int().positive(),
  name: z.string().min(1),
  credits: z.string(),
  art: z.enum(['png', 'vector']).default('png'),
  pixelScale: z.number().positive().default(1),
  colors: z.array(z.string()).min(1),
  sprites: z.array(SpriteEntry).min(1),
  worlds: z.array(WorldEntry).min(1),
});
export type PackManifest = z.infer<typeof PackManifest>;
export type SpriteEntry = z.infer<typeof SpriteEntry>;
