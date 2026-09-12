import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const root = 'https://iduo.clothpath.com';
const headers = await readFile('dist/_headers', 'utf8');
for (const [file, path, lang] of [
  ['index.html', '/', 'en'],
  ['guide/index.html', '/guide/', 'en'],
  ['zh/guide/index.html', '/zh/guide/', 'zh-Hans'],
]) {
  const html = await readFile('dist/' + file, 'utf8');
  assert.match(html, new RegExp(`<html lang="${lang}"`));
  assert(html.includes(`rel="canonical" href="${root}${path}"`));
  assert(html.includes('summary_large_image'));
  assert(html.includes(`${root}/social/duo-studio.png`));
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert(json);
  const data = JSON.parse(json);
  assert.equal(data.url, root + path);
  assert(headers.includes(`'sha256-${createHash('sha256').update(json).digest('base64')}'`));
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1);
  if (path !== '/') {
    assert(!html.includes('type="module"'));
    assert(!html.includes('<script src='));
    assert(html.includes('hreflang="en"'));
    assert(html.includes('hreflang="zh-Hans"'));
    assert(html.includes('frame-ancestors'));
    assert(html.includes('MP4'));
    assert(html.includes('App Store'));
  }
}
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 3);
assert((await readFile('dist/robots.txt', 'utf8')).includes(`Sitemap: ${root}/sitemap.xml`));
assert(!(await readFile('dist/_redirects', 'utf8')).includes('/* /index.html 200'));
assert((await readFile('dist/404.html', 'utf8')).includes('noindex'));
const png = await readFile('dist/social/duo-studio.png');
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log(
  'SEO checks passed: 3 canonical pages, reciprocal language links, crawlable guides, JSON-LD/CSP, sharing image, sitemap and 404 configuration.',
);
