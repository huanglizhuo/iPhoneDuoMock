import { test, expect } from '@playwright/test';

test('essential controls remain accessible across workspace modes and viewport sizes', async ({
  page,
}) => {
  await page.goto('/');
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const mode of ['Screenshots', 'Browser sim']) {
      await page.getByRole('button', { name: mode, exact: true }).click();
      await expect(page.locator('#scene-settings')).toBeHidden();
      for (const scene of ['Unfold', 'Closed', 'Landscape', 'Portrait', 'Seated', 'Standing']) {
        await expect(
          page.locator('.quick-scenes').getByRole('button', { name: scene, exact: true }),
        ).toBeVisible();
      }
      await expect(
        page.getByRole('button', { name: 'Enter fullscreen', exact: true }),
      ).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const picker = await page.locator('.workspace-picker').boundingBox();
      const actions = await page.locator('.top-actions').boundingBox();
      expect(
        picker &&
          actions &&
          (picker.y >= actions.y + actions.height || picker.x + picker.width <= actions.x),
      ).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'Screenshots', exact: true }).click();
  const controls = await page.locator('.timeline-panel').boundingBox();
  expect(controls!.y + controls!.height).toBeLessThanOrEqual(1000);
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  const picker = await page.locator('.workspace-picker').boundingBox();
  const actions = await page.locator('.top-actions').boundingBox();
  expect(picker!.x + picker!.width).toBeLessThanOrEqual(actions!.x);
  await page.getByRole('button', { name: 'Toggle dark mode' }).click();
  await expect(page.locator('#scene-settings')).toBeVisible();
});
