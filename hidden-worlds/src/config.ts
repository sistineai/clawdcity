// Every tunable number lives here. Engine-facing values are plain data so the pure
// logic layer can import this module without touching the DOM.

/** The working title. This is the only place the name is written. */
export const APP_NAME = 'Hidden Worlds';
export const APP_SHORT_NAME = APP_NAME;
/** File-name form of the name, for downloads. */
export const APP_SLUG = APP_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-');
export const APP_DESCRIPTION =
  'A new seek-and-find puzzle every day. Pan around a hand-built world and spot what is hiding.';
export const APP_VERSION = '1.0.0';
export const THEME_COLOR = '#1b3a30';
export const BACKGROUND_COLOR = '#f1f5ea';

/** Bump whenever generate() output changes for an existing seed. */
export const ENGINE_VERSION = 1;

export const DEFAULT_PACK = 'vector';

// ---------- engine ----------
export const WORLD_W = 3200;
export const WORLD_H = 2000;
/** ID map resolution relative to the world. Masks are stored at the same density. */
export const ID_SCALE_NUM = 1;
export const ID_SCALE_DEN = 2;
/** Sizes snap to multiples of this many world pixels (one ID-map pixel). */
export const SIZE_STEP = 2;

export interface DifficultyConfig {
  targets: number;
  decoys: number;
  clutter: number;
  occluders: number;
  clouds: number;
  minVis: number;
  tuck: number;
  sizeMul: number;
  overlap: number;
  targetOverlap: number;
}

/** The prototype's tuning, interpolated by u = (d - 1) / 4. */
export const DIFFICULTY = {
  targetsBase: 5,
  decoysBase: -1,
  clutter: [150, 440],
  occluders: [24, 42],
  clouds: 7,
  minVis: [0.92, 0.5],
  tuck: [0, 0.7],
  sizeMul: [1.2, 0.86],
  overlap: [0.02, 0.3],
  targetOverlap: [0, 0.16],
} as const;

export const ENGINE = {
  repairPasses: 10,
  tuckedRetries: 2,
  tuckAttempts: 50,
  placeAttempts: 60,
  occluderAttempts: 24,
  tuckVisMargin: 0.04,
  tuckVisMax: 0.9,
  smallBaseSize: 58,
  skyBaseSize: 56,
  clutterTuckChance: 0.25,
  skyChance: 0.6,
  depthNear: 1.34,
  depthFar: 0.62,
  /** Residents tilt less than objects. */
  residentRotSteps: 1,
  minOwnedPixels: 20,
} as const;

// ---------- play ----------
export const PLAY = {
  maxZoom: 3,
  tapSlopPx: 8,
  tapMaxMs: 300,
  /** Forgiving tap radius in screen pixels; converted to world pixels at the current zoom. */
  tapRadiusScreenPx: 22,
  tapRadiusMinWorld: 10,
  tapRadiusMaxWorld: 90,
  lockoutMisses: 3,
  lockoutWindowMs: 2000,
  lockoutMs: 3000,
  freeHints: 1,
  hintMs: 4000,
  hintRingFraction: 0.12,
  doubleTapMs: 320,
  zoomStep: 1.6,
  saveEveryMs: 2000,
  sharpRedrawDelayMs: 140,
  maxDpr: 2,
} as const;

export const STARS = { noHintsMaxMisses: 2 } as const;

// ---------- daily ----------
export const LAUNCH_DATE = '2026-12-01';
/** Index 0 = Sunday. Mon 1, Tue 2, Wed 2, Thu 3, Fri 3, Sat 4, Sun 5. */
export const WEEKDAY_DIFFICULTY = [5, 1, 2, 2, 3, 3, 4] as const;
export const ARCHIVE_FREE_DAYS = 7;
/** How many locked older days the archive lists below the free window. */
export const ARCHIVE_LOCKED_SHOWN = 14;
export const HISTORY_KEEP_DAYS = 60;

// ---------- explore ----------
export const EXPLORE_LEVELS = 30;
/** Highest level number (inclusive) for each difficulty. */
export const EXPLORE_DIFFICULTY_BANDS = [
  { upTo: 4, difficulty: 1 },
  { upTo: 10, difficulty: 2 },
  { upTo: 18, difficulty: 3 },
  { upTo: 25, difficulty: 4 },
  { upTo: 30, difficulty: 5 },
] as const;

export const WORLD_ORDER = ['meadow', 'harbour', 'market'] as const;
export type WorldId = (typeof WORLD_ORDER)[number];
/** Distinct residents needed to open each world in Explore. */
export const WORLD_UNLOCK: Record<WorldId, number> = { meadow: 0, harbour: 3, market: 6 };

export const RARITY_WEIGHT = { common: 30, uncommon: 30, rare: 10 } as const;

// ---------- premium ----------
export const PREMIUM_PRICE = '$4.99 a month';

// ---------- share ----------
export const SHARE_IMAGE = { w: 1080, h: 1350 } as const;
export const CHALLENGE = { maxTimeS: 24 * 3600, maxMisses: 999, maxHints: 99 } as const;

// ---------- shell ----------
export const INSTALL_NUDGE_AFTER = 2;
export const STORAGE_KEY = 'hw:v1';
export const STORAGE_BACKUP_KEY = 'hw:backup';
export const SCHEMA_VERSION = 1;

// ---------- budgets ----------
export const BUDGET = { initialJsGzipKb: 250, precacheMb: 3 } as const;
