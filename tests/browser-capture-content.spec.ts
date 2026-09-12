import { test, expect } from '@playwright/test';
test('capture tiles include both halves of the live inner webpage', async ({ page }) => {
  await page.route('https://capture.example/**', (r) =>
    r.fulfill({
      contentType: 'text/html',
      body: '<style>html,body{margin:0;width:100%;height:100%;background:linear-gradient(to right,rgb(240,20,20) 50%,rgb(20,20,240) 50%)}</style>',
    }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: /Browser sim/ }).click();
  await page.getByLabel('Site address').fill('https://capture.example/');
  await page.getByRole('button', { name: 'Open site', exact: true }).click();
  await expect(
    page.frameLocator('iframe[title="Duo inner screen page"]').locator('body'),
  ).toBeVisible();
  for (const [x, color] of [
    [0, [240, 20, 20]],
    [1440, [20, 20, 240]],
  ] as const) {
    await page.evaluate((x) => {
      const r = document.documentElement;
      r.dataset.browserCapture = 'true';
      r.dataset.browserCaptureScreen = 'inner';
      for (const [k, v] of Object.entries({
        width: '951px',
        height: '669px',
        'scale-x': '3',
        'scale-y': '3',
        left: `${-x}px`,
        top: '0px',
      }))
        r.style.setProperty('--capture-frame-' + k, v);
    }, x);
    const shot = await page.screenshot();
    const rgb = await page.evaluate(async (data) => {
      const im = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const c = document.createElement('canvas');
      c.width = im.width;
      c.height = im.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(im, 0, 0);
      return Array.from(ctx.getImageData(1000, 300, 1, 1).data).slice(0, 3);
    }, Array.from(shot));
    expect(rgb).toEqual(color);
  }
});

test('export waits for the newly painted tile instead of copying a buffered capture frame', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Browser sim/ }).click();
  const pixels = await page.evaluate(async () => {
    let handle = '';
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        setCaptureHandleConfig: ({ handle: h }: { handle: string }) => {
          handle = h;
        },
        getDisplayMedia: async () => {
          const c = document.createElement('canvas');
          c.width = innerWidth;
          c.height = innerHeight;
          const ctx = c.getContext('2d')!;
          let key = '',
            committed = { left: 0, top: 0, color: '' };
          const timer = setInterval(() => {
            const root = document.documentElement,
              style = root.style;
            const next = {
              left: parseFloat(style.getPropertyValue('--capture-frame-left')) || 0,
              top: parseFloat(style.getPropertyValue('--capture-frame-top')) || 0,
              color:
                document.querySelector<HTMLElement>('[data-capture-marker]')?.style
                  .backgroundColor || '',
            };
            const k = JSON.stringify(next);
            // Tab capture is asynchronous: already-buffered frames can arrive after layout changes.
            if (k !== key) {
              key = k;
              setTimeout(() => {
                committed = next;
              }, 150);
            }
            ctx.fillStyle = committed.left < -1000 ? 'rgb(20,20,240)' : 'rgb(240,20,20)';
            ctx.fillRect(0, 0, c.width, c.height);
            if (committed.color) {
              ctx.fillStyle = committed.color;
              ctx.fillRect(0, 0, c.width, 16);
            }
          }, 16);
          const stream = c.captureStream(30),
            track = stream.getVideoTracks()[0];
          track.getSettings = () => ({ displaySurface: 'browser' });
          Object.assign(track, { getCaptureHandle: () => ({ handle }) });
          track.addEventListener('ended', () => clearInterval(timer));
          return stream;
        },
      },
    });
    // @ts-expect-error Vite module
    const { captureBrowserProject } = await import('/src/lib/browserCapture.ts');
    // @ts-expect-error Vite module
    const { initialProject } = await import('/src/lib/project.ts');
    const p = initialProject();
    p.workspace = 'browser';
    const result = await captureBrowserProject(p, new AbortController().signal, () => {});
    const im = new Image();
    im.src = result.pages[0].slots.landscape.asset.data;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = im.width;
    c.height = im.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(im, 0, 0);
    return [100, 2000].map((x) => Array.from(ctx.getImageData(x, 100, 1, 1).data).slice(0, 3));
  });
  expect(pixels).toEqual([
    [240, 20, 20],
    [20, 20, 240],
  ]);
});
