// Captures guide images from the running app (demo project) into public/guide/.
// Usage: node scripts/capture-guide-assets.mjs   (requires dev deps installed)
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = 'public/guide';
const TMP = 'artifacts/guide-capture';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error('dev server did not start');
}

async function canvasPainted(page) {
  return page.evaluate(() => {
    const c = document.querySelector('[data-testid="device-canvas"]');
    if (!c) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return d.some((v, i) => i % 4 === 3 && v > 0);
  });
}

async function waitScene(page, scene) {
  await page.waitForFunction(
    (s) => document.querySelector('[data-testid="device-canvas"]')?.dataset.scene === s,
    scene,
    { timeout: 15000 },
  );
  await wait(250);
}

function setSlider(page, value) {
  return page.evaluate((v) => {
    const el = document.querySelector('input.fold-slider[aria-label="Fold progress"]');
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

const server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT)], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
try {
  await waitForServer();
  mkdirSync(OUT, { recursive: true });
  mkdirSync(`${TMP}/poses`, { recursive: true });
  mkdirSync(`${TMP}/frames`, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(20000);
  await page.goto(BASE + '/');
  await page.waitForFunction(() => {
    const c = document.querySelector('[data-testid="device-canvas"]');
    if (!c) return false;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    return d.some((v, i) => i % 4 === 3 && v > 0);
  });

  // 1. Editor workspace with the demo project (Unfold scene).
  await page.screenshot({ path: `${OUT}/workspace.png` });

  // 2. Export dialog.
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  await page.getByText('Every file is generated locally').waitFor();
  await wait(300);
  await page.screenshot({ path: `${OUT}/export.png` });
  await page.keyboard.press('Escape');

  // 3. Six poses, canvas-only shots for the montage.
  const poses = ['Unfold', 'Closed', 'Landscape', 'Portrait', 'Seated', 'Standing'];
  const sceneIds = ['fold', 'closed', 'landscape', 'portrait', 'seated', 'standing'];
  for (let i = 0; i < poses.length; i++) {
    await page
      .locator('.quick-scenes')
      .getByRole('button', { name: poses[i], exact: true })
      .click();
    await waitScene(page, sceneIds[i]);
    await page.locator('[data-testid="device-canvas"]').screenshot({
      path: `${TMP}/poses/${String(i).padStart(2, '0')}-${poses[i]}.png`,
    });
  }
  const poseFiles = readdirSync(`${TMP}/poses`)
    .sort()
    .map((f) => `${TMP}/poses/${f}`);
  execFileSync('magick', [poseFiles[0], poseFiles[1], poseFiles[2], '+append', `${TMP}/row1.png`]);
  execFileSync('magick', [poseFiles[3], poseFiles[4], poseFiles[5], '+append', `${TMP}/row2.png`]);
  execFileSync('magick', [
    `${TMP}/row1.png`,
    `${TMP}/row2.png`,
    '-append',
    '-background',
    '#fafafa',
    '-splice',
    '8x8',
    '-bordercolor',
    '#fafafa',
    `${OUT}/poses.png`,
  ]);

  // 4. Folding animation GIF: sweep the fold slider closed -> open -> closed.
  await page.locator('.quick-scenes').getByRole('button', { name: 'Unfold', exact: true }).click();
  await waitScene(page, 'fold');
  let frame = 0;
  const sweep = [];
  for (let v = 0; v <= 1.0001; v += 0.1) sweep.push(Math.min(1, Math.round(v * 100) / 100));
  for (let v = 0.9; v >= 0.0001; v -= 0.1) sweep.push(Math.max(0, Math.round(v * 100) / 100));
  for (const v of sweep) {
    await setSlider(page, v);
    await wait(320);
    await page.locator('[data-testid="device-canvas"]').screenshot({
      path: `${TMP}/frames/${String(frame++).padStart(2, '0')}.png`,
    });
  }
  execFileSync('ffmpeg', [
    '-y',
    '-framerate',
    '12',
    '-i',
    `${TMP}/frames/%02d.png`,
    '-vf',
    'scale=640:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4',
    '-loop',
    '0',
    `${OUT}/hero-fold.gif`,
  ]);

  await browser.close();
  for (const f of ['workspace.png', 'export.png', 'poses.png', 'hero-fold.gif']) {
    const buf = readFileSync(`${OUT}/${f}`);
    let dims = '';
    if (f.endsWith('.png')) dims = `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`;
    console.log(`${f}: ${(buf.length / 1024).toFixed(0)}KB ${dims}`);
  }
  console.log('guide assets captured');
} finally {
  server.kill('SIGTERM');
}
