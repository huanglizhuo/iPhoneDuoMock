import { test, expect } from '@playwright/test';

test('Standing inner screen stays readable after opening', async ({ page }) => {
  await page.goto('/');
  const brightness = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    const p = initialProject(),
      d = new DeviceRenderer();
    p.scene = 'standing';
    p.view.open = 1;
    await d.prepare(p, p.pages[0]);
    const white = document.createElement('canvas');
    white.width = white.height = 256;
    const c = white.getContext('2d')!;
    c.fillStyle = 'white';
    c.fillRect(0, 0, 256, 256);
    d.projections[0].setArtwork(white);
    const rendered = d.draw(p, 800, 800);
    const output = document.createElement('canvas');
    output.width = output.height = 800;
    const ctx = output.getContext('2d')!;
    ctx.drawImage(rendered, 0, 0);
    const masks = d.browserSurfaces(p, 800, 800);
    const surface = masks.find((s: { id: string }) => s.id === 'inner');
    const mask = new Image();
    mask.src = surface.mask.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    await mask.decode();
    const m = document.createElement('canvas');
    m.width = m.height = 800;
    const mc = m.getContext('2d')!;
    mc.drawImage(mask, 0, 0, 800, 800);
    const pixels = ctx.getImageData(0, 0, 800, 800).data;
    const alpha = mc.getImageData(0, 0, 800, 800).data;
    let sum = 0,
      count = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (alpha[i + 3] > 250) {
        sum += pixels[i];
        count++;
      }
    d.dispose();
    return { mean: sum / count, count };
  });
  expect(brightness.count).toBeGreaterThan(1000);
  expect(brightness.mean).toBeGreaterThan(180);
});

test('browser scene PNG output follows screen size and orientation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  for (const [scene, size] of [
    ['Unfold', '2853 × 2007'],
    ['Closed', '1398 × 2034'],
    ['Landscape', '2853 × 2007'],
    ['Portrait', '2007 × 2853'],
    ['Seated', '2007 × 2853'],
    ['Standing', '2034 × 1398'],
  ]) {
    await page
      .getByRole('button', { name: new RegExp('^' + scene) })
      .first()
      .click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await expect(page.locator('.export-summary')).toContainText(size);
    await page.getByRole('button', { name: 'Back to editing', exact: false }).click();
  }
});
