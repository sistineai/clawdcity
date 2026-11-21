// TOOL-5: `npm run calendar -- --days 30`. The coming daily puzzles, one line each.
import { indexPack } from '../src/engine/logic/index.ts';
import { generate } from '../src/engine/logic/index.ts';
import {
  addDays,
  dailyDifficulty,
  dailySeed,
  dailyWorld,
  puzzleNumber,
  todayKey,
  weekday,
} from '../src/game/dates.ts';
import { loadPackNode } from './lib/node-pack.ts';
import { checkSpec } from './lib/invariants.ts';

const arg = (k: string, d: string) => {
  const i = process.argv.indexOf('--' + k);
  return i > 0 ? (process.argv[i + 1] as string) : d;
};
const days = Number(arg('days', '30'));
const start = arg('from', todayKey(Date.now()));
const pack = await loadPackNode(arg('pack', 'vector'));
const ix = indexPack(pack.logic);
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let bad = 0;
console.log('date        no.      day  world         diff  targets  resident');
for (let i = 0; i < days; i++) {
  const k = addDays(start, i);
  const no = puzzleNumber(k);
  let line = `${k}  ${(no === null ? 'Preview' : `No. ${no}`).padEnd(8)} ${WD[weekday(k)]}  ${dailyWorld(k).padEnd(12)}  ${dailyDifficulty(k)}     `;
  try {
    const spec = generate({
      seed: dailySeed(k),
      difficulty: dailyDifficulty(k),
      worldId: dailyWorld(k),
      pack: pack.logic,
    });
    const f: string[] = [];
    checkSpec(spec, pack.logic, f);
    const res = spec.resident ? ix.byId.get(spec.sprites[spec.resident.uid]!.spriteId)!.name : '-';
    line += `${String(spec.targets.length).padEnd(8)} ${res}`;
    if (f.length) {
      bad++;
      line += `   FLAG: ${f[0]}`;
    }
  } catch (e) {
    bad++;
    line += `FLAG: failed to generate (${String(e)})`;
  }
  console.log(line);
}
console.log(bad ? `\n${bad} day(s) flagged` : '\nevery day generates cleanly');
process.exit(bad ? 1 : 0);
