import { mkdirSync, writeFileSync } from 'node:fs';
const origin = 'https://iduo.clothpath.com';
const repo = 'https://github.com/huanglizhuo/iPhoneDuoMock';
const e = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const facts = {
  en: {
    path: '/guide/',
    title: 'Foldable Phone Mockups & Browser Preview Guide | Duo Studio',
    description:
      'Learn how to create foldable phone mockups from inner and outer screenshots, preview embeddable websites, and export PNG, MP4, WebM or GIF with Duo Studio.',
    heading: 'Create foldable phone mockups with Duo Studio',
    intro:
      'Duo Studio is an open-source, browser-based tool for creating foldable phone mockups and folding animations from app screenshots. Upload inner and outer screen images, choose a device pose, and export a visual for your product launch. Browser simulation previews websites that permit iframe embedding. The editor processes screenshots locally and runs on static hosting.',
    open: 'Open the editor',
    other: '简体中文',
    otherPath: '/zh/guide/',
    sections: [
      [
        'How do I make a mockup from screenshots?',
        '<ol><li>Choose <strong>Screenshots</strong> in the top bar and expand <strong>Upload your screenshot</strong>.</li><li>Upload the inner screen and, optionally, a separate outer screen. Without a separate outer image, the editor can derive the outer view from the inner image’s left side. Choose a fill mode to cover the screen when aspect ratios differ.</li><li>Choose Unfold, Closed, Landscape, Portrait, Seated or Standing. Assign screenshots that match the orientation of each scene, then adjust the folding slider.</li><li>Select <strong>Export</strong>, choose a format and size, then generate and download. Advanced opens additional framing and scene controls.</li></ol>',
      ],
      [
        'Which mode should I use?',
        '<div class="table-wrap"><table><thead><tr><th>Mode</th><th>Input</th><th>Useful for</th></tr></thead><tbody><tr><td>Screenshots</td><td>Inner and outer screen images</td><td>Launch graphics, device mockups and folding animations</td></tr><tr><td>Browser simulation</td><td>An embeddable website URL</td><td>Exploring responsive page layouts and live interactions across poses</td></tr></tbody></table></div>',
      ],
      [
        'Can I preview any website?',
        '<p>No. The target website must allow iframe embedding. Sites using restrictive Content-Security-Policy frame-ancestors or X-Frame-Options headers may refuse to load. Duo Studio cannot bypass those restrictions. Browser mode loads content directly from the target site; it is not a screenshot upload.</p><p>Live webpage exports require permission to capture the current tab in a supported browser. Preview viewport dimensions and exported image pixels are separate settings; check the selected scene and output size before exporting.</p>',
      ],
      [
        'What can I export?',
        '<p>PNG stills, MP4 and WebM folding animations, GIF loops, scene bundles as PNG ZIP files, and raw UI PNGs. Video encoder support depends on your browser. Use screenshots for repeatable launch visuals and browser mode when you need to inspect live page behavior.</p>',
      ],
      [
        'Do screenshots leave my device?',
        '<p>Duo Studio processes uploaded screenshots and exports locally. Projects can be saved as .duo.json files and are autosaved in the browser. A saved project can contain your original images, so share project files only when you intend to share those assets. Browser mode makes requests to the website you open, which has its own privacy practices.</p>',
      ],
      [
        'Is this an iPhone Duo emulator or an Apple tool?',
        '<p>Duo Studio provides iPhone Duo-style visual mockups using device assets attributed in the project. It does not run iOS or your native app and is not an Apple product. Mockups do not prove real-device compatibility, app adaptation, or App Store acceptance. Use actual device testing and current submission requirements for those decisions.</p>',
      ],
      [
        'Who maintains the project?',
        `<p>The implementation, license, asset attribution and issue tracker are available in the <a href="${repo}">iPhoneDuoMock source repository</a>. The example screenshots show EchoPod; replace them with your own app. <a href="${repo}/issues">Report a problem or suggest a feature</a>.</p>`,
      ],
    ],
  },
  zh: {
    path: '/zh/guide/',
    title: '折叠屏效果图与网页模拟使用指南 | Duo Studio',
    description:
      '用 Duo Studio 上传内外屏截图、切换折叠场景、预览支持嵌入的网站，并在本地导出 PNG、MP4、WebM 或 GIF。',
    heading: '用 Duo Studio 制作折叠屏效果图',
    intro:
      'Duo Studio 是一个开源、完全在浏览器中运行的折叠屏效果图与动画制作工具。上传 App 的内外屏截图，选择设备姿态，即可为产品发布生成视觉素材。网页模拟模式可预览允许 iframe 嵌入的网站。截图处理与导出在本地完成，应用可以部署在静态托管服务上。',
    open: '打开编辑器',
    other: 'English',
    otherPath: '/guide/',
    sections: [
      [
        '如何用截图制作效果图？',
        '<ol><li>在顶部选择截图制作模式，展开上传截图入口。</li><li>上传内屏截图，也可以单独上传外屏截图。没有单独外屏图时，可从内屏左半部分生成外屏视图。图片比例不一致时，可调整填充模式铺满屏幕。</li><li>选择自由开合、闭合、展开横屏、展开竖屏、坐姿或站立，为不同场景配置方向相符的截图，再调整折叠进度。</li><li>点击导出，选择格式和尺寸后生成下载。高级模式可调整更多取景与场景设置。</li></ol>',
      ],
      [
        '截图制作和网页模拟有什么区别？',
        '<div class="table-wrap"><table><thead><tr><th>模式</th><th>输入</th><th>适用场景</th></tr></thead><tbody><tr><td>截图制作</td><td>内外屏图片</td><td>产品发布图、设备效果图、折叠动画</td></tr><tr><td>网页模拟</td><td>允许嵌入的网站地址</td><td>检查不同姿态下的响应式布局与网页交互</td></tr></tbody></table></div>',
      ],
      [
        '任何网站都能打开吗？',
        '<p>不能。目标网站必须允许 iframe 嵌入。通过 Content-Security-Policy 的 frame-ancestors 或 X-Frame-Options 限制嵌入的网站可能无法打开，本工具不会绕过这些限制。网页模拟会直接请求目标网站，而不是上传网页截图。</p><p>导出实时网页需要在支持的浏览器中授权捕获当前标签页。网页布局视口和导出图片的像素尺寸是不同的设置，导出前应检查当前场景和输出尺寸。</p>',
      ],
      [
        '支持导出哪些格式？',
        '<p>支持 PNG 静态图、MP4 和 WebM 折叠动画、GIF 循环动画、PNG ZIP 场景包及原始 UI PNG。视频编码能力取决于浏览器。需要可重复的发布素材时使用截图模式，需要检查实时网页表现时使用网页模拟。</p>',
      ],
      [
        '截图会上传到服务器吗？',
        '<p>Duo Studio 在本地处理截图并生成导出文件。项目可以保存为 .duo.json 文件，也会在浏览器中自动保存。项目文件可能包含原始截图，分享时需要一并考虑这些素材。网页模式会访问你打开的网站，该网站有独立的隐私实践。</p>',
      ],
      [
        '这是 iPhone Duo 真机模拟器或 Apple 官方工具吗？',
        '<p>Duo Studio 使用项目中注明来源的设备素材，生成 iPhone Duo 风格的视觉效果图。它不运行 iOS 或你的原生 App，也不是 Apple 官方产品。效果图不能证明真机兼容性、适配完成或符合 App Store 审核要求；这些仍需通过真实测试与当前提交规范确认。</p>',
      ],
      [
        '项目由谁维护？',
        `<p>代码、许可证、素材来源与问题反馈入口均在 <a href="${repo}">iPhoneDuoMock 源码仓库</a>公开。示例使用 EchoPod 截图，你可以替换为自己的 App。<a href="${repo}/issues">反馈问题或提出功能建议</a>。</p>`,
      ],
    ],
  },
};
function head(title, description, path, lang = 'en', schema = null, alternates = false) {
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${origin}${path}"><link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#f6f7f9"><meta property="og:type" content="website"><meta property="og:site_name" content="Duo Studio"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:locale" content="${lang === 'zh' ? 'zh_CN' : 'en_US'}"><meta property="og:image" content="${origin}/social/duo-studio.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Duo Studio foldable phone mockup editor"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${origin}/social/duo-studio.png"><meta name="twitter:image:alt" content="Duo Studio foldable phone mockup editor">${alternates ? `<link rel="alternate" hreflang="en" href="${origin}/guide/"><link rel="alternate" hreflang="zh-Hans" href="${origin}/zh/guide/"><link rel="alternate" hreflang="x-default" href="${origin}/guide/">` : ''}${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}`;
}
const app = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': origin + '/#app',
  name: 'Duo Studio',
  alternateName: 'iPhoneDuoMock',
  url: origin + '/',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web browser',
  isAccessibleForFree: true,
  description: facts.en.intro,
  license: repo + '/blob/main/LICENSE',
  sameAs: [repo],
  featureList: [
    'Inner and outer screen screenshot mockups',
    'Six device poses',
    'Embeddable website preview',
    'PNG, MP4, WebM and GIF export',
  ],
};
writeFileSync(
  'index.html',
  `<!doctype html><html lang="en"><head>${head('Duo Studio — Foldable Phone Mockups & Animations', 'Create foldable phone mockups from your app screenshots. Preview embeddable websites and export PNG, MP4 or GIF locally in your browser.', '/', 'en', app)}</head><body><div id="root"><main style="max-width:760px;margin:64px auto;padding:24px;font:18px/1.6 system-ui"><h1>Duo Studio — foldable phone mockups</h1><p>${facts.en.intro}</p><p><a href="/guide/">Read the screenshot and browser preview guide</a> · <a href="/zh/guide/">中文使用指南</a></p><noscript><p>Enable JavaScript to use the interactive editor. The guides work without JavaScript.</p></noscript></main></div><script type="module" src="/src/main.tsx"></script></body></html>`,
);
for (const [lang, f] of Object.entries(facts)) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': origin + f.path,
    name: f.title,
    description: f.description,
    url: origin + f.path,
    inLanguage: lang === 'zh' ? 'zh-Hans' : 'en',
    about: { '@id': origin + '/#app' },
  };
  const dir = 'public' + f.path;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    dir + 'index.html',
    `<!doctype html><html lang="${lang === 'zh' ? 'zh-Hans' : 'en'}"><head>${head(f.title, f.description, f.path, lang, schema, true)}<link rel="stylesheet" href="/guide.css"></head><body><header><a href="/">Duo Studio</a><nav aria-label="${lang === 'zh' ? '导航' : 'Navigation'}"><a href="${f.otherPath}" lang="${lang === 'zh' ? 'en' : 'zh-Hans'}">${f.other}</a><a href="/" class="action">${f.open}</a></nav></header><main><h1>${f.heading}</h1><p class="lead">${f.intro}</p><img src="/social/duo-studio.png" width="1200" height="630" alt="${lang === 'zh' ? 'Duo Studio 折叠屏效果图示例' : 'Duo Studio foldable phone mockup example'}">${f.sections.map(([h, b], i) => `<section id="section-${i + 1}"><h2>${h}</h2>${b}</section>`).join('')}<p><a class="action" href="/">${f.open}</a></p></main></body></html>`,
  );
}
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/guide/', '/zh/guide/'].map((path) => `<url><loc>${origin}${path}</loc></url>`).join('')}</urlset>\n`,
);
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
writeFileSync(
  'public/404.html',
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Duo Studio</title><link rel="stylesheet" href="/guide.css"></head><body><main><h1>Page not found</h1><p>This address does not exist.</p><p><a href="/">Open Duo Studio</a> · <a href="/guide/">Read the guide</a></p></main></body></html>',
);

// Allow only the generated JSON-LD blocks; preserve the existing script-src policy.
const { createHash } = await import('node:crypto');
const { readFileSync } = await import('node:fs');
const hashes = ['index.html', 'public/guide/index.html', 'public/zh/guide/index.html'].map(
  (file) => {
    const json = readFileSync(file, 'utf8').match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    )[1];
    return `'sha256-${createHash('sha256').update(json).digest('base64')}'`;
  },
);
let headers = readFileSync('public/_headers', 'utf8').replace(/ 'sha256-[^']+'/g, '');
headers = headers.replace("script-src 'self';", `script-src 'self' ${hashes.join(' ')};`);
if (!headers.includes('/browser-demo\n'))
  headers +=
    '\n/browser-demo\n  X-Robots-Tag: noindex\n/browser-demo.html\n  X-Robots-Tag: noindex\n';
writeFileSync('public/_headers', headers);
