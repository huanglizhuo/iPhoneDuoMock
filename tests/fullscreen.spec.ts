import { test, expect } from '@playwright/test';

test('canvas enters and exits fullscreen without remounting the live page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toHaveCount(0);
  await expect(page.locator('.topbar')).toHaveCSS('position', 'static');
  await page.getByRole('button', { name: 'Browser sim', exact: true }).click();
  const draft = page
    .frameLocator('iframe[title="Duo inner screen page"]')
    .getByRole('textbox', { name: 'Demo URL' });
  await draft.fill('https://example.com/preserved');
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit fullscreen', exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.locator('.stage-canvas').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return Math.abs(r.width - innerWidth) < 2 && Math.abs(r.height - innerHeight) < 2;
      }),
    )
    .toBe(true);
  await expect(draft).toHaveValue('https://example.com/preserved');
  await page.getByRole('button', { name: 'Exit fullscreen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeVisible();
  await expect(draft).toHaveValue('https://example.com/preserved');
});

test('fullscreen fallback exits with Escape and restores document scrolling', async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new Error('Not supported'));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Enter fullscreen', exact: true }).click();
  await expect(page.locator('.fullscreen-fallback')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await page.keyboard.press('Escape');
  await expect(page.locator('.fullscreen-fallback')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enter fullscreen', exact: true })).toBeFocused();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
});
