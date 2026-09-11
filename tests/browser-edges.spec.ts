import { test, expect } from '@playwright/test';
test('browser fold covers vertical edges and keeps a continuous inner outline', async ({
  page,
}) => {
  await page.goto('/');
  const values = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite module
    const T = await import('/node_modules/three/build/three.module.js');
    const d = new DeviceRenderer(),
      p = initialProject();
    p.workspace = 'browser';
    await d.prepare(p, p.pages[0]);
    const result = [];
    for (const [inner, open] of [
      [true, 0.6],
      [true, 0.7],
      [true, 0.9],
      [true, 0.95],
      [false, 0.02],
      [false, 0.1],
      [false, 0.3],
    ]) {
      p.view.open = open;
      d.draw(p, 1200, 800);
      const s = d
        .browserSurfaces(p, 1200, 800)
        .find((s: any) => s.id === (inner ? 'inner' : 'outer'));
      const mesh = d.model.getObjectByName(
        inner ? 'skeleton_0_3_screenTexture_geo' : 'skeleton_0_7_outerDisplayScreenTexture_geo',
      );
      const pos = mesh.geometry.getAttribute('position');
      let best = Infinity,
        index = 0;
      for (let i = 0; i < pos.count; i++) {
        const score = pos.getX(i) + Math.abs(pos.getZ(i)) * 5;
        if (score < best) {
          best = score;
          index = i;
        }
      }
      const v = mesh
        .getVertexPosition(index, new T.Vector3())
        .applyMatrix4(mesh.matrixWorld)
        .project(d.camera);
      const matrix = new DOMMatrix(s.matrix);
      const m = [
        matrix.m11,
        matrix.m21,
        matrix.m41,
        matrix.m12,
        matrix.m22,
        matrix.m42,
        matrix.m14,
        matrix.m24,
        matrix.m44,
      ];
      const inverse = new T.Matrix3().set(...m).invert();
      const uv = new T.Vector3((v.x + 1) * 600 + (inner ? 3 : -3), (1 - v.y) * 400, 1).applyMatrix3(
        inverse,
      );
      const maskImage = new Image();
      maskImage.src = s.mask.slice(5, -2);
      await maskImage.decode();
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = 1200;
      maskCanvas.height = 800;
      const context = maskCanvas.getContext('2d')!;
      context.drawImage(maskImage, 0, 0);
      const row = context.getImageData(0, 400, 1200, 1).data;
      let runs = 0,
        lit = false;
      for (let x = 0; x < 1200; x++) {
        const next = row[x * 4 + 3] > 127;
        if (next && !lit) runs++;
        lit = next;
      }
      result.push({
        inner,
        open,
        paths: runs,
        u: uv.x / uv.z / s.width,
      });
    }
    d.dispose();
    return result;
  });
  for (const value of values) {
    expect(value.u, JSON.stringify(value)).toBeGreaterThanOrEqual(0);
    expect(value.u, JSON.stringify(value)).toBeLessThanOrEqual(1);
    expect(value.paths, JSON.stringify(value)).toBe(1);
  }
});
