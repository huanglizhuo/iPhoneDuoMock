import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

test('inner upload supplies left-half outer content, explicit outer overrides, and fit controls fill', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { initialProject, resolveSlot, missingSlots } = await import('/src/lib/project.ts');
    // @ts-expect-error Vite module
    const { screenCanvas } = await import('/src/lib/assets.ts');
    // @ts-expect-error Vite module
    const { DeviceRenderer } = await import('/src/lib/device.ts');
    const p = initialProject(),
      pg = p.pages[0];
    p.demo = false;
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 200;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = 'lime';
    ctx.fillRect(200, 0, 200, 200);
    const asset = {
      name: 'inner.png',
      data: c.toDataURL(),
      width: 400,
      height: 200,
      source: 'design',
    };
    pg.slots.landscape.asset = asset;
    const sample = (c: HTMLCanvasElement) =>
      Array.from(c.getContext('2d')!.getImageData(Math.round(c.width / 2), 2, 1, 1).data);
    const d = new DeviceRenderer();
    await d.prepare(p, pg);
    const derived = sample(d.projections[1].texture.image);
    const missing = missingSlots(p);
    pg.slots.outer.fit = 'contain';
    await d.prepare(p, pg);
    const contain = sample(d.projections[1].texture.image);
    pg.slots.outer.fit = 'cover';
    ctx.fillStyle = 'blue';
    ctx.fillRect(0, 0, 400, 200);
    pg.slots.outer.asset = { ...asset, name: 'outer.png', data: c.toDataURL() };
    await d.prepare(p, pg);
    const explicit = sample(d.projections[1].texture.image);
    pg.slots.outer.asset = null;
    await d.prepare(p, pg);
    const restored = sample(d.projections[1].texture.image);
    ctx.fillStyle = 'yellow';
    ctx.fillRect(0, 0, 200, 200);
    pg.slots.landscape.asset = { ...asset, data: c.toDataURL() };
    await d.prepare(p, pg);
    const updated = sample(d.projections[1].texture.image);
    const saved = JSON.parse(JSON.stringify(p));
    const resolved = resolveSlot(saved.pages[0], 'outer');
    const roundtrip = sample(
      await screenCanvas('outer', resolved.data, false, 512, resolved.leftHalf),
    );
    d.dispose();
    return {
      derived,
      missing,
      contain,
      explicit,
      restored,
      updated,
      roundtrip,
      outerSaved: saved.pages[0].slots.outer.asset,
    };
  });
  expect(result.derived).toEqual([255, 0, 0, 255]);
  expect(result.missing).toEqual([]);
  expect(result.contain.slice(0, 3)).toEqual([19, 26, 30]);
  expect(result.explicit).toEqual([0, 0, 255, 255]);
  expect(result.restored).toEqual(result.derived);
  expect(result.updated).toEqual([255, 255, 0, 255]);
  expect(result.roundtrip).toEqual(result.updated);
  expect(result.outerSaved).toBeNull();
});

test('screen upload selectors expose fallback and allow a real-only PNG export', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.getByRole('button', { name: 'Inner screen', exact: true }).click();
  const data = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 400;
    c.height = 200;
    const x = c.getContext('2d')!;
    x.fillStyle = 'red';
    x.fillRect(0, 0, 200, 200);
    x.fillStyle = 'lime';
    x.fillRect(200, 0, 200, 200);
    return c.toDataURL();
  });
  await page.getByLabel('Upload Inner · Landscape').setInputFiles({
    name: 'inner.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data.split(',')[1], 'base64'),
  });
  await expect(page.getByText('Replaced Inner · Landscape')).toBeVisible();
  await page.getByRole('button', { name: 'Outer screen', exact: true }).click();
  await expect(page.getByText(/Outer screen: currently using/)).toBeVisible();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(page.getByText(/bars appear when the screen ratio differs/)).toBeVisible();
  await page.getByRole('button', { name: 'Fill', exact: true }).click();
  await expect(page.getByRole('slider', { name: 'Crop X', exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Show demo when missing' }).uncheck();
  await page.screenshot({ path: 'docs/screenshots/screen-upload-fallback.png', fullPage: true });
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  expect((await download).suggestedFilename()).not.toContain('-demo');
  await expect(page.getByText('Generated · download started')).toBeVisible();
  await page.getByRole('button', { name: /Scene bundle/ }).click();
  const zipDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  const files = unzipSync(await readFile((await (await zipDownload).path())!));
  expect(Object.keys(files).filter((name) => name.endsWith('.png'))).toHaveLength(2);
  const manifest = JSON.parse(strFromU8(files['manifest.json']));
  expect(manifest.items.find((item: { scene: string }) => item.scene === 'closed')).toMatchObject({
    derivedFrom: 'landscape',
    crop: 'left-half',
    source: 'design',
  });
});
