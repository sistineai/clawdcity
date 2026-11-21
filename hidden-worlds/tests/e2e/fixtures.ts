// Shared E2E setup: a controlled clock, seeded storage, real taps, and the checks that run in
// every test: no console errors and no cross-origin requests (E2E-13).
import { test as base, expect, type Page } from '@playwright/test';
import { freshDoc, type SaveDoc } from '../../src/state/schema';
import { STORAGE_KEY } from '../../src/config';

export const DAY = '2026-12-03';
export const NOW = new Date(`${DAY}T10:00:00-05:00`); // 10:00 in the projects' timezone (America/New_York, EST)

interface Fixtures {
  errors: string[];
}

export const test = base.extend<Fixtures>({
  errors: [
    async ({ page, baseURL }, use) => {
      const errors: string[] = [];
      const origin = new URL(baseURL!).origin;
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text()}`);
      });
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message} @ ${(e.stack ?? '').slice(0, 300)}`));
      page.on('request', (r) => {
        const u = r.url();
        if (!u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith(origin))
          errors.push(`cross-origin request: ${u}`);
      });
      await use(errors);
      expect(errors, 'no console errors and no cross-origin requests').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

export function doc(patch: Partial<SaveDoc> = {}): SaveDoc {
  return {
    ...freshDoc(NOW.getTime() - 86400000 * 3, '00000000-test-4000-8000-000000000000'),
    onboarded: true,
    ...patch,
  };
}

/** Put a saved document in storage before the app starts (only on the first load). */
export async function seed(page: Page, d: SaveDoc | string): Promise<void> {
  const value = typeof d === 'string' ? d : JSON.stringify(d);
  await page.addInitScript(
    ([k, v]) => {
      if (!sessionStorage.getItem('hw-seeded')) {
        localStorage.setItem(k, v);
        sessionStorage.setItem('hw-seeded', '1');
      }
    },
    [STORAGE_KEY, value] as const,
  );
}

export async function setClock(page: Page, at: Date = NOW): Promise<void> {
  await page.clock.install({ time: at });
}

export interface Item {
  uid: number;
  kind: 'target' | 'resident';
  found: boolean;
  spriteId: string;
  color: string | null;
  wx: number;
  wy: number;
}

export async function waitForPuzzle(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const h = (window as unknown as { __hwTest?: { items?: unknown } }).__hwTest;
    return !!h && typeof h.items === 'function';
  });
}

export async function items(page: Page): Promise<Item[]> {
  return page.evaluate(() => (window as unknown as { __hwTest: { items(): Item[] } }).__hwTest.items());
}

/** A real tap (touch on phones, mouse elsewhere) at client coordinates. */
export async function tap(page: Page, x: number, y: number): Promise<void> {
  const touch = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (touch) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

/** Bring an item on screen and tap it. */
export async function tapItem(page: Page, it: Item): Promise<void> {
  const p = await page.evaluate(
    ([x, y]) =>
      (
        window as unknown as { __hwTest: { reveal(x: number, y: number): { x: number; y: number } } }
      ).__hwTest.reveal(x, y),
    [it.wx, it.wy] as const,
  );
  await page.waitForTimeout(60);
  await tap(page, p.x, p.y);
}

export async function emptyPoint(
  page: Page,
  avoid: { x: number; y: number }[] = [],
): Promise<{ x: number; y: number }> {
  const p = await page.evaluate(
    (a) =>
      (
        window as unknown as { __hwTest: { emptyPoint(a: unknown): { x: number; y: number } | null } }
      ).__hwTest.emptyPoint(a),
    avoid,
  );
  if (!p) throw new Error('no empty point on screen');
  return p;
}

export async function foundCount(page: Page): Promise<number> {
  return Number(await page.getByTestId('found-count').locator('b').textContent());
}

/** Find every target by real taps; optionally the resident too. */
export async function playThrough(page: Page, opts: { resident?: boolean } = {}): Promise<void> {
  await waitForPuzzle(page);
  if (opts.resident) {
    const r = (await items(page)).find((i) => i.kind === 'resident' && !i.found);
    if (r) {
      await tapItem(page, r);
      await page.getByTestId('resident-continue').click();
    }
  }
  for (const it of (await items(page)).filter((i) => i.kind === 'target' && !i.found)) {
    const before = await foundCount(page);
    await tapItem(page, it);
    await expect
      .poll(() => foundCount(page), { message: `tap finds ${it.color} ${it.spriteId}` })
      .toBe(before + 1);
  }
  await expect(page.getByTestId('result')).toBeVisible();
}

export const playUrl = (date = DAY) => `./#/play/daily/${date}`;
