import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'http://127.0.0.1:5200';

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch {}
    await wait(500);
  }
  throw new Error('preview server did not start');
}

const server = spawn('npm', ['run', 'preview', '--', '--port', '5200'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
});
try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  const shots = [
    ['/', 'home', 1440, 1000],
    ['/specs/', 'specs', 1440, 1400],
    ['/guide/', 'guide', 1440, 1400],
    ['/zh/specs/', 'specs-zh', 1440, 1400],
    ['/guide/', 'guide-mobile', 375, 1200],
  ];
  for (const [path, name, w, h] of shots) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(BASE + path);
    await wait(400);
    await page.screenshot({ path: `artifacts/seo/verify-${name}.png`, fullPage: h >= 1400 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(`${name}: overflow=${overflow}`);
    await page.close();
  }
  await browser.close();
  console.log('verification shots saved to artifacts/seo/');
} finally {
  server.kill('SIGTERM');
}
