import { DAY, NOW, doc, expect, playThrough, playUrl, seed, setClock, test } from './fixtures';
import { STORAGE_BACKUP_KEY, STORAGE_KEY } from '../../src/config';

const plusDays = (n: number) => new Date(NOW.getTime() + n * 86400000);
const keyOf = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

test.describe('progress', () => {
  test('E2E-5: today then tomorrow makes a streak of 2; skipping a day resets it', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await playThrough(page);
    await expect(page.getByTestId('result-streak')).toHaveText('1');

    await page.clock.setSystemTime(plusDays(1));
    await page.goto(`./#/play/daily/${keyOf(plusDays(1))}`);
    await playThrough(page);
    await expect(page.getByTestId('result-streak')).toHaveText('2');
    await page.getByTestId('result-home').click();
    await expect(page.getByTestId('home-streak')).toContainText('2');

    // skip a day: on open the streak shows 0, and the next completion starts again at 1
    await page.clock.setSystemTime(plusDays(3));
    await page.goto('./#/');
    await expect(page.getByTestId('home-streak')).toContainText('0');
    await page.getByTestId('play-today').click();
    await playThrough(page);
    await expect(page.getByTestId('result-streak')).toHaveText('1');
    await page.goto('./#/stats');
    await expect(page.getByTestId('stat-best-streak')).toHaveText('2');
    await expect(page.getByTestId('stat-completed')).toHaveText('3');
  });

  test('E2E-11: a corrupt save starts fresh and keeps a backup', async ({ page }) => {
    await setClock(page);
    const bad = '{"v":1,"deviceId":"x","daily":"oops"';
    await seed(page, bad);
    await page.goto('./');
    await expect(page.getByTestId('world')).toBeVisible();
    const st = await page.evaluate(
      ([k, b]) => ({ main: localStorage.getItem(k), backup: localStorage.getItem(b) }),
      [STORAGE_KEY, STORAGE_BACKUP_KEY] as const,
    );
    expect(st.backup).toBe(bad);
    expect(JSON.parse(st.main!).v).toBe(1);
  });

  test('META-3: the collection shows found residents as entries and unfound ones as silhouettes', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc({ residents: { odo: { count: 3, first: DAY } } }));
    await page.goto('./#/collection');
    await expect(page.getByTestId('resident-odo')).toHaveAttribute('data-found', 'true');
    await expect(page.getByTestId('resident-odo')).toContainText('Odo');
    await expect(page.getByTestId('resident-odo')).toContainText('Found 3 times');
    await expect(page.getByTestId('resident-sol')).toHaveAttribute('data-found', 'false');
    await expect(page.getByTestId('resident-sol')).toContainText('Rare');
    await expect(page.getByTestId('resident-sol')).not.toContainText('Sol');
  });

  test('WORLD-4: finding all four of a world marks it complete with a badge', async ({ page }) => {
    await setClock(page);
    const r = { count: 1, first: DAY };
    await seed(page, doc({ residents: { mossy: r, bram: r, tuck: r, wren: r } }));
    await page.goto('./#/explore');
    await expect(page.getByTestId('badge-meadow')).toBeVisible();
    await expect(page.getByTestId('badge-harbour')).toHaveCount(0);
  });
});
