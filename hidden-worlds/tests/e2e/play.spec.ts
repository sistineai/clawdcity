import {
  DAY,
  doc,
  emptyPoint,
  expect,
  foundCount,
  items,
  playThrough,
  playUrl,
  seed,
  setClock,
  tap,
  tapItem,
  test,
  waitForPuzzle,
} from './fixtures';

test.describe('play', () => {
  test('E2E-1: first run shows onboarding, then a full daily play-through by real taps', async ({ page }) => {
    await setClock(page);
    await page.goto('./');
    // DAILY-5: a first-time visitor lands in today's puzzle with no sign-up
    await expect(page).toHaveURL(new RegExp(`#/play/daily/${DAY}$`));
    await expect(page.getByTestId('coach')).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByTestId('coach-next').click();
    await expect(page.getByTestId('coach')).toHaveCount(0);
    await playThrough(page, { resident: true });
    await expect(page.getByTestId('result-time')).toHaveText(/^\d+:\d\d$/);
    await expect(page.getByRole('img', { name: /of 3 stars/ })).toBeVisible();
    const events = await page.evaluate(() =>
      (window as unknown as { __hwTest: { events(): { event: string }[] } }).__hwTest
        .events()
        .map((e) => e.event),
    );
    expect(events).toEqual(
      expect.arrayContaining([
        'app_open',
        'puzzle_start',
        'target_found',
        'resident_found',
        'puzzle_complete',
      ]),
    );
    // onboarding is never shown again
    await page.reload();
    await waitForPuzzle(page);
    await expect(page.getByTestId('coach')).toHaveCount(0);
  });

  test('E2E-2: an empty tap is a miss, a drag is not a tap, three fast misses lock tapping', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await waitForPuzzle(page);
    const misses = () =>
      page
        .getByTestId('misses')
        .textContent()
        .then((t) => Number(t?.trim()));
    const a = await emptyPoint(page);
    await tap(page, a.x, a.y);
    await expect.poll(misses).toBe(1);

    // a drag moves the camera and is not a tap (zoom in first so there is room to pan)
    await page.getByRole('button', { name: 'Zoom in' }).click();
    await page.waitForTimeout(600);
    const cam0 = await page.evaluate(() =>
      (window as unknown as { __hwTest: { camera(): { tx: number; ty: number } } }).__hwTest.camera(),
    );
    const box = (await page.getByTestId('world').boundingBox())!;
    const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (touch) {
      const client = await page
        .context()
        .newCDPSession(page)
        .catch(() => null);
      if (client) {
        await client.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x: cx, y: cy }],
        });
        for (let i = 1; i <= 6; i++)
          await client.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ x: cx - i * 10, y: cy - i * 6 }],
          });
        await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        // WebKit: synthesise the pointer sequence a finger drag produces
        await page.evaluate(
          ([x, y]) => {
            const el = document.querySelector('[data-testid="world"]')!;
            const ev = (type: string, px: number, py: number) =>
              el.dispatchEvent(
                new PointerEvent(type, {
                  pointerId: 7,
                  pointerType: 'touch',
                  clientX: px,
                  clientY: py,
                  bubbles: true,
                  isPrimary: true,
                }),
              );
            ev('pointerdown', x, y);
            for (let i = 1; i <= 6; i++) ev('pointermove', x - i * 10, y - i * 6);
            ev('pointerup', x - 60, y - 36);
          },
          [cx, cy] as const,
        );
      }
    } else {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 60, cy - 36, { steps: 6 });
      await page.mouse.up();
    }
    await page.waitForTimeout(500);
    expect(await misses()).toBe(1);
    const cam1 = await page.evaluate(() =>
      (window as unknown as { __hwTest: { camera(): { tx: number; ty: number } } }).__hwTest.camera(),
    );
    expect(Math.abs(cam1.tx - cam0.tx) + Math.abs(cam1.ty - cam0.ty)).toBeGreaterThan(10);

    // three misses inside two seconds lock tapping
    const pts = [await emptyPoint(page)];
    pts.push(await emptyPoint(page, pts));
    pts.push(await emptyPoint(page, pts));
    for (const p of pts) await tap(page, p.x, p.y);
    await expect(page.getByTestId('lockout')).toBeVisible();
    await expect.poll(misses).toBe(4);
    // while locked, a tap on a target does nothing
    const t = (await items(page)).find((i) => i.kind === 'target' && !i.found)!;
    const before = await foundCount(page);
    await tapItem(page, t);
    await page.waitForTimeout(400);
    expect(await foundCount(page)).toBe(before);
    await expect(page.getByTestId('lockout')).toHaveCount(0, { timeout: 6000 });
  });

  test('E2E-2: relaxed mode removes the lockout and hides timer and misses', async ({ page }) => {
    await setClock(page);
    const d = doc();
    d.settings.relaxed = true;
    await seed(page, d);
    await page.goto(playUrl());
    await waitForPuzzle(page);
    await expect(page.getByTestId('timer')).toHaveCount(0);
    await expect(page.getByTestId('misses')).toHaveCount(0);
    const pts = [await emptyPoint(page)];
    pts.push(await emptyPoint(page, pts));
    pts.push(await emptyPoint(page, pts));
    for (const p of pts) await tap(page, p.x, p.y);
    await page.waitForTimeout(700);
    await expect(page.getByTestId('lockout')).toHaveCount(0);
    // misses are still recorded
    const st = await page.evaluate(() =>
      (window as unknown as { __hwTest: { state(): { misses: number } } }).__hwTest.state(),
    );
    expect(st.misses).toBe(3);
  });

  test('E2E-3: one free hint, then the button changes and links to Premium', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await waitForPuzzle(page);
    const hint = page.getByTestId('hint');
    await expect(hint).toHaveText(/Hint/);
    const cam = () =>
      page.evaluate(() =>
        (
          window as unknown as { __hwTest: { camera(): { s: number; tx: number; ty: number } } }
        ).__hwTest.camera(),
      );
    const before = await cam();
    await hint.click();
    // the camera moves to the ring
    await expect
      .poll(async () => {
        const c = await cam();
        return Math.abs(c.tx - before.tx) + Math.abs(c.ty - before.ty) + Math.abs(c.s - before.s);
      })
      .toBeGreaterThan(1);
    await expect(hint).toHaveText(/1 free hint per puzzle/);
    const st = await page.evaluate(() =>
      (window as unknown as { __hwTest: { state(): { hints: number } } }).__hwTest.state(),
    );
    expect(st.hints).toBe(1);
    await hint.click();
    await expect(page).toHaveURL(/#\/premium\?source=hints/);
  });

  test('E2E-4: reload mid-puzzle resumes with found items, misses, hints and time intact', async ({
    page,
  }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await waitForPuzzle(page);
    const targets = (await items(page)).filter((i) => i.kind === 'target');
    await tapItem(page, targets[0]!);
    await expect.poll(() => foundCount(page)).toBe(1);
    await tapItem(page, targets[1]!);
    await expect.poll(() => foundCount(page)).toBe(2);
    const e = await emptyPoint(page);
    await tap(page, e.x, e.y);
    await page.getByTestId('hint').click();
    await page.waitForTimeout(2500);
    const before = await page.evaluate(() =>
      (
        window as unknown as {
          __hwTest: { state(): { found: number[]; misses: number; hints: number; elapsedMs: number } };
        }
      ).__hwTest.state(),
    );
    expect(before.misses).toBe(1);
    await page.reload();
    await waitForPuzzle(page);
    expect(await foundCount(page)).toBe(2);
    const after = await page.evaluate(() =>
      (
        window as unknown as {
          __hwTest: { state(): { found: number[]; misses: number; hints: number; elapsedMs: number } };
        }
      ).__hwTest.state(),
    );
    expect(after.found).toEqual(before.found);
    expect(after.misses).toBe(1);
    expect(after.hints).toBe(1);
    expect(after.elapsedMs).toBeGreaterThanOrEqual(2000);
    await expect(page.getByTestId('chip').filter({ has: page.locator('.chip-tick') })).toHaveCount(2);
    await expect(page.getByTestId('hint')).toHaveText(/1 free hint per puzzle/);
  });

  test('DAILY-6: the timer pauses while the page is hidden', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(playUrl());
    await waitForPuzzle(page);
    const elapsed = () =>
      page.evaluate(
        () =>
          (window as unknown as { __hwTest: { state(): { elapsedMs: number } } }).__hwTest.state().elapsedMs,
      );
    const setHidden = (hidden: boolean) =>
      page.evaluate((h) => {
        Object.defineProperty(document, 'hidden', { value: h, configurable: true });
        Object.defineProperty(document, 'visibilityState', {
          value: h ? 'hidden' : 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await page.waitForTimeout(1200);
    await setHidden(true);
    const atHide = await elapsed();
    await page.waitForTimeout(3500);
    await setHidden(false);
    await page.waitForTimeout(300);
    await setHidden(true);
    const after = await elapsed();
    // about 0.3 s ran while visible; the 3.5 s hidden did not count
    expect(after - atHide).toBeLessThan(1500);
    expect(atHide).toBeGreaterThanOrEqual(1000);
  });

  test('PACK-A2: a full play-through with ?pack=sample-png', async ({ page }) => {
    await setClock(page);
    await seed(page, doc());
    await page.goto(`./?pack=sample-png${playUrl().slice(1)}`);
    await playThrough(page);
  });
});
