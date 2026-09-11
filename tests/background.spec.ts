import { test, expect } from '@playwright/test';

const corner = (page: import('@playwright/test').Page) =>
  page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => {
    const d = c.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  });

test('black preset, custom color, and cover-cropped custom image paint the canvas', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, 1, 1).data;
        return d[3] > 0;
      }),
    )
    .toBe(true);

  // Pure black preset.
  await page.getByLabel('Background: Black').click();
  await expect.poll(() => corner(page)).toEqual([0, 0, 0]);

  // Custom color picker.
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>(
      '.custom-color-swatch input[type=color]',
    )!;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(input, '#2f8f6b');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => corner(page)).toEqual([47, 143, 107]);

  // Uploaded image fills the canvas (cover): corners are image pixels, not the fallback color.
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 200;
    const x = c.getContext('2d')!;
    x.fillStyle = '#3aa0a0';
    x.fillRect(0, 0, 200, 200);
    return c.toDataURL();
  });
  await page.getByLabel('Upload background image').setInputFiles({
    name: 'bg.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data.split(',')[1], 'base64'),
  });
  await expect.poll(() => corner(page)).toEqual([58, 160, 160]);
  await expect(page.getByText(/Best ratio: 1600 × 1000 px/)).toBeVisible();
  await expect(page.getByText(/cropped/)).toBeVisible();

  // Removing the image falls back to the custom color, keeping the custom mode.
  await page.getByRole('button', { name: 'Remove image' }).click();
  await expect.poll(() => corner(page)).toEqual([47, 143, 107]);
});
