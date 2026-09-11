import { test, expect } from '@playwright/test';

test('basic workspace hides scene tuning and advanced preserves the live page', async ({
  page,
}) => {
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Advanced', exact: true });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#scene-settings')).toBeHidden();
  await page.getByText('Upload your screenshot', { exact: true }).first().click();
  await expect(
    page.locator('input[type=file][accept="image/png,image/jpeg,image/webp"]').first(),
  ).toBeAttached();
  await toggle.click();
  await expect(page.locator('#scene-settings')).toBeVisible();
  await toggle.click();
  await expect(page.locator('#scene-settings')).toBeHidden();
  await page.getByRole('button', { name: 'Browser sim', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Site address' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Browser pixel ratio' })).toBeHidden();
  const frame = page.frameLocator('iframe[title="Duo inner screen page"]');
  const draft = frame.getByRole('textbox', { name: 'Demo URL' });
  await draft.fill('https://example.com/preserved');
  await toggle.click();
  await expect(page.getByRole('combobox', { name: 'Browser pixel ratio' })).toBeVisible();
  await toggle.click();
  await expect(draft).toHaveValue('https://example.com/preserved');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
