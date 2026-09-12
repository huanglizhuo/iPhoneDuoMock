import { test, expect } from '@playwright/test';

test('unfolded PNG export has no internal bezel lines across the display', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite module
    const { exportProject } = await import('/src/lib/export.ts');
    const p = initialProject();
    p.scene = 'fold';
    p.view.open = 1;
    p.output.size = 'wide';
    const white = document.createElement('canvas');
    white.width = 1024;
    white.height = 720;
    const w = white.getContext('2d')!;
    w.fillStyle = '#fff';
    w.fillRect(0, 0, white.width, white.height);
    for (const slot of Object.values(p.pages[0].slots) as any[])
      slot.asset = {
        data: white.toDataURL(),
        width: 1024,
        height: 720,
        name: 'white.png',
        source: 'upload',
      };
    const { blob } = await exportProject(p, 'png', new AbortController().signal, () => {});
    const image = await createImageBitmap(blob);
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d')!;
    // Preserve export framing when sampling: use normalized central display region.
    ctx.drawImage(image, 0, 0, 1200, 800);
    const pixels = ctx.getImageData(0, 0, 1200, 800).data;
    let darkestColumn = 255;
    for (let x = 480; x < 720; x++) {
      let sum = 0;
      for (let y = 250; y < 550; y++) sum += pixels[(y * 1200 + x) * 4];
      darkestColumn = Math.min(darkestColumn, sum / 300);
    }
    image.close();
    return { darkestColumn, type: blob.type, bytes: blob.size };
  });
  expect(result.type).toBe('image/png');
  expect(result.bytes).toBeGreaterThan(1000);
  expect(result.darkestColumn).toBeGreaterThan(245);
});
