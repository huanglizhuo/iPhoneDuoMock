import { test, expect } from '@playwright/test';
test('vertical display edges remain lit near open and closed endpoints', async ({ page }) => {
  await page.goto('/');
  const samples = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite module
    const T = await import('/node_modules/three/build/three.module.js');
    const d = new DeviceRenderer(),
      p = initialProject();
    await d.prepare(p, p.pages[0]);
    const image = document.createElement('canvas');
    image.width = 1024;
    image.height = 1024;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1024, 1024);
    d.projections.forEach((s: any) => s.setArtwork(image));
    const output = document.createElement('canvas');
    output.width = 1200;
    output.height = 800;
    const c = output.getContext('2d')!;
    const result = [];
    for (const inner of [true, false]) {
      const mesh = d.model.getObjectByName(
        inner ? 'skeleton_0_3_screenTexture_geo' : 'skeleton_0_7_outerDisplayScreenTexture_geo',
      );
      const pos = mesh.geometry.getAttribute('position');
      let index = 0,
        best = Infinity;
      for (let i = 0; i < pos.count; i++) {
        const score = pos.getX(i) + Math.abs(pos.getZ(i)) * 5;
        if (score < best) {
          best = score;
          index = i;
        }
      }
      for (const open of inner ? [0.9, 0.95, 0.98, 1] : [0, 0.02, 0.05, 0.1]) {
        p.view.open = open;
        c.clearRect(0, 0, 1200, 800);
        c.drawImage(d.draw(p, 1200, 800), 0, 0);
        const v = mesh
          .getVertexPosition(index, new T.Vector3())
          .applyMatrix4(mesh.matrixWorld)
          .project(d.camera);
        const x = Math.round((v.x + 1) * 600) + (inner ? 5 : -5),
          y = Math.round((1 - v.y) * 400);
        result.push({ inner, open, x, y, rgba: Array.from(c.getImageData(x, y, 1, 1).data) });
      }
    }
    d.dispose();
    return result;
  });
  for (const s of samples)
    expect(Math.min(...s.rgba.slice(0, 3)), JSON.stringify(samples)).toBeGreaterThan(160);
});
