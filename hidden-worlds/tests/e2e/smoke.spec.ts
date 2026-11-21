import { expect, test } from './fixtures';

test('page loads into a playable screen', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('main').first()).toBeVisible();
  await expect(page.getByTestId('world')).toBeVisible();
});
