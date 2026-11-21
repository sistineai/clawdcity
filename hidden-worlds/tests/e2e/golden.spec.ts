// E2E-15 / ENG-A3: the same golden hashes come out of every browser engine.
import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';

const golden = JSON.parse(readFileSync('tests/golden/golden.json', 'utf8'));

test('golden engine check matches tests/golden/golden.json', async ({ page }) => {
  await page.goto('./#/dev');
  const pre = page.getByTestId('golden');
  await expect(pre).not.toHaveText('computing', { timeout: 30_000 });
  expect(JSON.parse((await pre.textContent()) ?? '[]')).toEqual(golden.entries);
});

test('dev bench renders with the sample PNG pack', async ({ page }) => {
  await page.goto('./?pack=sample-png#/dev');
  await expect(page.getByTestId('dev-stats')).toContainText('pack sample-png');
});
