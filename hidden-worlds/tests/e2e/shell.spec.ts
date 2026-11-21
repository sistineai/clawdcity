import { DAY, doc, expect, playThrough, playUrl, seed, setClock, test, waitForPuzzle } from './fixtures';

const ev = (page: import('@playwright/test').Page, name: string) =>
  page.evaluate(
    (n) =>
      (
        window as unknown as { __hwTest: { events(): { event: string; props: Record<string, unknown> }[] } }
      ).__hwTest
        .events()
        .filter((e) => e.event === n),
    name,
  );

test.describe('shell', () => {
  test('E2E-9: premium interest is recorded once and nothing is charged', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./#/premium?source=home');
    await expect(page.getByTestId('premium-not-yet')).toContainText('not available yet');
    await expect(page.getByTestId('premium-not-yet')).toContainText('nothing will be charged');
    await expect(page.getByText('$4.99 a month')).toBeVisible();
    // no email field without VITE_WAITLIST_URL
    await expect(page.locator('input[type=email]')).toHaveCount(0);
    await page.getByTestId('premium-cta').click();
    await expect(page.getByTestId('premium-thanks')).toContainText('Nothing has been charged');
    expect(await ev(page, 'premium_interest')).toEqual([
      expect.objectContaining({ props: expect.objectContaining({ source: 'home', email_given: false }) }),
    ]);
    // coming back from another entry point: already recorded, no second event
    await page.goto('./#/premium?source=archive');
    await expect(page.getByTestId('premium-thanks')).toBeVisible();
    await expect(page.getByTestId('premium-cta')).toHaveCount(0);
    expect(await ev(page, 'premium_interest')).toHaveLength(1);
    expect((await ev(page, 'premium_view')).map((e) => e.props.source)).toEqual(['home', 'archive']);
  });

  test('META-7: reset sits behind an in-app confirmation', async ({ page }) => {
    await setClock(page);
    await seed(
      page,
      doc({ streak: { current: 3, best: 3, last: DAY }, residents: { mossy: { count: 1, first: DAY } } }),
    );
    page.on('dialog', () => {
      throw new Error('native dialogs are not allowed');
    });
    await page.goto('./#/settings');
    await page.getByTestId('reset').click();
    await expect(page.getByRole('dialog')).toContainText('cannot be undone');
    await page.getByTestId('reset-yes').click();
    await expect(page.getByTestId('toast')).toHaveText('Progress reset');
    const d = await page.evaluate(() =>
      (
        window as unknown as { __hwTest: { doc(): { streak: { best: number }; residents: object } } }
      ).__hwTest.doc(),
    );
    expect(d.streak.best).toBe(0);
    expect(d.residents).toEqual({});
  });

  test('SHELL-3/4: settings change play: colour-blind tags name their colour; relaxed hides the timer', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./#/settings');
    await page.getByTestId('setting-colorblind').click();
    await expect(page.getByTestId('setting-colorblind')).toHaveAttribute('aria-checked', 'true');
    await page.getByTestId('setting-relaxed').click();
    await page.getByTestId('motion-on').click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    await page.goto(playUrl());
    await waitForPuzzle(page);
    await expect(page.locator('.chip-colour').first()).toHaveText(
      /^(Red|Orange|Yellow|Green|Teal|Blue|Purple|Pink)$/,
    );
    await expect(page.getByTestId('timer')).toHaveCount(0);
    const changes = (await ev(page, 'settings_change')).map((e) => `${e.props.key}=${e.props.value}`);
    expect(changes).toEqual(['colorBlind=true', 'relaxed=true', 'reducedMotion=on']);
  });

  test('SHELL-7: About explains the art, privacy and versions', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto('./#/about');
    await expect(page.getByTestId('about-art')).toContainText('AI assistance');
    await expect(page.getByTestId('about-privacy')).toContainText('No account');
    await expect(page.getByTestId('about-version')).toContainText('engine 1');
  });

  test.describe(() => {
    test('E2E-12: with every font request and every cross-origin request stalled, the game still plays', async ({
      page,
      baseURL,
    }) => {
      await setClock(page);
      await seed(page, doc());
      const origin = new URL(baseURL!).origin;
      // fonts never answer; anything off-origin never answers either
      await page.route('**/*.woff2', () => new Promise(() => {}));
      await page.route(
        (url) => url.origin !== origin,
        () => new Promise(() => {}),
      );
      await page.goto(playUrl(), { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#boot, main').first()).toBeVisible({ timeout: 2000 });
      await playThrough(page);
    });
  });

  test('SHELL-10: a visible loading state appears at once', async ({ page }) => {
    await setClock(page);
    await page.route('**/assets/*.js', async (r) => {
      await new Promise((res) => setTimeout(res, 800));
      await r.continue();
    });
    await page.goto('./', { waitUntil: 'commit' });
    await expect(page.locator('#boot')).toBeVisible({ timeout: 100 + 400 });
    await expect(page.getByTestId('world')).toBeVisible();
  });
});

for (const [w, h] of [
  [320, 568],
  [360, 640],
] as const)
  test(`E2E-14: no horizontal overflow at ${w}x${h}; tray and controls reachable`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await setClock(page);
    const r = { count: 1, first: DAY };
    await seed(page, doc({ residents: { mossy: r, odo: r, juno: r }, explore: { meadow: { '1': 3 } } }));
    const routes = [
      '',
      'archive',
      'explore',
      'explore/meadow',
      'collection',
      'stats',
      'settings',
      'premium?source=home',
      'about',
      `play/daily/${DAY}`,
    ];
    for (const route of routes) {
      await page.goto(`./#/${route}`);
      await page.waitForTimeout(400);
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(over, `overflow on #/${route}`).toBeLessThanOrEqual(0);
    }
    await waitForPuzzle(page);
    const inView = async (sel: import('@playwright/test').Locator) => {
      const b = (await sel.boundingBox())!;
      expect(
        b.x >= 0 && b.y >= 0 && b.x + b.width <= w + 0.5 && b.y + b.height <= h + 0.5,
        `${await sel.getAttribute('aria-label')} in view`,
      ).toBe(true);
      expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    };
    await inView(page.getByRole('button', { name: 'Zoom in' }));
    await inView(page.getByRole('button', { name: 'Show the whole world' }));
    await inView(page.getByTestId('hint'));
    await inView(page.getByTestId('chip').first());
    // the tray scrolls sideways to reach every tag
    await page.getByTestId('chip').last().scrollIntoViewIfNeeded();
    await inView(page.getByTestId('chip').last());
  });
