import { test, expect } from '@playwright/test';
test('browser masks hide web content behind the physical frame in every pose', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite module
    const T = await import('/node_modules/three/build/three.module.js');
    const d = new DeviceRenderer(),
      p = initialProject();
    await d.prepare(p, p.pages[0]);
    const ray = new T.Raycaster(),
      canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const leaks = [];
    const coverageCounts: number[] = [];
    for (const scene of ['fold', 'closed', 'landscape', 'portrait', 'seated', 'standing']) {
      for (const open of [0.15, 0.335, 0.7]) {
        let covered = 0;
        p.scene = scene;
        p.view.open = open;
        p.view.yaw = open === 0.7 ? 0.25 : 0;
        p.view.pitch = open === 0.7 ? -0.15 : 0;
        d.draw(p, 600, 400);
        const surfaces = d.browserSurfaces(p, 600, 400);
        for (const surface of surfaces) {
          if (!surface.visible) continue;
          const path = surface.clip === 'none' ? null : new Path2D(surface.clip.slice(6, -2));
          ctx.clearRect(0, 0, 600, 400);
          if (surface.mask) {
            const img = new Image();
            img.src = surface.mask.slice(5, -2);
            await img.decode();
            ctx.drawImage(img, 0, 0, 600, 400);
          }
          const pixels = ctx.getImageData(0, 0, 600, 400).data;
          for (let y = 80; y < 330; y += 13)
            for (let x = 140; x < 490; x += 13) {
              if (path && !ctx.isPointInPath(path, x + 0.5, y + 0.5)) continue;
              const k = (y * 600 + x) * 4;
              const coverage = surface.mask
                ? surface.maskMode === 'alpha'
                  ? pixels[k + 3]
                  : pixels[k]
                : 255;
              if (coverage < 240) continue;
              covered++;
              ray.setFromCamera(new T.Vector2((x + 0.5) / 300 - 1, 1 - (y + 0.5) / 200), d.camera);
              const hit = ray.intersectObject(d.model, true)[0];
              if (hit && !/screenTexture_geo|outerDisplayScreenTexture_geo/.test(hit.object.name))
                leaks.push({ scene, open, id: surface.id, x, y, mesh: hit.object.name });
            }
        }
        coverageCounts.push(covered);
      }
    }
    d.dispose();
    return { leaks, coverageCounts };
  });
  expect(result.leaks.slice(0, 10)).toEqual([]);
  expect(result.coverageCounts.every((count) => count > 10)).toBe(true);
});
test('both workspaces keep the selected pose when playback starts', async ({ page }) => {
  await page.goto('/');
  // Basic mode hides the save label; its text still signals completed loading.
  await expect(page.getByText('Saved to this browser')).toBeAttached();
  for (const workspace of ['Screenshots', 'Browser sim']) {
    await page.getByRole('button', { name: workspace, exact: true }).click();
    for (const [name, id] of [
      ['Portrait', 'portrait'],
      ['Seated', 'seated'],
      ['Standing', 'standing'],
    ]) {
      await page
        .getByRole('button', { name: new RegExp(name) })
        .first()
        .click();
      await page.getByLabel('Play animation').click();
      await expect(page.getByTestId('device-canvas')).toHaveAttribute('data-scene', id);
      await page.getByLabel('Pause animation').click();
    }
  }
});
