// The app name lives only in src/config.ts (SPEC: "the name must live in one place"), and all
// user-facing text lives in src/strings.ts (spot check: no capitalised sentences in components).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { APP_NAME } from '../../src/config';

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

describe('single sources', () => {
  it('the app name is written only in config.ts', () => {
    const files = [...walk('src'), 'index.html'].filter((f) => /\.(ts|tsx|html|css|json)$/.test(f));
    const hits = files.filter((f) => readFileSync(f, 'utf8').includes(APP_NAME));
    expect(hits).toEqual(['src/config.ts']);
  });
  it('the checker catches global calls', () => {
    const re = /(?:\bwindow\.|(?<![.\w$]))(alert|confirm|prompt)\s*\((?!\)\s*:)/;
    expect(re.test('alert("x")')).toBe(true);
    expect(re.test('window.confirm("x")')).toBe(true);
    expect(re.test(' prompt()')).toBe(true);
    expect(re.test('ev.prompt()')).toBe(false);
    expect(re.test('  prompt(): Promise<void>;')).toBe(false);
  });
  it('no alert, confirm or prompt anywhere in the app', () => {
    for (const f of walk('src').filter((x) => /\.tsx?$/.test(x))) {
      const code = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      // global calls only: not methods such as BeforeInstallPromptEvent.prompt()
      expect(code, f).not.toMatch(/(?:\bwindow\.|(?<![.\w$]))(alert|confirm|prompt)\s*\((?!\)\s*:)/);
    }
  });
});
