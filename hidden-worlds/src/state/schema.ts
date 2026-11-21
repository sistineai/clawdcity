// The saved document (META-5): one versioned JSON object under `hw:v1`.
import { z } from 'zod';
import { SCHEMA_VERSION } from '../config';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const count = z.number().int().min(0);

export const Settings = z.object({
  sound: z.boolean(),
  haptics: z.boolean(),
  relaxed: z.boolean(),
  colorBlind: z.boolean(),
  reducedMotion: z.enum(['system', 'on', 'off']),
});

export const ChallengeData = z.object({ date: dateKey, timeS: count, misses: count, hints: count });

export const ActivePuzzle = z.object({
  found: z.array(count),
  resident: z.boolean(),
  misses: count,
  hints: count,
  elapsedMs: count,
  startedOn: dateKey,
  updatedAt: count,
  challenge: ChallengeData.optional(),
});

export const DailyResult = z.object({
  stars: z.number().int().min(1).max(3),
  timeMs: count,
  misses: count,
  hints: count,
  resident: z.string().nullable(),
  late: z.boolean(),
  completedAt: count,
  world: z.string(),
  difficulty: z.number().int().min(1).max(5),
  challenge: ChallengeData.optional(),
});

export const SaveDoc = z.object({
  v: z.literal(SCHEMA_VERSION),
  deviceId: z.string().min(8),
  firstOpen: count,
  lastOpen: count,
  onboarded: z.boolean(),
  settings: Settings,
  daily: z.record(dateKey, DailyResult),
  active: z.record(z.string(), ActivePuzzle),
  explore: z.record(z.string(), z.record(z.string(), z.number().int().min(1).max(3))),
  residents: z.record(z.string(), z.object({ count: z.number().int().min(1), first: dateKey })),
  streak: z.object({ current: count, best: count, last: dateKey.nullable() }),
  stats: z.object({
    played: count,
    completed: count,
    totalTimeMs: count,
    bestTimeMs: count.nullable(),
    threeStars: count,
  }),
  premiumInterest: z.object({ source: z.string(), at: count }).nullable(),
  worldsAnnounced: z.array(z.string()),
  installNudgeShown: z.boolean(),
});

export type Settings = z.infer<typeof Settings>;
export type ActivePuzzle = z.infer<typeof ActivePuzzle>;
export type DailyResult = z.infer<typeof DailyResult>;
export type ChallengeData = z.infer<typeof ChallengeData>;
export type SaveDoc = z.infer<typeof SaveDoc>;

export function freshDoc(nowMs: number, deviceId: string): SaveDoc {
  return {
    v: SCHEMA_VERSION,
    deviceId,
    firstOpen: nowMs,
    lastOpen: nowMs,
    onboarded: false,
    settings: { sound: true, haptics: true, relaxed: false, colorBlind: false, reducedMotion: 'system' },
    daily: {},
    active: {},
    explore: {},
    residents: {},
    streak: { current: 0, best: 0, last: null },
    stats: { played: 0, completed: 0, totalTimeMs: 0, bestTimeMs: null, threeStars: 0 },
    premiumInterest: null,
    worldsAnnounced: ['meadow'],
    installNudgeShown: false,
  };
}
