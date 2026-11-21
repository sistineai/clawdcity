// E2E-10: after one online load, the app reloads and plays with the network off.
//
// In every browser: the service worker controls the page and Cache Storage holds the app shell,
// the scripts, the styles, the fonts and the vector pack masks.
// Offline reload + play-through runs where Playwright can simulate offline under a service
// worker (Chromium, Firefox). Playwright's WebKit cannot: with a worker active, context.setOffline
// makes reload fail with "page.reload: WebKit encountered an internal error", and routing
// intercepts navigation before the worker ("Blocked by Web Inspector"). REPORT.md marks that
// part BLOCKED; the owner checks it on a real iPhone.
import { doc, expect, playThrough, playUrl, seed, setClock, test } from './fixtures';

test.use({ serviceWorkers: 'allow' });

test('E2E-10: offline after one online load', async ({ page, context, browserName }) => {
  await setClock(page);
  await seed(page, doc());
  await page.goto(playUrl());
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // the first visit installs the worker; the next load is served through it
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 15000 })
    .toBe(true);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys())
      for (const req of await (await caches.open(name)).keys()) urls.push(new URL(req.url).pathname);
    return urls;
  });
  for (const re of [
    /\/index\.html$/,
    /\/assets\/index-[^/]+\.js$/,
    /\/assets\/index-[^/]+\.css$/,
    /\/assets\/masks-[^/]+\.bin$/,
    /\.woff2$/,
    /manifest\.webmanifest$/,
  ])
    expect(
      cached.some((u) => re.test(u)),
      `precached ${re}`,
    ).toBe(true);
  if (browserName === 'webkit') return; // see the note at the top: BLOCKED in Playwright's WebKit
  await context.setOffline(true);
  await page.reload();
  await playThrough(page);
  await context.setOffline(false);
});
