import { translatedArticles } from './site-translations.mjs';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
const locales = JSON.parse(
  readFileSync(new URL('../src/i18n/locales.json', import.meta.url), 'utf8'),
);
const origin = 'https://iduo.clothpath.com';
const repo = 'https://github.com/huanglizhuo/iPhoneDuoMock';
// Bump `updated` whenever guide/spec content changes; it feeds the visible
// footer, JSON-LD dateModified and sitemap lastmod.
const published = '2026-09-12';
const updated = '2026-09-13';
const indexNowKey = '680382cc15ef6d4d80c7ee1b39691099';
const e = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const [y, m, d] = updated.split('-').map(Number);
const dateHtml = {
  en: `Updated <time datetime="${updated}">${months[m - 1]} ${d}, ${y}</time>`,
  ja: `更新日 <time datetime="${updated}">${y}年${m}月${d}日</time>`,
  fr: `Mis à jour le <time datetime="${updated}">${d}/${m}/${y}</time>`,
  zh: `更新于 <time datetime="${updated}">${y} 年 ${m} 月 ${d} 日</time>`,
};
// Captured by `npm run capture:guide` from the running app.
const images = {
  fold: {
    src: '/guide/hero-fold.gif',
    width: 640,
    height: 400,
    alt: 'Duo Studio folding animation: an iPhone Duo-style device opening from closed to landscape',
    altZh: 'Duo Studio 折叠动画:iPhone Duo 风格设备从闭合展开到横屏',
  },
  workspace: {
    src: '/guide/workspace.png',
    width: 1440,
    height: 1000,
    alt: 'Duo Studio editor with the demo project loaded and the fold slider visible',
    altZh: 'Duo Studio 编辑器与演示项目、折叠进度滑杆',
  },
  poses: {
    src: '/guide/poses.png',
    width: 1800,
    height: 753,
    alt: 'The six device poses in Duo Studio: Unfold, Closed, Landscape, Portrait, Seated and Standing',
    altZh: 'Duo Studio 的六种设备姿态:自由开合、闭合、展开横屏、展开竖屏、坐姿与站立',
  },
  export: {
    src: '/guide/export.png',
    width: 1440,
    height: 1000,
    alt: 'The Duo Studio export dialog listing PNG, MP4, WebM, GIF and ZIP bundle options',
    altZh: 'Duo Studio 导出面板,列出 PNG、MP4、WebM、GIF 与 ZIP 场景包选项',
  },
};
const imageAlt = {
  ja: {
    fold: 'Duo Studio の開閉アニメーション',
    workspace: 'Duo Studio のスクリーンショット編集画面',
    poses: '自由開閉、閉じた状態、横向き、縦向き、卓上、スタンドの6つの姿勢',
    export: 'PNG・MP4・WebM・GIF・ZIP の書き出し画面',
  },
  fr: {
    fold: 'Animation de pliage dans Duo Studio',
    workspace: 'Éditeur de captures Duo Studio',
    poses: 'Six positions : pliage libre, fermé, paysage, portrait, assis et debout',
    export: 'Options d’export PNG, MP4, WebM, GIF et ZIP',
  },
};
const image = (key, lang, lazy = true) =>
  `<img src="${images[key].src}" width="${images[key].width}" height="${images[key].height}" alt="${e(lang === 'zh' ? images[key].altZh : lang === 'ja' ? imageAlt.ja[key] : lang === 'fr' ? imageAlt.fr[key] : images[key].alt)}"${lazy ? ' loading="lazy"' : ''}>`;
