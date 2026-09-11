import { test, expect } from '@playwright/test';
import type { Page, Download } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { unzipSync, strFromU8 } from 'fflate';

async function ready(page: Page) {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await expect
    .poll(() =>
      page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        return d.some((v, i) => i % 4 === 3 && v > 0);
      }),
    )
    .toBe(true);
}
async function fixture(page: Page, width = 2853, height = 2007) {
  const data = await page.evaluate(
    ({ width, height }) => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const x = c.getContext('2d')!;
      x.fillStyle = '#f52e43';
      x.fillRect(0, 0, width / 2, height);
      x.fillStyle = '#1cc994';
      x.fillRect(width / 2, 0, width / 2, height);
      x.fillStyle = 'white';
      x.font = `bold ${Math.round(width / 12)}px sans-serif`;
      x.fillText('LEFT ↑', width * 0.06, height * 0.2);
      x.fillText('RIGHT ↑', width * 0.55, height * 0.2);
      return c.toDataURL();
    },
    { width, height },
  );
  return {
    name: `screen-${width}-${height}.png`,
    mimeType: 'image/png',
    buffer: Buffer.from(data.split(',')[1], 'base64'),
  };
}
async function upload(page: Page, slot: string, width?: number, height?: number) {
  await page.getByLabel('Edit asset slot').selectOption(slot);
  await page.locator('.upload-zone input').setInputFiles(await fixture(page, width, height));
  await expect(page.getByText(/Replaced/)).toBeVisible();
}
async function buffer(d: Download) {
  const p = await d.path();
  return readFile(p!);
}
function pngSize(b: Buffer) {
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
async function exportDownload(page: Page) {
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  return event;
}

test('five poses, distinct texture halves, PNG dimensions and transparency', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await ready(page);
  await upload(page, 'landscape');
  await upload(page, 'outer', 1398, 2034);
  await page.getByRole('button', { name: 'Landscape 展开横屏' }).click();
  await expect
    .poll(() =>
      page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let red = 0,
          green = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] > 180 && d[i + 1] < 100) red++;
          if (d[i] < 100 && d[i + 1] > 150) green++;
        }
        return Math.min(red, green) > 1000;
      }),
    )
    .toBe(true);
  for (const name of [
    'Closed 闭合',
    'Portrait 展开竖屏',
    'Seated 坐姿',
    'Standing 站立',
    'Unfold 自由开合',
  ]) {
    await page.getByRole('button', { name }).click();
    await expect(page.locator('.canvas-error')).toHaveCount(0);
  }
  await page.getByLabel('Transparent background · PNG').check();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const d = await exportDownload(page);
  const b = await buffer(d);
  expect(pngSize(b)).toEqual([1600, 1000]);
  expect(b.length).toBeGreaterThan(10_000);
  expect(d.suggestedFilename()).not.toContain('demo');
  const alpha = await page.evaluate(async (base64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${base64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const x = c.getContext('2d')!;
    x.drawImage(img, 0, 0);
    return x.getImageData(0, 0, 1, 1).data[3];
  }, b.toString('base64'));
  expect(alpha).toBe(0);
  expect(errors).toEqual([]);
});

test('project round trip, persistence, undo and invalid import isolation', async ({ page }) => {
  await ready(page);
  await upload(page, 'outer', 1398, 2034);
  await page.getByLabel('Project name').fill('round-trip');
  await page.getByLabel('Project name').blur();
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Project name')).toHaveValue('round-trip');
  await page.getByRole('button', { name: 'Closed 闭合' }).click();
  await expect(page.locator('.asset-filename')).toContainText('1398×2034');
  const dEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const b = await buffer(await dEvent);
  const saved = JSON.parse(b.toString());
  expect(saved.pages[0].slots.outer.asset.data).toContain('data:image/png');
  await page.getByRole('button', { name: 'Add page', exact: true }).click();
  await expect(page.getByLabel('Page name')).toHaveValue('Page 2');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByLabel('Page name')).toHaveValue('EchoPod · Language learning');
  await page.getByLabel('Import project file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"schemaVersion":9}'),
  });
  await expect(page.getByRole('alert')).toContainText('Invalid or unsupported project file');
  await expect(page.getByLabel('Project name')).toHaveValue('round-trip');
  await page.getByLabel('Project name').fill('temp change');
  await page.getByLabel('Project name').blur();
  await page
    .getByLabel('Import project file')
    .setInputFiles({ name: 'restore.duo.json', mimeType: 'application/json', buffer: b });
  await expect(page.getByLabel('Project name')).toHaveValue('round-trip');
});

