// BUD-1: initial JavaScript <= 250 KB gzipped; total precached assets <= 3 MB.
// Also proves the E2E test hook is absent from the production bundle.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { BUDGET } from '../src/config.ts';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const scripts = [
  ...html.matchAll(/<(?:script[^>]*src|link[^>]*rel="modulepreload"[^>]*href)="\.?\/?([^"]+\.js)"/g),
].map((m) => m[1] as string);
let initialGz = 0;
for (const s of new Set(scripts)) initialGz += gzipSync(readFileSync(join(dist, s))).length;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const files = walk(dist);
// The precache list is what the service worker downloads. If the SW exists, read it; otherwise count everything
// except the optional sample PNG pack, which is fetched on demand only.
let precacheBytes = 0;
const swPath = join(dist, 'sw.js');
const precached = new Set<string>();
if (existsSync(swPath)) {
  const sw = readFileSync(swPath, 'utf8');
  for (const m of sw.matchAll(/url:"([^"]+)"/g)) precached.add((m[1] as string).replace(/^\.\//, ''));
}
for (const f of files) {
  const rel = relative(dist, f).split('\\').join('/');
  const counted = precached.size ? precached.has(rel) : !rel.startsWith('packs/sample-png/');
  if (counted) precacheBytes += statSync(f).size;
}
const hookLeaks = files.filter((f) => f.endsWith('.js') && readFileSync(f, 'utf8').includes('__hwTest'));

const jsKb = initialGz / 1024;
const mb = precacheBytes / 1024 / 1024;
console.log(
  `initial JS (gzip): ${jsKb.toFixed(1)} KB (budget ${BUDGET.initialJsGzipKb} KB) from ${scripts.length} file(s)`,
);
console.log(
  `precached assets: ${mb.toFixed(2)} MB (budget ${BUDGET.precacheMb} MB) over ${precached.size || 'all'} entries`,
);
console.log(
  `E2E hook in production bundle: ${hookLeaks.length ? 'PRESENT in ' + hookLeaks.join(', ') : 'absent'}`,
);
const ok =
  scripts.length > 0 && jsKb <= BUDGET.initialJsGzipKb && mb <= BUDGET.precacheMb && hookLeaks.length === 0;
console.log(ok ? 'budget OK' : 'budget FAILED');
process.exit(ok ? 0 : 1);
