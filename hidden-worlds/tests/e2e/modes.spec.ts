import { DAY, doc, expect, playThrough, playUrl, seed, setClock, test, waitForPuzzle } from './fixtures';

const back = (n: number) => {
  const d = new Date(`${DAY}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

test.describe('daily, archive and Explore', () => {
  test('DAILY-8: after solving, Home shows the result and a countdown', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await playThrough(page);
    await page.getByTestId('result-home').click();
    await expect(page.getByTestId('today-done')).toBeVisible();
    // 10:00 local, so 14 hours to go
    await expect(page.getByTestId('countdown')).toHaveText(/^1[34]:\d\d:\d\d$/);
    await expect(page.getByTestId('home-streak')).toContainText('1');
  });

  test('E2E-6: yesterday is playable from the archive; ten days back is locked and opens Premium', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./#/archive');
    const y = page.getByTestId(`archive-${back(1)}`);
    await expect(y).toHaveAttribute('data-locked', 'false');
    await y.click();
    await expect(page).toHaveURL(new RegExp(`#/play/daily/${back(1)}$`));
    await waitForPuzzle(page);
    await page.goto('./#/archive');
    const old = page.getByTestId(`archive-${back(10)}`);
    await expect(old).toHaveAttribute('data-locked', 'true');
    await old.click();
    await expect(page).toHaveURL(/#\/premium\?source=archive/);
    await expect(page.getByTestId('premium-not-yet')).toBeVisible();
    // a locked date cannot be opened by URL either
    await page.goto(`./#/play/daily/${back(10)}`);
    await expect(page).toHaveURL(/#\/premium\?source=archive/);
  });

  test('ARCH-1: an archive puzzle completes as late and does not touch the streak', async ({ page }) => {
    await setClock(page);
    await seed(page, doc({ streak: { current: 4, best: 4, last: back(1) } }));
    await page.goto(playUrl(back(2)));
    await playThrough(page);
    const d = await page.evaluate(() =>
      (
        window as unknown as {
          __hwTest: { doc(): { daily: Record<string, { late: boolean }>; streak: { current: number } } };
        }
      ).__hwTest.doc(),
    );
    expect(d.daily[back(2)]!.late).toBe(true);
    expect(d.streak.current).toBe(4);
  });

  test('E2E-7: level 2 is locked until level 1 is done', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./#/explore/meadow');
    await expect(page.getByTestId('level-2')).toBeDisabled();
    await page.goto('./#/play/explore/meadow/2');
    await expect(page).toHaveURL(/#\/explore\/meadow$/);
    await page.getByTestId('level-1').click();
    await playThrough(page);
    await page.goto('./#/explore/meadow');
    await expect(page.getByTestId('level-2')).toBeEnabled();
    await expect(page.getByTestId('level-3')).toBeDisabled();
  });

  test('E2E-7: Harbour is locked until 3 residents are in the collection', async ({ page }) => {
    await setClock(page);
    await seed(page, doc({ residents: { mossy: { count: 1, first: DAY }, bram: { count: 2, first: DAY } } }));
    await page.goto('./#/explore');
    await expect(page.getByTestId('world-harbour')).toHaveAttribute('data-locked', 'true');
    await expect(page.getByTestId('world-harbour')).toContainText('2 of 3');
    await page.goto('./#/explore/harbour');
    await expect(page).toHaveURL(/#\/explore$/);
  });

  test('E2E-7: with 3 residents Harbour opens; Night Market still needs 6', async ({ page }) => {
    await setClock(page);
    await seed(
      page,
      doc({
        residents: {
          mossy: { count: 1, first: DAY },
          bram: { count: 1, first: DAY },
          tuck: { count: 1, first: DAY },
        },
      }),
    );
    await page.goto('./#/explore');
    await expect(page.getByTestId('world-harbour')).toHaveAttribute('data-locked', 'false');
    await expect(page.getByTestId('world-market')).toHaveAttribute('data-locked', 'true');
    await page.getByTestId('world-harbour').click();
    await expect(page.getByTestId('level-1')).toBeEnabled();
  });
});
