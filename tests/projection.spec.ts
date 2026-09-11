import { test, expect } from '@playwright/test';
test('right screen stays fixed throughout a fold', async ({ page }) => {
  await page.goto('/');
  const points = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite browser module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite browser module
    const THREE = await import('/node_modules/three/build/three.module.js');
    const p = initialProject(),
      d = new DeviceRenderer();
    await d.prepare(p, p.pages[0]);
    const mesh = d.model.getObjectByName('skeleton_0_3_screenTexture_geo');
    const positions = mesh.geometry.getAttribute('position');
    let index = 0;
    for (let i = 0; i < positions.count; i++)
      if (positions.getX(i) > 7 && positions.getZ(i) < -4) {
        index = i;
        break;
      }
    const result = [];
    for (const open of [0, 0.25, 0.5, 0.75, 1]) {
      p.view.open = open;
      d.draw(p, 1200, 800);
      const v = mesh.getVertexPosition(index, new THREE.Vector3());
      result.push({
        open,
        local: v.toArray(),
        pixel: v.clone().applyMatrix4(mesh.matrixWorld).project(d.camera).toArray(),
      });
    }
    d.dispose();
    return result;
  });
  for (const point of points) {
    expect(
      Math.abs(point.pixel[0] - points[0].pixel[0]) * 600,
      JSON.stringify(points),
    ).toBeLessThan(0.5);
    expect(Math.abs(point.pixel[1] - points[0].pixel[1]) * 400).toBeLessThan(0.5);
  }
});

test('projected artwork keeps horizontal content level, reveals black margins, blurs locally and restores on closing', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite browser module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    // @ts-expect-error Vite browser module
    const { initialProject } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite browser module
    const T = await import('/node_modules/three/build/three.module.js');
    const p = initialProject(),
      d = new DeviceRenderer();
    await d.prepare(p, p.pages[0]);
    const image = document.createElement('canvas');
    image.width = image.height = 1024;
    const ctx = image.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 280, 1024, 60);
    d.projections[1].setArtwork(image);
    const out = document.createElement('canvas');
    out.width = 1200;
    out.height = 800;
    const c = out.getContext('2d')!;
    const render = (open: number) => {
      p.view.open = open;
      c.clearRect(0, 0, 1200, 800);
      c.drawImage(d.draw(p, 1200, 800), 0, 0);
    };
    const sample = (u: number, v: number) => {
      const f = d.projections[1].uniforms.projectionFrame.value;
      const point = new T.Vector3(f.x + f.z * u, 0.2492995, f.y + f.w * v)
        .applyMatrix4(d.outerMesh.matrixWorld)
        .project(d.camera);
      const x = Math.round((point.x + 1) * 600),
        y = Math.round((1 - point.y) * 400);
      return { x, y, rgba: Array.from(c.getImageData(x, y, 1, 1).data) };
    };
    render(0);
    const closed = out.toDataURL();
    const samples = [];
    for (const open of [0, 0.15, 0.25, 0.3333, 0.4, 0.3333, 0.25, 0.15, 0]) {
      render(open);
      samples.push({
        open,
        red: sample(0.15, 0.3),
        redFar: sample(0.4, 0.3),
        white: sample(0.15, 0.5),
        edge: sample(0.4, 0.267),
        sharpEdge: sample(0.15, 0.267),
        top: sample(0.15, -0.04),
        bottom: sample(0.15, 1.04),
      });
    }
    const restored = closed === out.toDataURL();
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 1024, 1024);
    d.projections[1].setArtwork(image);
    render(0);
    const replacement = sample(0.15, 0.3).rgba;
    d.dispose();
    return { samples, restored, replacement };
  });
  for (const s of result.samples) {
    // Both positions on the turning glass see the same horizontal red stripe.
    expect(s.red.y).toBe(result.samples[0].red.y);
    for (const red of [s.red, s.redFar]) {
      expect(red.rgba[0], JSON.stringify(s)).toBeGreaterThan(180);
      expect(red.rgba[1], JSON.stringify(s)).toBeLessThan(35);
      expect(red.rgba[3]).toBe(255);
    }
    expect(s.white.rgba[0]).toBeGreaterThan(200);
    if (s.open >= 0.3333) {
      // Opaque black *inside* the glass, not transparency or a missing model.
      for (const margin of [s.top, s.bottom]) {
        expect(Math.max(...margin.rgba.slice(0, 3)), JSON.stringify(s)).toBeLessThan(20);
        expect(margin.rgba[3]).toBe(255);
      }
      // Red bleeds across the stripe boundary only on the blurred side.
      expect(s.edge.rgba[0] - s.edge.rgba[1]).toBeGreaterThan(10);
      expect(Math.abs(s.sharpEdge.rgba[0] - s.sharpEdge.rgba[1])).toBeLessThan(5);
    }
  }
  expect(result.restored).toBe(true);
  expect(result.replacement[0]).toBeLessThan(5);
  expect(result.replacement[2]).toBeGreaterThan(245);
});
