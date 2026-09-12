import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function mockTabCapture(page: Page, rejectFirst = false) {
  await page.addInitScript(
    ({ failFirst }) => {
      let attempts = 0;
      let captureHandle = '';
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          setCaptureHandleConfig: ({ handle }: { handle: string }) => {
            captureHandle = handle;
            Object.assign(window, { __captureHandleForTest: handle });
          },
          getDisplayMedia: async () => {
            attempts += 1;
            if (failFirst && attempts === 1)
              throw new DOMException('Permission denied', 'NotAllowedError');
            const canvas = document.createElement('canvas');
            canvas.width = innerWidth;
            canvas.height = innerHeight;
            const context = canvas.getContext('2d')!;
            const paint = () => {
              const styles = document.documentElement.style;
              const offsetX = Math.round(
                -Number.parseFloat(styles.getPropertyValue('--capture-frame-left') || '0') *
                  (canvas.width / innerWidth),
              );
              const offsetY = Math.round(
                (16 - Number.parseFloat(styles.getPropertyValue('--capture-frame-top') || '16')) *
                  (canvas.height / innerHeight),
              );
              context.fillStyle = `rgb(${40 + Math.floor(offsetX / canvas.width) * 60}, ${
                30 + Math.floor(offsetY / (canvas.height - 16)) * 60
              }, 180)`;
              context.fillRect(0, 0, canvas.width, canvas.height);
              const marker = document.querySelector<HTMLElement>('[data-capture-marker]');
              if (marker) {
                context.fillStyle = marker.style.backgroundColor;
                context.fillRect(0, 0, canvas.width, 16);
              }
            };
            paint();
            window.setInterval(paint, 50);
            const stream = canvas.captureStream(30);
            const track = stream.getVideoTracks()[0];
            track.getSettings = () =>
              ({
                width: canvas.width,
                height: canvas.height,
                displaySurface: 'browser',
              }) as MediaTrackSettings;
            Object.assign(track, { getCaptureHandle: () => ({ handle: captureHandle }) });
            return stream;
          },
        },
      });
    },
    { failFirst: rejectFirst },
  );
}