test('missing content blocks export and malformed upload preserves old asset', async ({ page }) => {
  await ready(page);
  await page.getByRole('switch', { name: 'Show demo when missing' }).uncheck();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  await expect(page.locator('.export-error')).toContainText('Still needed');
  await page.getByRole('button', { name: 'Back to editing' }).click();
  await upload(page, 'landscape');
  await page
    .locator('.upload-zone input')
    .setInputFiles({ name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('not png') });
  await expect(page.getByRole('alert')).toContainText('Could not decode the image');
  await expect(page.locator('.asset-filename')).toContainText('2853×2007');
});

test('batch ZIP only contains uploaded scenes and raw PNG matches official resolution', async ({
  page,
}) => {
  await ready(page);
  await upload(page, 'outer', 1398, 2034);
  await upload(page, 'landscape');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: /Scene bundle/ }).click();
  const zip = unzipSync(await buffer(await exportDownload(page)));
  expect(Object.keys(zip).filter((x) => x.endsWith('.png'))).toHaveLength(2);
  const manifest = JSON.parse(strFromU8(zip['manifest.json']));
  expect(manifest.items).toHaveLength(2);
  expect(manifest.items[0].source).toBe('design');
  await page.getByRole('button', { name: /Raw UI PNG/ }).click();
  await page.getByText('Raw UI slot', { exact: false }).locator('select').selectOption('outer');
  const raw = await buffer(await exportDownload(page));
  expect(pngSize(raw)).toEqual([1398, 2034]);
});

test('EchoPod demo replaces store mode and exports display sizes', async ({ page }) => {
  await ready(page);
  await expect(page.getByRole('button', { name: 'Store bundle', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Learn about EchoPod ↗' })).toHaveAttribute(
    'href',
    'https://echopod.clothpath.com/',
  );
  await expect(page.getByLabel('Page name')).toHaveValue('EchoPod · Language learning');
  for (const [size, expected] of Object.entries({
    wide: [1600, 1000],
    tall: [1080, 1350],
    square: [1200, 1200],
  })) {
    await page.getByLabel('Output size').selectOption(size);
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    expect(pngSize(await buffer(await exportDownload(page)))).toEqual(expected);
    await page.getByRole('button', { name: 'Back to editing' }).click();
  }
});

test('responsive workbench and keyboard modal at 320/375/414/768/1440', async ({ page }) => {
  await ready(page);
  await mkdir('test-results/visuals', { recursive: true });
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({ path: `test-results/visuals/workbench-${width}.png`, fullPage: true });
  }
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeFocused();
});

test('video and GIF export create decodable files and cancel cleanly', async ({ page }) => {
  test.setTimeout(180_000);
  await ready(page);
  await page.getByRole('button', { name: 'Fold animation', exact: true }).click();
  for (const [label, value] of [
    ['Duration', '2'],
    ['Start hold', '0'],
    ['End hold', '0'],
  ])
    await page.getByRole('slider', { name: label, exact: true }).fill(value);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByText('Checking this browser')).toHaveCount(0);
  for (const kind of ['MP4 animation', 'WebM animation']) {
    await page.getByRole('button', { name: new RegExp(kind) }).click();
    if (await page.getByText(/cannot encode this format/).isVisible()) {
      test.info().annotations.push({ type: 'codec-unavailable', description: kind });
      continue;
    }
    const d = await exportDownload(page),
      b = await buffer(d);
    expect(b.length).toBeGreaterThan(5000);
    await expect
      .poll(() =>
        page
          .locator('video')
          .evaluate(
            (v) => Number.isFinite(v.duration) && v.duration > 1.9 && v.videoWidth === 1280,
          ),
      )
      .toBe(true);
    const frameDifference = await page.locator('video').evaluate(async (video) => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 80;
      const ctx = c.getContext('2d')!;
      const frameAt = async (t: number) => {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Video seek timed out')), 10000);
          video.addEventListener(
            'seeked',
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true },
          );
          video.currentTime = t;
        });
        ctx.drawImage(video, 0, 0, 128, 80);
        return ctx.getImageData(0, 0, 128, 80).data;
      };
      const a = await frameAt(0.05),
        b = await frameAt(1.0);
      let changed = 0;
      for (let i = 0; i < a.length; i += 4)
        if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) > 30) changed++;
      return changed;
    });
    expect(frameDifference).toBeGreaterThan(100);
    await d.saveAs(`test-results/visuals/demo.${kind.startsWith('MP4') ? 'mp4' : 'webm'}`);
  }
  await page.getByRole('button', { name: /GIF loop/ }).click();
  const gif = await buffer(await exportDownload(page));
  expect(gif.subarray(0, 6).toString()).toMatch(/GIF89a|GIF87a/);
  expect(gif.length).toBeGreaterThan(10000);
  const frames = await page.evaluate(async (data) => {
    const bytes = Uint8Array.from(atob(data), (x) => x.charCodeAt(0));
    const decoder = new (window as any).ImageDecoder({ data: bytes, type: 'image/gif' });
    await decoder.tracks.ready;
    const n = decoder.tracks.selectedTrack.frameCount;
    decoder.close();
    return n;
  }, gif.toString('base64'));
  expect(frames).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Regenerate', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel export', exact: true }).click();
  await expect(page.locator('.export-error')).toContainText('cancelled');
});

