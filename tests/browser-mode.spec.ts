import { test, expect } from '@playwright/test';
test('live browser keeps iframe state through folding and workspace switches preserve screenshots', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.getByRole('button', { name: 'Inner screen', exact: true }).click();
  await page.getByLabel('Upload Inner · Landscape').setInputFiles('public/demo/apple/inner.png');
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  await page
    .getByRole('button', { name: /Landscape/ })
    .first()
    .click();
  const frame = page.frameLocator('iframe[title="Duo inner screen page"]');
  await expect(frame.getByText('Live CSS viewport: 951 × 669 px')).toBeVisible();
  await frame.getByLabel('Demo URL').fill('not a valid url');
  await frame.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(frame.getByText('Enter an http:// or https:// address')).toBeVisible();
  await page.getByRole('slider', { name: 'Fold progress', exact: true }).fill('0.8');
  await expect(frame.getByText('Enter an http:// or https:// address')).toBeVisible();
  await expect(page.getByTestId('web-overlay')).toHaveAttribute('data-scene', 'landscape');
  await page.getByRole('button', { name: /^Closed/ }).click();
  await expect(
    page
      .frameLocator('iframe[title="Duo outer screen page"]')
      .getByText('Live CSS viewport: 466 × 678 px'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Rotate device', exact: true }).click();
  await expect(page.locator('iframe[title="Duo outer screen page"]')).toHaveCSS(
    'pointer-events',
    'none',
  );
  await page.getByRole('button', { name: 'Screenshots', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Inner screen', exact: true }).click();
  await expect(page.getByTitle('inner.png', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  await page.getByLabel('Site address').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Open site', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP');
  await page.screenshot({ path: 'docs/screenshots/browser-mode.png', fullPage: true });
});

test('live browser loads an external URL, refreshes and persists settings', async ({ page }) => {
  await page.route('https://embed.example/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button onclick="this.textContent=\'Clicked\'">External page</button>',
    }),
  );
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.getByRole('button', { name: /Browser sim/ }).click();
  await page
    .getByRole('button', { name: /Landscape/ })
    .first()
    .click();
  await page.getByLabel('Site address').fill('embed.example/demo');
  await page.getByRole('button', { name: 'Open site', exact: true }).click();
  const inner = page.frameLocator('iframe[title="Duo inner screen page"]');
  await inner.getByRole('button', { name: 'External page' }).click();
  await expect(inner.getByRole('button', { name: 'Clicked' })).toBeVisible();
  await page.getByLabel('Reload page').click();
  await expect(inner.getByRole('button', { name: 'External page' })).toBeVisible();
  await page.getByLabel('Browser pixel ratio').selectOption('2');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Site address')).toHaveValue('https://embed.example/demo');
  await expect(page.getByLabel('Browser pixel ratio')).toHaveValue('2');
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
    await expect(page.getByRole('button', { name: /Browser sim/ })).toBeVisible();
    if (width === 375) {
      await page.getByRole('button', { name: 'Enter / change URL ↗', exact: true }).click();
      await expect(page.getByLabel('Site address')).toBeFocused();
      await page.getByRole('button', { name: 'Open site', exact: true }).click();
      await expect
        .poll(() => page.locator('#duo-preview').evaluate((el) => el.getBoundingClientRect().top))
        .toBeLessThan(160);
    }
  }
  await page.getByText('Blank or blocked page?').click();
  await expect(page.getByText(/refuse iframe embedding/)).toBeVisible();
});

test('live browser shares animation playback and all static scene controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.getByRole('button', { name: /Browser sim/ }).click();
  await page.getByRole('button', { name: 'Fold demo', exact: true }).click();
  const before = await page.locator('iframe[title="Duo outer screen page"]').getAttribute('style');
  await page.getByLabel('Play animation').click();
  await expect(page.getByLabel('Pause animation')).toBeVisible();
  await expect
    .poll(() => page.locator('iframe[title="Duo outer screen page"]').getAttribute('style'))
    .not.toBe(before);
  await page.getByLabel('Pause animation').click();
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
    await expect(page.getByTestId('web-overlay')).toHaveAttribute('data-scene', id);
    await expect(page.getByTestId('device-canvas')).toHaveAttribute('data-scene', id);
  }
  await expect(page.locator('.canvas-error')).toHaveCount(0);
});