// Slot dimensions mirror SPECS in src/lib/project.ts; update both together.
const sizeTable = {
  en: `<div class="table-wrap"><table><thead><tr><th>Screen</th><th>Used by pose</th><th>Recommended pixels</th><th>Aspect</th></tr></thead><tbody><tr><td>Inner, landscape</td><td>Unfold, Landscape</td><td>2853 × 2007</td><td>1.42:1</td></tr><tr><td>Inner, portrait</td><td>Portrait, Seated</td><td>2007 × 2853</td><td>1:1.42</td></tr><tr><td>Outer, portrait</td><td>Closed</td><td>1398 × 2034</td><td>1:1.45</td></tr><tr><td>Outer, landscape</td><td>Standing</td><td>2034 × 1398</td><td>1.45:1</td></tr></tbody></table></div>`,
  zh: `<div class="table-wrap"><table><thead><tr><th>屏幕</th><th>使用姿态</th><th>建议像素</th><th>宽高比</th></tr></thead><tbody><tr><td>内屏 · 横屏</td><td>自由开合、展开横屏</td><td>2853 × 2007</td><td>1.42:1</td></tr><tr><td>内屏 · 竖屏</td><td>展开竖屏、坐姿</td><td>2007 × 2853</td><td>1:1.42</td></tr><tr><td>外屏 · 竖屏</td><td>闭合</td><td>1398 × 2034</td><td>1:1.45</td></tr><tr><td>外屏 · 横屏</td><td>站立</td><td>2034 × 1398</td><td>1.45:1</td></tr></tbody></table></div>`,
};
const exportTable = {
  en: `<div class="table-wrap"><table><thead><tr><th>Format</th><th>What you get</th><th>Resolution and frame rate</th><th>Notes</th></tr></thead><tbody><tr><td>PNG still</td><td>Framed mockup at the selected output size</td><td>Scene-native up to 2853 × 2007, Wide 1600 × 1000, Tall 1080 × 1350 or Square 1200 × 1200</td><td>Transparent background optional</td></tr><tr><td>MP4 animation</td><td>H.264 folding animation</td><td>30 fps, longest side up to 1280 px</td><td>Needs browser H.264 encoding</td></tr><tr><td>WebM animation</td><td>VP9 folding animation</td><td>30 fps, longest side up to 1280 px</td><td>Needs browser VP9 encoding</td></tr><tr><td>GIF loop</td><td>Looping folding animation</td><td>12 fps, longest side up to 640 px</td><td>128-colour palette</td></tr><tr><td>Scene bundle ZIP</td><td>One PNG per screen slot plus a manifest</td><td>Native slot dimensions, e.g. 2853 × 2007</td><td>Builds a complete screenshot set</td></tr><tr><td>Raw UI PNG</td><td>An uploaded screen image, unframed</td><td>Must match the slot size exactly, e.g. 1398 × 2034</td><td>Confirms exact-size sources</td></tr></tbody></table></div>`,
  zh: `<div class="table-wrap"><table><thead><tr><th>格式</th><th>内容</th><th>分辨率与帧率</th><th>说明</th></tr></thead><tbody><tr><td>PNG 静态图</td><td>按所选输出尺寸装框的效果图</td><td>场景原始尺寸最高 2853 × 2007,横版 1600 × 1000、竖版 1080 × 1350 或方形 1200 × 1200</td><td>可选透明背景</td></tr><tr><td>MP4 动画</td><td>H.264 折叠动画</td><td>30 fps,最长边最高 1280 px</td><td>需浏览器支持 H.264 编码</td></tr><tr><td>WebM 动画</td><td>VP9 折叠动画</td><td>30 fps,最长边最高 1280 px</td><td>需浏览器支持 VP9 编码</td></tr><tr><td>GIF 循环</td><td>循环折叠动画</td><td>12 fps,最长边最高 640 px</td><td>128 色调色板</td></tr><tr><td>场景包 ZIP</td><td>每个屏幕槽位一张 PNG,附清单文件</td><td>槽位原始尺寸,如 2853 × 2007</td><td>适合整套截图素材</td></tr><tr><td>原始 UI PNG</td><td>未装框的上传原图</td><td>必须与槽位尺寸完全一致,如 1398 × 2034</td><td>用于核对精确尺寸</td></tr></tbody></table></div>`,
};
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
        `<ol><li>Choose <strong>Screenshots</strong> in the top bar and expand <strong>Upload your screenshot</strong>.</li><li>Upload the inner screen and, optionally, a separate outer screen. Without a separate outer image, the editor can derive the outer view from the inner image’s left side. Choose a fill mode to cover the screen when aspect ratios differ.</li><li>Choose Unfold, Closed, Landscape, Portrait, Seated or Standing. Assign screenshots that match the orientation of each scene, then adjust the folding slider.</li><li>Select <strong>Export</strong>, choose a format and size, then generate and download. Advanced opens additional framing and scene controls.</li></ol>${image('workspace', 'en')}`,
      ],
      [
        'What screenshot sizes should I prepare?',
        `<p>Prepare one screenshot per pose you plan to export. Duo Studio renders the iPhone Duo inner screen at 2853 × 2007 pixels in landscape and 2007 × 2853 pixels in portrait — a 1.42:1 aspect ratio — and the outer screen at 1398 × 2034 pixels, or 2034 × 1398 pixels for the standing pose. These dimensions are the tool’s screenshot slot presets, not verified hardware specifications or App Store requirements. PNG, JPEG and WebP images up to 4096 pixels per side are accepted; when the aspect ratio differs, Fit keeps the whole image with bars while Fill crops it to cover.</p>${sizeTable.en}${image('poses', 'en')}<p>The complete slot, pose and export tables live on the <a href="/specs/">screenshot sizes and export specs page</a>.</p>`,
      ],
      [
        'Which mode should I use?',
        `<div class="table-wrap"><table><thead><tr><th>Mode</th><th>Input</th><th>Useful for</th></tr></thead><tbody><tr><td>Screenshots</td><td>Inner and outer screen images</td><td>Launch graphics, device mockups and folding animations</td></tr><tr><td>Browser simulation</td><td>An embeddable website URL</td><td>Exploring responsive page layouts and live interactions across poses</td></tr></tbody></table></div>`,
      ],
      [
        'Can I preview any website?',
        `<p>No. The target website must allow iframe embedding. Sites using restrictive Content-Security-Policy frame-ancestors or X-Frame-Options headers may refuse to load. Duo Studio cannot bypass those restrictions. Browser mode loads content directly from the target site; it is not a screenshot upload.</p><p>Live webpage exports require permission to capture the current tab in a supported browser. Preview viewport dimensions and exported image pixels are separate settings; check the selected scene and output size before exporting.</p>`,
      ],
      [
        'What can I export?',
        `<p>Exports are generated locally in the following formats:</p>${exportTable.en}${image('export', 'en')}<p>Animations run 2–10 seconds with optional holds at each end. Video encoder support depends on your browser.</p>`,
      ],
      [
        'Do screenshots leave my device?',
        `<p>Duo Studio processes uploaded screenshots and exports locally. Projects can be saved as .duo.json files and are autosaved in the browser. A saved project can contain your original images, so share project files only when you intend to share those assets. Browser mode makes requests to the website you open, which has its own privacy practices.</p>`,
      ],
      [
        'Is this an iPhone Duo emulator or an Apple tool?',
        `<p>Duo Studio provides iPhone Duo-style visual mockups using device assets attributed in the project. It does not run iOS or your native app and is not an Apple product. Mockups do not prove real-device compatibility, app adaptation, or App Store acceptance. Use actual device testing and current submission requirements for those decisions.</p>`,
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
      '用 Duo Studio 上传内外屏截图、切换折叠场景、预览支持嵌入的网站,并在本地导出 PNG、MP4、WebM 或 GIF。',
    heading: '用 Duo Studio 制作折叠屏效果图',
    intro:
      'Duo Studio 是一个开源、完全在浏览器中运行的折叠屏效果图与动画制作工具。上传 App 的内外屏截图,选择设备姿态,即可为产品发布生成视觉素材。网页模拟模式可预览允许 iframe 嵌入的网站。截图处理与导出在本地完成,应用可以部署在静态托管服务上。',
    open: '打开编辑器',
    other: 'English',
    otherPath: '/guide/',
    sections: [
      [
        '如何用截图制作效果图?',
        `<ol><li>在顶部选择截图制作模式,展开上传截图入口。</li><li>上传内屏截图,也可以单独上传外屏截图。没有单独外屏图时,可从内屏左半部分生成外屏视图。图片比例不一致时,可调整填充模式铺满屏幕。</li><li>选择自由开合、闭合、展开横屏、展开竖屏、坐姿或站立,为不同场景配置方向相符的截图,再调整折叠进度。</li><li>点击导出,选择格式和尺寸后生成下载。高级模式可调整更多取景与场景设置。</li></ol>${image('workspace', 'zh')}`,
      ],
      [
        '需要准备什么尺寸的截图?',
        `<p>为每个要导出的姿态准备一张截图。Duo Studio 将 iPhone Duo 内屏按横屏 2853 × 2007 像素、竖屏 2007 × 2853 像素(约 1.42:1)渲染,外屏为 1398 × 2034 像素,站立姿态为 2034 × 1398 像素。这些尺寸是本工具截图槽位的预设值，不代表经过验证的硬件参数或 App Store 提交要求。工具接受每边最长 4096 像素的 PNG、JPEG 和 WebP 图片;比例不一致时,「适应」保留完整图像并留边,「填充」裁剪铺满。</p>${sizeTable.zh}${image('poses', 'zh')}<p>完整的槽位、姿态与导出规格表见<a href="/zh/specs/">截图尺寸与导出规格专页</a>。</p>`,
      ],
      [
        '截图制作和网页模拟有什么区别?',
        `<div class="table-wrap"><table><thead><tr><th>模式</th><th>输入</th><th>适用场景</th></tr></thead><tbody><tr><td>截图制作</td><td>内外屏图片</td><td>产品发布图、设备效果图、折叠动画</td></tr><tr><td>网页模拟</td><td>允许嵌入的网站地址</td><td>检查不同姿态下的响应式布局与网页交互</td></tr></tbody></table></div>`,
      ],
      [
        '任何网站都能打开吗?',
        `<p>不能。目标网站必须允许 iframe 嵌入。通过 Content-Security-Policy 的 frame-ancestors 或 X-Frame-Options 限制嵌入的网站可能无法打开,本工具不会绕过这些限制。网页模拟会直接请求目标网站,而不是上传网页截图。</p><p>导出实时网页需要在支持的浏览器中授权捕获当前标签页。网页布局视口和导出图片的像素尺寸是不同的设置,导出前应检查当前场景和输出尺寸。</p>`,
      ],
      [
        '支持导出哪些格式?',
        `<p>所有导出均在本地生成:</p>${exportTable.zh}${image('export', 'zh')}<p>动画时长 2–10 秒,两端可加停留。视频编码能力取决于浏览器。</p>`,
      ],
      [
        '截图会上传到服务器吗?',
        `<p>Duo Studio 在本地处理截图并生成导出文件。项目可以保存为 .duo.json 文件,也会在浏览器中自动保存。项目文件可能包含原始截图,分享时需要一并考虑这些素材。网页模式会访问你打开的网站,该网站有独立的隐私实践。</p>`,
      ],
      [
        '这是 iPhone Duo 真机模拟器或 Apple 官方工具吗?',
        `<p>Duo Studio 使用项目中注明来源的设备素材,生成 iPhone Duo 风格的视觉效果图。它不运行 iOS 或你的原生 App,也不是 Apple 官方产品。效果图不能证明真机兼容性、适配完成或符合 App Store 审核要求;这些仍需通过真实测试与当前提交规范确认。</p>`,
      ],
      [
        '项目由谁维护?',
        `<p>代码、许可证、素材来源与问题反馈入口均在 <a href="${repo}">iPhoneDuoMock 源码仓库</a>公开。示例使用 EchoPod 截图,你可以替换为自己的 App。<a href="${repo}/issues">反馈问题或提出功能建议</a>。</p>`,
      ],
    ],
  },
};
const specs = {
  en: {
    path: '/specs/',
    title: 'iPhone Duo Screenshot Sizes & Export Specs | Duo Studio',
    description:
      'Exact pixel dimensions for iPhone Duo inner and outer screens, all six poses, export formats, resolutions, frame rates and input limits — measured from Duo Studio.',
    heading: 'iPhone Duo screenshot sizes and export specifications',
    intro:
      'Duo Studio renders the iPhone Duo inner screen at 2853 × 2007 pixels in landscape — a 1.42:1 aspect ratio — and 2007 × 2853 pixels in portrait, and the outer screen at 1398 × 2034 pixels, or 2034 × 1398 pixels for the standing pose. These are the exact dimensions used by the tool’s screenshot slots and scene-native exports. Every specification on this page — slot dimensions, pose list, export formats, resolutions, frame rates and input limits — was measured from the shipped application rather than copied from third-party summaries.',
    open: 'Open the editor',
    other: '简体中文',
    otherPath: '/zh/specs/',
    sections: [
      [
        'What screenshot sizes should I prepare?',
        `${sizeTable.en}<p>Without a separate outer-screen image, Duo Studio derives the outer view from the left half of an inner screenshot. Each screen offers Fit and Fill modes with adjustable position and 1–2× zoom, so images that do not match the aspect ratio can still be framed.</p>`,
      ],
      [
        'Which poses does Duo Studio render?',
        `<div class="table-wrap"><table><thead><tr><th>Pose</th><th>Screen displayed</th><th>Fold state</th></tr></thead><tbody><tr><td>Unfold</td><td>Inner, landscape</td><td>Partially open</td></tr><tr><td>Closed</td><td>Outer, portrait</td><td>Fully closed</td></tr><tr><td>Landscape</td><td>Inner, landscape</td><td>Fully open</td></tr><tr><td>Portrait</td><td>Inner, portrait</td><td>Fully open</td></tr><tr><td>Seated</td><td>Inner, portrait</td><td>About half open</td></tr><tr><td>Standing</td><td>Outer, landscape</td><td>Slightly open</td></tr></tbody></table></div>${image('poses', 'en')}`,
      ],
      ['What export formats and sizes are available?', exportTable.en],
      [
        'What inputs and limits apply?',
        `<ul><li>Screenshots: PNG, JPEG or WebP, up to 4096 pixels per side.</li><li>Browser simulation: any embeddable website URL, rendered at 1×, 2× or 3× pixel ratio.</li><li>Animations: 2–10 seconds with optional 0–2 second holds at each end, smooth or linear easing.</li><li>Projects: autosaved in the browser, portable as .duo.json files.</li><li>Everything is processed locally; screenshots are never uploaded.</li></ul>`,
      ],
      [
        'Where do these numbers come from?',
        `<p>The device model ships in the <a href="${repo}">open-source iPhoneDuoMock repository</a> and is built from Apple’s official iPhone Duo webpage assets, with attribution in the repository. Duo Studio is an independent project and is not affiliated with Apple. Mockups do not prove real-device compatibility or App Store acceptance — check current App Store Connect requirements before submitting.</p>`,
      ],
    ],
  },
  zh: {
    path: '/zh/specs/',
    title: 'iPhone Duo 截图尺寸与导出规格 | Duo Studio',
    description:
      'iPhone Duo 内外屏精确像素尺寸、六种设备姿态、导出格式、分辨率、帧率与输入限制 —— 全部从 Duo Studio 实测得出。',
    heading: 'iPhone Duo 截图尺寸与导出规格',
    intro:
      'Duo Studio 将 iPhone Duo 内屏按横屏 2853 × 2007 像素(约 1.42:1)、竖屏 2007 × 2853 像素渲染,外屏为 1398 × 2034 像素,站立姿态为 2034 × 1398 像素。这些是该工具截图槽位与场景原始导出所使用的精确尺寸。本页所有规格 —— 槽位尺寸、姿态清单、导出格式、分辨率、帧率与输入限制 —— 均从实际发布的应用中测得,而非转抄第三方汇总。',
    open: '打开编辑器',
    other: 'English',
    otherPath: '/specs/',
    sections: [
      [
        '需要准备什么尺寸的截图?',
        `${sizeTable.zh}<p>没有单独的外屏图时,Duo Studio 会从内屏截图的左半部分生成外屏视图。每个屏幕都提供「适应」与「填充」两种模式,位置与 1–2 倍缩放可调,比例不完全一致的图片也能取景。</p>`,
      ],
      [
        'Duo Studio 支持哪些姿态?',
        `<div class="table-wrap"><table><thead><tr><th>姿态</th><th>显示屏幕</th><th>折叠状态</th></tr></thead><tbody><tr><td>自由开合</td><td>内屏 · 横屏</td><td>部分展开</td></tr><tr><td>闭合</td><td>外屏 · 竖屏</td><td>完全闭合</td></tr><tr><td>展开横屏</td><td>内屏 · 横屏</td><td>完全展开</td></tr><tr><td>展开竖屏</td><td>内屏 · 竖屏</td><td>完全展开</td></tr><tr><td>坐姿</td><td>内屏 · 竖屏</td><td>约半开</td></tr><tr><td>站立</td><td>外屏 · 横屏</td><td>微开支撑</td></tr></tbody></table></div>${image('poses', 'zh')}`,
      ],
      ['支持哪些导出格式和尺寸?', exportTable.zh],
      [
        '输入有什么要求和限制?',
        `<ul><li>截图:PNG、JPEG 或 WebP,每边最长 4096 像素。</li><li>网页模拟:任意允许嵌入的网站地址,按 1× / 2× / 3× 像素比渲染。</li><li>动画:2–10 秒,两端可各加 0–2 秒停留,平滑或线性缓动。</li><li>项目:浏览器自动保存,可导出为 .duo.json 文件随身携带。</li><li>全程本地处理,截图不会上传。</li></ul>`,
      ],
      [
        '这些数字从哪里来?',
        `<p>设备模型随 <a href="${repo}">开源 iPhoneDuoMock 仓库</a>发布,基于 Apple 官网 iPhone Duo 页面素材构建,来源在仓库中注明。Duo Studio 是独立项目,与 Apple 无关联。效果图不能证明真机兼容性或 App Store 通过率,提交前请以 App Store Connect 当前要求为准。</p>`,
      ],
    ],
  },
};
const { facts: extraFacts, specs: extraSpecs } = translatedArticles(repo, image);
Object.assign(facts, extraFacts);
Object.assign(specs, extraSpecs);
const languages = Object.keys(locales);
const editorAlt = Object.fromEntries(languages.map((lang) => [lang, locales[lang].path]));
const guideAlt = Object.fromEntries(languages.map((lang) => [lang, facts[lang].path]));
const specsAlt = Object.fromEntries(languages.map((lang) => [lang, specs[lang].path]));
function alternateLinks(alt) {
  return (
    languages
      .map(
        (lang) =>
          `<link rel="alternate" hreflang="${locales[lang].htmlLang}" href="${origin}${alt[lang]}">`,
      )
      .join('') + `<link rel="alternate" hreflang="x-default" href="${origin}${alt.en}">`
  );
}
function head(title, description, path, lang, schema, alt) {
  return `<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${origin}${path}"><link rel="icon" href="/favicon.svg"><meta name="theme-color" content="#f6f7f9"><meta property="og:type" content="website"><meta property="og:site_name" content="Duo Studio"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:url" content="${origin}${path}"><meta property="og:locale" content="${locales[lang].ogLocale}">${languages
    .filter((code) => code !== lang)
    .map((code) => `<meta property="og:locale:alternate" content="${locales[code].ogLocale}">`)
    .join(
      '',
    )}<meta property="og:image" content="${origin}/social/duo-studio.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${e(title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(description)}"><meta name="twitter:image" content="${origin}/social/duo-studio.png"><meta name="twitter:image:alt" content="${e(title)}">${alternateLinks(alt)}<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
}
const sourceLabels = {
  en: 'Source & attribution',
  zh: '源码与素材来源',
  ja: 'ソースコードと素材の出典',
  fr: 'Code source et attribution',
};
const specLabels = {
  en: 'Screenshot sizes & export specs',
  zh: '截图尺寸与导出规格',
  ja: '画面サイズと書き出し仕様',
  fr: 'Dimensions et formats d’export',
};
const noScript = {
  en: 'Enable JavaScript to use the interactive editor. The guides work without JavaScript.',
  zh: '请启用 JavaScript 使用编辑器。指南无需 JavaScript 即可阅读。',
  ja: 'エディターには JavaScript が必要です。ガイドは JavaScript なしで読めます。',
  fr: 'Activez JavaScript pour utiliser l’éditeur. Les guides restent accessibles sans JavaScript.',
};
const disclaimer = {
  en: 'Duo Studio is not an Apple product and does not run iOS.',
  zh: 'Duo Studio 不是 Apple 官方产品，也不运行 iOS。',
  ja: 'Duo Studio は Apple の製品ではなく、iOS を実行しません。',
  fr: 'Duo Studio n’est pas un produit Apple et n’exécute pas iOS.',
};
const nav = (alt, current) =>
  languages
    .map(
      (lang) =>
        `<a href="${alt[lang]}" lang="${locales[lang].htmlLang}" hreflang="${locales[lang].htmlLang}"${current === lang ? ' aria-current="page"' : ''}>${locales[lang].label}</a>`,
    )
    .join('');
const footer = (lang) =>
  `<footer><p>${dateHtml[lang]} · <a href="${repo}">${sourceLabels[lang]}</a></p></footer>`;
const generated = [];
for (const lang of languages) {
  const meta = locales[lang];
  const app = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': origin + '/#app',
    name: 'Duo Studio',
    alternateName: 'iPhoneDuoMock',
    url: origin + meta.path,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Web browser',
    isAccessibleForFree: true,
    description: meta.description,
    inLanguage: meta.htmlLang,
    license: repo + '/blob/main/LICENSE',
    sameAs: [repo],
    datePublished: published,
    dateModified: updated,
  };
  const file = lang === 'en' ? 'index.html' : `${lang}/index.html`;
  if (lang !== 'en') mkdirSync(lang, { recursive: true });
  writeFileSync(
    file,
    `<!doctype html><html lang="${meta.htmlLang}"><head>${head(meta.title, meta.description, meta.path, lang, app, editorAlt)}</head><body><div id="root"><main style="max-width:760px;margin:64px auto;padding:24px;font:18px/1.6 system-ui"><h1>${facts[lang].heading}</h1><p>${facts[lang].intro}</p><p>${disclaimer[lang]}</p><p><a href="${facts[lang].path}">${meta.guide}</a> · <a href="${specs[lang].path}">${specLabels[lang]}</a></p><nav>${nav(editorAlt, lang)}</nav><noscript><p>${noScript[lang]}</p></noscript></main></div><script type="module" src="/src/main.tsx"></script></body></html>`,
  );
  generated.push(file);
}
function writeArticle(set, lang, alternates, isGuide) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': origin + set.path,
    name: set.title,
    description: set.description,
    url: origin + set.path,
    inLanguage: locales[lang].htmlLang,
    datePublished: published,
    dateModified: updated,
    about: { '@id': origin + '/#app' },
  };
  const dir = 'public' + set.path;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    dir + 'index.html',
    `<!doctype html><html lang="${locales[lang].htmlLang}"><head>${head(set.title, set.description, set.path, lang, schema, alternates)}<link rel="stylesheet" href="/guide.css"></head><body><header><a href="${locales[lang].path}">Duo Studio</a><nav>${nav(alternates, lang)}<a href="${locales[lang].path}" class="action">${set.open}</a></nav></header><main><h1>${set.heading}</h1><p class="lead">${set.intro}</p>${isGuide ? image('fold', lang, false) : ''}${set.sections.map(([h, b], i) => `<section id="section-${i + 1}"><h2>${h}</h2>${b}</section>`).join('')}<p><a href="${isGuide ? specs[lang].path : facts[lang].path}">${isGuide ? specLabels[lang] : locales[lang].guide}</a></p><p><a class="action" href="${locales[lang].path}">${set.open}</a></p></main>${footer(lang)}</body></html>`,
  );
  generated.push(dir + 'index.html');
}
for (const lang of languages) {
  writeArticle(facts[lang], lang, guideAlt, true);
  writeArticle(specs[lang], lang, specsAlt, false);
}
const paths = [...Object.values(editorAlt), ...Object.values(guideAlt), ...Object.values(specsAlt)];
writeFileSync(
  'public/sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `<url><loc>${origin}${path}</loc><lastmod>${updated}</lastmod></url>`).join('')}</urlset>\n`,
);
writeFileSync('public/robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
writeFileSync(
  'public/llms.txt',
  `# Duo Studio\n> Open-source browser tool for foldable phone mockups and animations. Uploaded screenshots are processed locally. Browser mode connects directly to the requested website and requires permission for tab capture when exporting.\n\n## Pages\n${languages.map((lang) => `- [${locales[lang].label}: ${locales[lang].guide}](${origin}${facts[lang].path}): ${facts[lang].description}\n- [${specLabels[lang]}](${origin}${specs[lang].path}): ${specs[lang].description}`).join('\n')}\n\n## Facts\n- Screenshot slot presets: inner 2853 × 2007 or 2007 × 2853; outer 1398 × 2034 or 2034 × 1398 pixels. These are tool presets, not hardware certification.\n- PNG stills, MP4/WebM at 30 fps, GIF at 12 fps and ZIP scene bundles. Video encoding depends on browser support.\n- Independent project; does not run iOS and is not affiliated with Apple.\n- [Source and attribution](${repo})\n`,
);
writeFileSync(`public/${indexNowKey}.txt`, indexNowKey);
writeFileSync(
  'public/404.html',
  '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found | Duo Studio</title><link rel="stylesheet" href="/guide.css"></head><body><main><h1>Page not found</h1><p><a href="/">Open Duo Studio</a></p></main></body></html>',
);
// CSP hashes cover every generated static JSON-LD block.
const { createHash } = await import('node:crypto');
const hashes = [
  ...new Set(
    generated.map((file) => {
      const json = readFileSync(file, 'utf8').match(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
      )[1];
      return `'sha256-${createHash('sha256').update(json).digest('base64')}'`;
    }),
  ),
];
let headers = readFileSync('public/_headers', 'utf8').replace(/ 'sha256-[^']+'/g, '');
headers = headers.replace("script-src 'self';", `script-src 'self' ${hashes.join(' ')};`);
writeFileSync('public/_headers', headers);
