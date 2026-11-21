// The 12 fixed inputs whose spec hashes are stored in tests/golden/golden.json (ENG-A3).
// Shared by the Node test, the golden tool and the in-browser check on the dev page.
import { generate, specHash, type PackLogicData } from './logic';

export const GOLDEN_INPUTS: { seed: string; difficulty: number; worldId: string }[] = [
  { seed: 'daily-2026-12-01', difficulty: 2, worldId: 'meadow' },
  { seed: 'daily-2026-12-02', difficulty: 3, worldId: 'harbour' },
  { seed: 'daily-2026-12-03', difficulty: 3, worldId: 'market' },
  { seed: 'daily-2026-12-05', difficulty: 4, worldId: 'meadow' },
  { seed: 'daily-2026-12-06', difficulty: 5, worldId: 'harbour' },
  { seed: 'daily-2026-12-07', difficulty: 1, worldId: 'market' },
  { seed: 'explore-meadow-1', difficulty: 1, worldId: 'meadow' },
  { seed: 'explore-meadow-30', difficulty: 5, worldId: 'meadow' },
  { seed: 'explore-harbour-12', difficulty: 3, worldId: 'harbour' },
  { seed: 'explore-harbour-27', difficulty: 5, worldId: 'harbour' },
  { seed: 'explore-market-7', difficulty: 2, worldId: 'market' },
  { seed: 'explore-market-22', difficulty: 4, worldId: 'market' },
];

export interface GoldenEntry {
  seed: string;
  difficulty: number;
  worldId: string;
  hash: string;
}

export function computeGolden(pack: PackLogicData): GoldenEntry[] {
  return GOLDEN_INPUTS.map((i) => ({ ...i, hash: specHash(generate({ ...i, pack })) }));
}
