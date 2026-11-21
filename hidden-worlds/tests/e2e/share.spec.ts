import {
  DAY,
  doc,
  expect,
  items,
  playThrough,
  playUrl,
  seed,
  setClock,
  test,
  waitForPuzzle,
} from './fixtures';
import { encodeChallenge } from '../../src/game/challenge';

/** Force the no-Web-Share path and capture what reaches the clipboard. */
async function fakeClipboard(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    const w = window as unknown as { __copied: string[] };
    w.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: (t: string) => (w.__copied.push(t), Promise.resolve()) },
      configurable: true,
    });
  });
}
const copied = (page: import('@playwright/test').Page) =>
  page.evaluate(() => (window as unknown as { __copied: string[] }).__copied);

test.describe('sharing', () => {
  test('E2E-8: share falls back to the clipboard and confirms; the picture downloads', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await fakeClipboard(page);
    await page.goto(playUrl());
    await playThrough(page);
    await page.getByTestId('share-text').click();
    await expect(page.getByTestId('toast')).toHaveText('Copied to the clipboard');
    const text = (await copied(page))[0]!;
    expect(text).toMatch(
      /^Hidden Worlds No\. 3 · Night Market\n\d+ of \d+ found · \d+:\d\d · no hints · ★★★\nStreak 1\nhttp/,
    );
    // spoiler-free: no object names
    const names = (await items(page)).map((i) => i.spriteId);
    for (const n of names) expect(text.toLowerCase()).not.toContain(` ${n}`);

    const download = page.waitForEvent('download');
    await page.getByTestId('share-image').click();
    const d = await download;
    expect(d.suggestedFilename()).toBe(`hidden-worlds-${DAY}.png`);
    await expect(page.getByTestId('toast')).toHaveText('Picture saved');
    const events = await page.evaluate(() =>
      (
        window as unknown as { __hwTest: { events(): { event: string; props: Record<string, unknown> }[] } }
      ).__hwTest
        .events()
        .filter((e) => e.event === 'share')
        .map((e) => `${e.props.kind}:${e.props.method}`),
    );
    expect(events).toEqual(['text:clipboard', 'image:download']);

    await page.getByTestId('share-challenge').click();
    const link = (await copied(page))[1]!;
    expect(link).toMatch(/\?c=[0-9a-z.]+/);
  });

  test('E2E-8: a challenge link opens that day with a "Beat" banner and compares the results', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc());
    const code = encodeChallenge({ date: DAY, timeS: 161, misses: 2, hints: 0 });
    await page.goto(`./?c=${code}`);
    await expect(page).toHaveURL(new RegExp(`#/play/daily/${DAY}$`));
    expect(page.url()).not.toContain('?c=');
    await expect(page.getByTestId('challenge-banner')).toContainText('Beat 2:41');
    await playThrough(page);
    await expect(page.getByTestId('versus')).toContainText('2:41');
    const ev = await page.evaluate(() =>
      (
        window as unknown as { __hwTest: { events(): { event: string; props: Record<string, unknown> }[] } }
      ).__hwTest
        .events()
        .find((e) => e.event === 'challenge_open'),
    );
    expect(ev?.props).toMatchObject({ puzzle_no: 3, valid: true });
  });

  test('E2E-8: a malformed or out-of-range challenge link is ignored silently', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./?c=zz.not.a.link.00');
    await expect(page.getByTestId('play-today')).toBeVisible();
    await expect(page.getByTestId('challenge-banner')).toHaveCount(0);
    // a correctly signed link for a locked date is ignored too
    await page.goto(`./?c=${encodeChallenge({ date: '2026-11-01', timeS: 100, misses: 0, hints: 0 })}`);
    await expect(page.getByTestId('play-today')).toBeVisible();
    await page.goto(playUrl());
    await waitForPuzzle(page);
    await expect(page.getByTestId('challenge-banner')).toHaveCount(0);
  });

  test('a solved daily reopens as a finished world, not a replay', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await playThrough(page);
    const before = await page.evaluate(
      () =>
        (
          window as unknown as { __hwTest: { doc(): { stats: { played: number; completed: number } } } }
        ).__hwTest.doc().stats,
    );
    await page.getByTestId('result-home').click();
    await page.goto(playUrl());
    await waitForPuzzle(page);
    await expect(page.getByTestId('chip').filter({ has: page.locator('.chip-tick') })).toHaveCount(
      await page.getByTestId('chip').count(),
    );
    const after = await page.evaluate(
      () =>
        (
          window as unknown as { __hwTest: { doc(): { stats: { played: number; completed: number } } } }
        ).__hwTest.doc().stats,
    );
    expect(after).toEqual(before);
  });
});
