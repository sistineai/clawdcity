// TOOL-3 / PACK-5: `npm run pack:validate -- <dir|vector>`. Prints every problem with file and
// field; exits non-zero on any.
import { validatePack } from './lib/validate.ts';

const target = process.argv[2] ?? 'vector';
const problems = await validatePack(target);
for (const p of problems) console.log(`${p.code.padEnd(18)} ${p.file}  [${p.field}]  ${p.message}`);
console.log(problems.length ? `\n${target}: ${problems.length} problem(s)` : `${target}: valid`);
process.exit(problems.length ? 1 : 0);
