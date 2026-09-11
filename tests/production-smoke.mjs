import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ],
  { stdio: 'pipe' },
);
let browser;
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => {
      if (d.toString().includes('4173')) resolve();
    });
    server.on('exit', () => reject(new Error('Preview server could not start')));
  });
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
  const headers = await readFile('dist/_headers', 'utf8');
  const csp = headers
    .split('\n')
    .find((l) => l.trim().startsWith('Content-Security-Policy:'))
    .trim()
    .slice('Content-Security-Policy:'.length)
    .trim();
  await page.route('http://127.0.0.1:4173/**', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.getByText('Saved to this browser').waitFor();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.scene === 'fold');
  await mkdir('docs/screenshots', { recursive: true });
  await page.screenshot({ path: 'docs/screenshots/workbench.png', fullPage: true });
  for (const [scene, name] of [
    ['closed', 'Closed 闭合'],
    ['landscape', 'Landscape 展开横屏'],
    ['portrait', 'Portrait 展开竖屏'],
    ['seated', 'Seated 坐姿'],
    ['standing', 'Standing 站立'],
  ]) {
    await page.getByRole('button', { name }).click();
    await page.waitForFunction(
      (id) => document.querySelector('canvas')?.dataset.scene === id,
      scene,
    );
    await page.getByTestId('device-canvas').screenshot({ path: `docs/screenshots/${scene}.png` });
  }
  // The app keeps working after all initial assets are loaded and the network is disabled.
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Landscape 展开横屏' }).click();
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.scene === 'landscape');
  assert.equal(await page.locator('.canvas-error').count(), 0);
  await page.context().setOffline(false);
  await page.getByRole('button', { name: /Browser sim/ }).click();
  const demo = page.frameLocator('iframe[title="Duo inner screen page"]');
  await demo.getByLabel('Demo URL').fill('!!not a url!!');
  await demo.getByRole('button', { name: 'Open', exact: true }).click();
  assert.equal(await demo.getByText('Enter an http:// or https:// address').count(), 1);
  await page.getByRole('button', { name: /Screenshots/ }).click();
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Generate & download', exact: true }).click();
  const file = await event;
  assert.ok(file.suggestedFilename().endsWith('.png'));
  assert.deepEqual(errors, []);
  assert.deepEqual(
    requests.filter((r) => r.method !== 'GET'),
    [],
  );
  assert.deepEqual(
    requests.filter(
      (r) => !r.url.startsWith('http://127.0.0.1:4173/') && !r.url.startsWith('data:'),
    ),
    [],
  );
  console.log(
    JSON.stringify(
      {
        production: 'passed',
        csp: 'enforced from dist/_headers',
        runtime: 'static dist preview',
        network: 'same-origin GET only',
        offlineEditing: 'passed',
        browserDemoUnderCSP: 'passed',
        pngDownload: 'passed',
        screenshots: 'docs/screenshots',
        consoleErrors: errors,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  server.kill();
}