test('browser workspace exposes export immediately before Advanced', async ({ page }) => {
  await mockTabCapture(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Browser sim', exact: false })).toBeEnabled();
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();

  const toolbar = page.locator('.workspace-toolbar');
  const exportButton = toolbar.getByRole('button', { name: 'Export', exact: true });
  const advancedButton = toolbar.getByRole('button', { name: 'Advanced', exact: true });
  await expect(exportButton).toBeVisible();
  await expect
    .poll(() =>
      toolbar
        .getByRole('button')
        .allTextContents()
        .then(
          (labels) =>
            labels.findIndex((label) => label.trim() === 'Export') <
            labels.findIndex((label) => label.includes('Advanced')),
        ),
    )
    .toBe(true);
  await expect(toolbar.locator('.workspace-export + .advanced-toggle')).toHaveCount(1);
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(exportButton).toBeVisible();
    await expect(advancedButton).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
  }

  const innerFrame = page.locator('.web-surface[data-screen="inner"] iframe');
  await page.evaluate(() => {
    const root = document.documentElement;
    root.dataset.browserCapture = 'true';
    root.dataset.browserCaptureScreen = 'inner';
    root.style.setProperty('--capture-frame-width', '951px');
    root.style.setProperty('--capture-frame-height', '669px');
    root.style.setProperty('--capture-frame-scale-x', '1');
    root.style.setProperty('--capture-frame-scale-y', '1');
    root.style.setProperty('--capture-frame-left', '0px');
    root.style.setProperty('--capture-frame-top', '0px');
  });
  await expect(innerFrame).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeHidden();
  await page.evaluate(() => {
    const root = document.documentElement;
    delete root.dataset.browserCapture;
    delete root.dataset.browserCaptureScreen;
    for (const name of [
      '--capture-frame-width',
      '--capture-frame-height',
      '--capture-frame-scale-x',
      '--capture-frame-scale-y',
      '--capture-frame-left',
      '--capture-frame-top',
    ])
      root.style.removeProperty(name);
  });

  await exportButton.click();
  await expect(page.getByRole('dialog', { name: 'Take your work outside.' })).toBeVisible();
  await expect(page.getByRole('button', { name: /PNG image/ })).toBeVisible();
  await page.getByRole('button', { name: /Raw UI PNG/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Allow capture & generate' }).click();
  const exported = await download;
  await expect(exported.suggestedFilename()).toMatch(/-ui\.png$/);
  const path = await exported.path();
  const bytes = [...(await readFile(path!))];
  const pixels = await page.evaluate(async (data) => {
    const image = await createImageBitmap(new Blob([new Uint8Array(data)], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    return [
      [10, 10],
      [1439, 983],
      [1440, 984],
      [image.width - 1, image.height - 1],
    ].map(([x, y]) => [...context.getImageData(x, y, 1, 1).data]);
  }, bytes);
  expect(pixels).toEqual([
    [40, 30, 180, 255],
    [40, 30, 180, 255],
    [100, 90, 180, 255],
    [100, 150, 180, 255],
  ]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !document.documentElement.hasAttribute('data-browser-capture') &&
          (window as Window & { __captureHandleForTest?: string }).__captureHandleForTest === '',
      ),
    )
    .toBe(true);
});

test('browser export explains permission failure and can retry', async ({ page }) => {
  await mockTabCapture(page, true);
  await page.goto('/');
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(page.getByText('Current-tab capture permission required')).toBeVisible();
  await page.getByRole('button', { name: 'Allow capture & generate' }).click();
  await expect(page.getByRole('alert')).toContainText('not allowed');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Retry capture' }).click();
  await expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test('live browser keeps iframe state through folding and workspace switches preserve screenshots', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeAttached();
  await page.locator('.screenshot-inputs > summary').click();
  await page.getByRole('button', { name: 'Inner screen', exact: true }).click();
  await page.getByLabel('Upload Inner · Landscape').setInputFiles('public/demo/apple/inner.png');
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  await page
    .getByRole('button', { name: /Landscape/ })
    .first()
    .click();
  const frame = page.frameLocator('iframe[title="Duo inner screen page"]');
  await expect(frame.getByText('Live CSS viewport: 951 × 669 px')).toBeVisible();
  await frame.getByLabel('Demo URL').fill('not a valid url');
  await frame.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(frame.getByText('Enter an http:// or https:// address')).toBeVisible();
  await page.getByRole('slider', { name: 'Fold progress', exact: true }).fill('0.8');
  await expect(frame.getByText('Enter an http:// or https:// address')).toBeVisible();
  await expect(page.getByTestId('web-overlay')).toHaveAttribute('data-scene', 'landscape');
  await page.getByRole('button', { name: /^Closed/ }).click();
  await expect(
    page
      .frameLocator('iframe[title="Duo outer screen page"]')
      .getByText('Live CSS viewport: 466 × 678 px'),
  ).toBeVisible();
  await page.locator('.browser-options > summary').click();
  await page.getByRole('button', { name: 'Rotate device', exact: true }).click();
  await expect(page.locator('iframe[title="Duo outer screen page"]')).toHaveCSS(
    'pointer-events',
    'none',
  );
  await page.getByRole('button', { name: 'Screenshots', exact: true }).click();
  await expect(page.locator('iframe')).toHaveCount(0);
  await page.locator('.screenshot-inputs > summary').click();
  await page.getByRole('button', { name: 'Inner screen', exact: true }).click();
  await expect(page.getByTitle('inner.png', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
  await page.getByLabel('Site address').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Open site', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('HTTP');
  await page.screenshot({ path: 'docs/screenshots/browser-mode.png', fullPage: true });
});

test('live browser loads an external URL, refreshes and persists settings', async ({ page }) => {
  await page.route('https://embed.example/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button onclick="this.textContent=\'Clicked\'">External page</button>',
    }),
  );
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeAttached();
  await page.getByRole('button', { name: /Browser sim/ }).click();
  await page
    .getByRole('button', { name: /Landscape/ })
    .first()
    .click();
  await page.getByLabel('Site address').fill('embed.example/demo');
  await page.getByRole('button', { name: 'Open site', exact: true }).click();
  const inner = page.frameLocator('iframe[title="Duo inner screen page"]');
  await inner.getByRole('button', { name: 'External page' }).click();
  await expect(inner.getByRole('button', { name: 'Clicked' })).toBeVisible();
  await page.getByLabel('Reload page').click();
  await expect(inner.getByRole('button', { name: 'External page' })).toBeVisible();
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await page.getByLabel('Browser pixel ratio').selectOption('2');
  await expect(page.getByText('Saved to this browser')).toBeAttached();
  await page.reload();
  await expect(page.getByLabel('Site address')).toHaveValue('https://embed.example/demo');
  await expect(page.getByLabel('Browser pixel ratio')).toHaveValue('2');
  for (const width of [320, 375, 414, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      .toBe(true);
    await expect(page.getByRole('button', { name: /Browser sim/ })).toBeVisible();
    if (width === 375) {
      await page.getByLabel('Site address').click();
      await expect(page.getByLabel('Site address')).toBeFocused();
      await page.getByRole('button', { name: 'Open site', exact: true }).click();
      await expect(page.locator('#duo-preview')).toBeInViewport();
    }
  }
  if ((await page.locator('.browser-options').getAttribute('open')) === null)
    await page.locator('.browser-options > summary').click();
  await page.getByText('Blank or blocked page?').click();
  await expect(page.getByText(/refuse iframe embedding/)).toBeVisible();
});

test('live browser shares animation playback and all static scene controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Saved to this browser')).toBeAttached();
  await page.getByRole('button', { name: /Browser sim/ }).click();
  await page.getByRole('button', { name: 'Unfold', exact: true }).click();
  const before = await page.locator('iframe[title="Duo outer screen page"]').getAttribute('style');
  await page.getByLabel('Play animation').click();
  await expect(page.getByLabel('Pause animation')).toBeVisible();
  await expect
    .poll(() => page.locator('iframe[title="Duo outer screen page"]').getAttribute('style'))
    .not.toBe(before);
  await page.getByLabel('Pause animation').click();
  for (const [name, id] of [
    ['Closed', 'closed'],
    ['Landscape', 'landscape'],
    ['Portrait', 'portrait'],
    ['Seated', 'seated'],
    ['Standing', 'standing'],
  ]) {
    await page
      .getByRole('button', { name: new RegExp(name) })
      .first()
      .click();
    await page.getByRole('slider', { name: 'Fold progress', exact: true }).fill('0.4');
    await expect(page.getByTestId('web-overlay')).toHaveAttribute('data-scene', id);
    await expect(page.getByTestId('device-canvas')).toHaveAttribute('data-scene', id);
  }
  await expect(page.locator('.canvas-error')).toHaveCount(0);
});

for (const [scene, width, height, slot] of [
  ['Unfold', 2853, 2007, 'landscape'],
  ['Closed', 1398, 2034, 'outer'],
  ['Landscape', 2853, 2007, 'landscape'],
  ['Portrait', 2007, 2853, 'portrait'],
  ['Seated', 2007, 2853, 'seated'],
  ['Standing', 2034, 1398, 'standing'],
] as const) {
  test(`browser ${scene} exports scene-sized PNG and selects matching raw UI`, async ({ page }) => {
    await mockTabCapture(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Browser sim', exact: false }).click();
    await page
      .getByRole('button', { name: new RegExp('^' + scene) })
      .first()
      .click();
    await page.getByRole('button', { name: 'Export', exact: true }).click();
    await page.getByRole('button', { name: /Raw UI PNG/ }).click();
    await expect(page.getByLabel('Raw UI slot')).toHaveValue(slot);
    await page.getByRole('button', { name: /^PNG image/ }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Allow capture & generate' }).click();
    const file = await download;
    const bytes = await readFile((await file.path())!);
    // PNG IHDR dimensions verify the actual downloaded file, not just the dialog label.
    expect(bytes.readUInt32BE(16)).toBe(width);
    expect(bytes.readUInt32BE(20)).toBe(height);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}
