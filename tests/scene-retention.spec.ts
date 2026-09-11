import { test, expect } from '@playwright/test';
test('fold slider preserves the selected static scene', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  for (const [name, id] of [
    ['Closed', 'closed'],
    ['Landscape', 'landscape'],
    ['Portrait', 'portrait'],
    ['Seated', 'seated'],
    ['Standing', 'standing'],
  ]) {
    await page
      .getByRole('button', { name: new RegExp(name) })
      .first()
      .click();
    await page.getByRole('slider', { name: 'Fold progress', exact: true }).fill('0.4');
    await expect(page.getByTestId('device-canvas')).toHaveAttribute('data-scene', id);
  }
});
