import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'https://iduo.clothpath.com';
const updated = '2026-09-12';
const headers = await readFile('dist/_headers', 'utf8');
const pages = [
  ['index.html', '/', 'en'],
  ['guide/index.html', '/guide/', 'en'],
  ['zh/guide/index.html', '/zh/guide/', 'zh-Hans'],
  ['specs/index.html', '/specs/', 'en'],
  ['zh/specs/index.html', '/zh/specs/', 'zh-Hans'],
];
for (const [file, path, lang] of pages) {
  const html = await readFile('dist/' + file, 'utf8');
  assert.match(html, new RegExp(`<html lang="${lang}"`));
  assert(html.includes(`rel="canonical" href="${root}${path}"`));
  assert(html.includes('summary_large_image'));
  assert(html.includes(`${root}/social/duo-studio.png`));
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert(json);
  const data = JSON.parse(json);
  assert.equal(data.url, root + path);
  assert.equal(data.dateModified, updated);
  assert.equal(data.datePublished, updated);
  assert(headers.includes(`'sha256-${createHash('sha256').update(json).digest('base64')}'`));
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  if (path !== '/') {
    assert(!html.includes('type="module"'));
    assert(!html.includes('<script src='));
    assert(html.includes('hreflang="en"'));
    assert(html.includes('hreflang="zh-Hans"'));
    assert(html.includes('hreflang="x-default"'));
    if (path.includes('/guide/')) assert(html.includes('frame-ancestors'));
    assert(html.includes('MP4'));
    assert(html.includes('App Store'));
    assert(html.includes('<time datetime="' + updated + '"'));
  }
}
const home = await readFile('dist/index.html', 'utf8');
assert(home.includes('is not an Apple product'));
assert(home.includes('href="/specs/"'));
const enGuide = await readFile('dist/guide/index.html', 'utf8');
assert(enGuide.includes('/guide/hero-fold.gif'));
assert(enGuide.includes('/guide/workspace.png'));
assert(enGuide.includes('/guide/poses.png'));
assert(enGuide.includes('/guide/export.png'));
assert(enGuide.includes('2853 × 2007'));
assert(enGuide.includes('1398 × 2034'));
assert(enGuide.includes('1280'));
for (const asset of [
  'guide/hero-fold.gif',
  'guide/workspace.png',
  'guide/poses.png',
  'guide/export.png',
]) {
  await access('dist/' + asset);
}
for (const specsFile of ['specs/index.html', 'zh/specs/index.html']) {
  const html = await readFile('dist/' + specsFile, 'utf8');
  assert(html.includes('2853 × 2007'));
  assert(html.includes('2007 × 2853'));
  assert(html.includes('1398 × 2034'));
  assert(html.includes('2034 × 1398'));
  assert(html.includes('1.42:1'));
  assert(html.includes('GIF'));
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 5);
assert.equal((sitemap.match(/<lastmod>/g) || []).length, 5);
assert(sitemap.includes(`<lastmod>${updated}</lastmod>`));
assert((await readFile('dist/robots.txt', 'utf8')).includes(`Sitemap: ${root}/sitemap.xml`));
const llms = await readFile('dist/llms.txt', 'utf8');
assert(llms.includes('/specs/'));
assert(llms.includes('/guide/'));
const keyFile = (await readdir('dist')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
assert(keyFile, 'IndexNow key file missing from dist');
assert.equal(await readFile('dist/' + keyFile, 'utf8'), keyFile.replace('.txt', ''));
assert(!(await readFile('dist/_redirects', 'utf8')).includes('/* /index.html 200'));
assert((await readFile('dist/404.html', 'utf8')).includes('noindex'));
const png = await readFile('dist/social/duo-studio.png');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log(
  'SEO checks passed: 5 canonical pages with dates, specs data pages, crawlable guides with captured assets, JSON-LD/CSP, llms.txt, IndexNow key, sharing image, sitemap lastmod and 404 configuration.',
);
