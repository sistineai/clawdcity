// `npm run verify`: the definition of done. Runs every stage in order, stops at the
// first failure and prints a summary table either way.
import { spawnSync } from 'node:child_process';

interface Stage {
  name: string;
  cmd: string;
}
const stages: Stage[] = [
  { name: 'typecheck', cmd: 'npm run -s typecheck' },
  { name: 'lint', cmd: 'npm run -s lint' },
  { name: 'unit', cmd: 'npm run -s test' },
  { name: 'build', cmd: 'npm run -s build' },
  { name: 'budget', cmd: 'npm run -s budget' },
  {
    name: 'pack-validate',
    cmd: 'npm run -s pack:validate -- vector && npm run -s pack:validate -- public/packs/sample-png',
  },
  { name: 'world-audit', cmd: 'npm run -s world:audit -- --days 30' },
  { name: 'e2e', cmd: 'npm run -s e2e' },
];

const results: { name: string; ok: boolean; s: number }[] = [];
let failed = false;
for (const st of stages) {
  console.log(`\n=== verify: ${st.name} ===\n$ ${st.cmd}`);
  const t0 = process.hrtime.bigint();
  const r = spawnSync(st.cmd, { shell: true, stdio: 'inherit' });
  const s = Number(process.hrtime.bigint() - t0) / 1e9;
  const ok = r.status === 0;
  results.push({ name: st.name, ok, s });
  if (!ok) {
    failed = true;
    break;
  }
}
console.log('\n=== verify summary ===');
console.log('stage           result   duration');
for (const r of results)
  console.log(`${r.name.padEnd(15)} ${(r.ok ? 'PASS' : 'FAIL').padEnd(8)} ${r.s.toFixed(1)}s`);
for (const st of stages.slice(results.length)) console.log(`${st.name.padEnd(15)} ${'NOT RUN'.padEnd(8)} -`);
console.log(failed ? '\nverify FAILED' : '\nverify PASSED');
process.exit(failed ? 1 : 0);
