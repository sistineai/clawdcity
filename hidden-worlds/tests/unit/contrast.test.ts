// SHELL-6: text colour pairs used by the UI meet 4.5:1 (WCAG AA for body text).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = Object.fromEntries(
  [...readFileSync('src/ui/styles/tokens.css', 'utf8').matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map(
    (m) => [m[1]!, m[2]!],
  ),
);
const lum = (hex: string) => {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
const ratio = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
// [text, background] as used in the stylesheets
const PAIRS: [string, string][] = [
  ['ink', 'paper'],
  ['ink', 'card'],
  ['ink-soft', 'paper'],
  ['muted', 'paper'],
  ['muted', 'card'],
  ['muted', 'paper-deep'],
  ['on-spruce', 'spruce'],
  ['on-spruce-muted', 'spruce'],
  ['ink', 'gold'],
  ['paper', 'ink'],
  ['ink', 'found'],
  ['flare-deep', 'card'],
  ['gold-deep', 'card'],
  ['on-spruce', 'spruce-deep'],
];

describe('text contrast', () => {
  for (const [fg, bg] of PAIRS)
    it(`${fg} on ${bg} >= 4.5:1`, () => {
      expect(tokens[fg], fg).toBeDefined();
      expect(tokens[bg], bg).toBeDefined();
      expect(ratio(tokens[fg]!, tokens[bg]!)).toBeGreaterThanOrEqual(4.5);
    });
});
