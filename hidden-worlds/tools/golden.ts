// Regenerate tests/golden/golden.json. Only run this when puzzle output is meant to change,
// together with an ENGINE_VERSION bump and a DECISIONS.md line (CLAUDE.md rule 2).
import { writeFileSync } from 'node:fs';
import { computeGolden } from '../src/engine/golden.ts';
import { ENGINE_VERSION } from '../src/config.ts';
import { loadPackNode } from './lib/node-pack.ts';

const pack = await loadPackNode('vector');
const entries = computeGolden(pack.logic);
const doc = {
  engineVersion: ENGINE_VERSION,
  packId: pack.logic.id,
  packVersion: pack.logic.version,
  entries,
};
writeFileSync('tests/golden/golden.json', JSON.stringify(doc, null, 2) + '\n');
console.log(entries.map((e) => `${e.seed} d${e.difficulty} ${e.worldId} ${e.hash}`).join('\n'));
