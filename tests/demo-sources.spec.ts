import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
test('Apple source images match all five device slots', async ({ page }) => {
  for (const [name, w, h] of [
    ['inner', 2853, 2007],
    ['inner-portrait', 2007, 2853],
    ['outer-landscape', 2034, 1398],
    ['outer', 1398, 2034],
  ] as const) {
    const file = await readFile(`public/demo/apple/${name}.png`);
    expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([w, h]);
  }
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite module
    const { drawDemo, decodeImage, fitRect } = await import('/src/lib/assets.ts');
    // @ts-expect-error Vite module
    const { SPECS } = await import('/src/lib/project.ts');
    const results = [];
    for (const [slot, file] of [
      ['landscape', 'inner'],
      ['portrait', 'inner-portrait'],
      ['seated', 'inner-portrait'],
      ['standing', 'outer-landscape'],
      ['outer', 'outer'],
    ]) {
      const actual = document.createElement('canvas'),
        expected = document.createElement('canvas');
      actual.width = expected.width = 320;
      actual.height = expected.height = Math.round((320 * SPECS[slot].height) / SPECS[slot].width);
      await drawDemo(actual.getContext('2d'), actual.width, actual.height, slot);
      const image = await decodeImage(`/demo/apple/${file}.png`),
        ctx = expected.getContext('2d')!;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, expected.width, expected.height);
      const r = fitRect(image.width, image.height, expected.width, expected.height, {
        fit: 'contain',
        x: 0.5,
        y: 0.5,
        zoom: 1,
      });
      ctx.drawImage(image, r.x, r.y, r.width, r.height);
      results.push({ slot, matches: actual.toDataURL() === expected.toDataURL() });
    }
    return results;
  });
  expect(
    result.every((r) => r.matches),
    JSON.stringify(result),
  ).toBe(true);
});
