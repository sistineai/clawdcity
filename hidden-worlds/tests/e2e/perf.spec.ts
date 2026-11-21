// E2E-16: time from navigation to a playable puzzle. Chromium runs with 4x CPU throttling (CDP);
// the other engines are timed unthrottled against the same 5 s limit. Numbers go to out/perf/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { doc, expect, playUrl, seed, setClock, test } from './fixtures';

const LIMIT_MS = 5000;

test('E2E-16: navigation to playable puzzle within 5 s', async ({ page, browserName }, info) => {
  await setClock(page);
  await seed(page, doc());
  let throttled = false;
  if (browserName === 'chromium') {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    throttled = true;
  }
  const t0 = Date.now();
  await page.goto(playUrl(), { waitUntil: 'commit' });
  await page.waitForFunction(
    () => {
      const h = (window as unknown as { __hwTest?: { items?: () => unknown[] } }).__hwTest;
      return !!h?.items && h.items().length > 0;
    },
    undefined,
    { timeout: 20000 },
  );
  // playable means the world is on screen and the tray is filled
  await expect(page.getByTestId('chip').first()).toBeVisible();
  const ms = Date.now() - t0;
  mkdirSync('out/perf', { recursive: true });
  writeFileSync(
    `out/perf/${info.project.name}.json`,
    JSON.stringify({ project: info.project.name, throttled, ms }),
  );
  console.log(`time to playable [${info.project.name}${throttled ? ', 4x CPU' : ''}]: ${ms} ms`);
  expect(ms).toBeLessThanOrEqual(LIMIT_MS);
});
