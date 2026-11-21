// ENG-A6: nothing under src/engine/logic may reach outside it (except the pure config
// module and type-only imports) or use the DOM, canvas, clocks or banned Math functions.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = 'src/engine/logic';
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
// every file under logic, including subfolders
const files = walk(dir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.slice(dir.length + 1));
const banned = [
  /\bdocument\b/,
  /\bwindow\b/,
  /\bnavigator\b/,
  /CanvasRenderingContext2D/,
  /\bPath2D\b/,
  /OffscreenCanvas/,
  /\bDate\b/,
  /\bperformance\b/,
  /\blocalStorage\b/,
  /Math\.(sin|cos|tan|atan2?|asin|acos|pow|sqrt|cbrt|exp|expm1|log\w*|random|hypot|fround|sinh|cosh|tanh)\b/,
  /\*\*/,
];
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

export function purityProblems(file: string, src: string): string[] {
  const out: string[] = [];
  const code = stripComments(src);
  for (const m of code.matchAll(/^\s*(import|export)\s+(type\s+)?[^'"]*?from\s+['"]([^'"]+)['"]/gm)) {
    const typeOnly = Boolean(m[2]);
    const from = m[3]!;
    if (typeOnly) continue;
    if (from.startsWith('./')) continue;
    if (from === '../../config') continue;
    out.push(`${file}: imports "${from}"`);
  }
  for (const m of code.matchAll(/\bimport\s*\(/g)) out.push(`${file}: dynamic import at ${m.index}`);
  for (const m of code.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm))
    out.push(`${file}: side-effect import "${m[1]}"`);
  if (/\b(COLORS|COLORS_CB|Palette|palette)\b/.test(code)) out.push(`${file}: refers to display colours`);
  for (const re of banned) if (re.test(code)) out.push(`${file}: uses ${re}`);
  return out;
}

describe('engine logic purity', () => {
  it('has files to check', () => expect(files.length).toBeGreaterThan(3));
  it('imports nothing outside logic and uses no banned globals', () => {
    const problems = files.flatMap((f) => purityProblems(f, readFileSync(join(dir, f), 'utf8')));
    expect(problems).toEqual([]);
  });
  it('the checker catches violations', () => {
    expect(purityProblems('x.ts', "import { a } from '../render/draw';").length).toBe(1);
    expect(purityProblems('x.ts', 'const v = Math.sin(1);').length).toBe(1);
    expect(purityProblems('x.ts', 'const t = Date.now();').length).toBe(1);
    expect(purityProblems('x.ts', 'document.body;').length).toBe(1);
    expect(purityProblems('x.ts', "import type { T } from '../pack/types';").length).toBe(0);
    expect(purityProblems('x.ts', "import { ENGINE } from '../../config';").length).toBe(0);
    expect(purityProblems('x.ts', "import './polyfill';").length).toBe(1);
    expect(purityProblems('x.ts', 'const p = COLORS_CB.red;').length).toBe(1);
  });
  it('config.ts, the one outside module logic imports, has no imports of its own', () => {
    expect(readFileSync('src/config.ts', 'utf8')).not.toMatch(/^\s*import\s/m);
  });
});