test('repeat rendering does not move the device, and no user data leaves browser', async ({
  page,
}) => {
  const requests: { url: string; method: string }[] = [];
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
  await ready(page);
  await upload(page, 'standing', 2034, 1398);
  await page.getByRole('button', { name: 'Standing 站立' }).click();
  const frame = () =>
    page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await expect.poll(() => page.locator('.uploaded-tag').count()).toBe(1);
  // Wait until the colored user texture is painted, then trigger unrelated document edits.
  await expect
    .poll(() =>
      page.getByTestId('device-canvas').evaluate((c: HTMLCanvasElement) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 100) n++;
        return n > 1000;
      }),
    )
    .toBe(true);
  const first = await frame();
  await page.getByLabel('Page name').fill('stable frame');
  await page.getByLabel('Page name').blur();
  await expect(page.getByText('Saved to this browser')).toBeVisible();
  expect(await frame()).toBe(first);
  expect(
    requests.filter(
      (r) => !r.url.startsWith('http://127.0.0.1:5173/') && !r.url.startsWith('data:'),
    ),
  ).toEqual([]);
  expect(requests.filter((r) => r.method !== 'GET')).toEqual([]);
});

test('wrong raw size and corrupt portable images are rejected without overwriting', async ({
  page,
}) => {
  await ready(page);
  await upload(page, 'outer', 1000, 1000);
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByRole('button', { name: /Raw UI PNG/ }).click();
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  await expect(page.locator('.export-error')).toContainText('1398 × 2034');
  await page.getByRole('button', { name: 'Back to editing' }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  const json = JSON.parse((await buffer(await event)).toString());
  json.pages[0].slots.landscape.asset = { ...json.pages[0].slots.outer.asset, width: 999 };
  await page.getByLabel('Import project file').setInputFiles({
    name: 'corrupt.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(json)),
  });
  await expect(page.getByRole('alert')).toContainText('does not match its recorded size');
  await expect(page.locator('.asset-filename')).toContainText('1000×1000');
});

test('unavailable IndexedDB is reported and portable save remains usable', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new DOMException('Disabled', 'SecurityError');
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByText('Auto-restore failed')).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  expect(JSON.parse((await buffer(await event)).toString()).schemaVersion).toBe(1);
});
