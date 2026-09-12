# Duo Studio SEO / GEO 优化

更新日期：2026-09-12。目标站点：https://iduo.clothpath.com/ 。本次为本地实现与验证，尚未部署或提交搜索引擎。

## 目标与发现

让搜索引擎和 AI 搜索可以准确理解产品用途、操作方式和限制，同时保持编辑器简洁。此前首页初始 HTML 只有空的 React 挂载节点，缺少 canonical、社交分享卡片、结构化数据与站点地图；通配 SPA 重写还会让未知路径返回首页。

## 已完成的优先级

| 优先级 | 实现 | 用途 |
| --- | --- | --- |
| P0 | 首页标题、描述、canonical、静态产品简介与指南链接 | 提供初始 HTML 中可读取的产品身份与入口 |
| P0 | 英文 `/guide/`、中文 `/zh/guide/` 静态指南 | 无 JavaScript 也可理解产品；覆盖上传截图、场景、网页模拟、导出及数据处理 |
| P0 | robots.txt、三页 sitemap、真实 404 页面；移除全站 200 重写 | 明确公开页面，减少无效 URL 与软 404 |
| P1 | WebApplication / WebPage JSON-LD | 用与可见内容一致的事实描述产品及指南，不添加虚构评分、评论或认证 |
| P1 | 两份指南互相声明 en / zh-Hans / x-default | 表达不同语言版本之间的关系 |
| P1 | Open Graph、Twitter 卡片及 1200×630 实际产品预览图 | 改善链接分享展示；不保证平台立即刷新缓存 |
| P1 | 编辑器顶部指南图标 | 用户与爬虫都能发现说明，避免在工作区堆叠 SEO 文案 |
| P1 | CSP 精确 JSON-LD 哈希、演示页 noindex | 保留原有脚本安全策略，减少非产品内容进入索引 |

内容采用直接定义、步骤、模式对照和问题解答。明确 iframe 嵌入限制、本地处理范围，以及视觉效果图不等于真机适配验证。没有添加关键词堆砌、虚构作者、FAQ 富结果承诺或特殊 AI schema。

## 维护方式

`scripts/generate-seo.mjs` 维护产品事实、语言版本、域名、仓库地址与 `updated` 日期,生成首页、中英文指南、中英文规格页(`/specs/`、`/zh/specs/`)、sitemap(含 lastmod)、robots、404、llms.txt、IndexNow key 文件,以及 JSON-LD 对应 CSP 哈希。`npm run build` 自动先运行生成器。更换正式域名时先更新生成器的 origin,再重新构建;不要单独修改生成文件中的 canonical。

指南内嵌截图与折叠 GIF 由 `npm run capture:guide` 从运行中的应用自动采集(需本地 ffmpeg 与 ImageMagick);槽位尺寸必须与 `src/lib/project.ts` 的 `SPECS` 保持一致。更新内容时改生成器顶部的 `updated` 日期,部署后向 IndexNow 重新提交(完整流程见 [GEO-EXECUTION.md](GEO-EXECUTION.md))。

指南样式位于 `public/guide.css`,分享图位于 `public/social/duo-studio.png`。没有增加运行时依赖。首页编辑器仍通过 React 运行,详细说明由独立静态页面承载。

## 验证结果

- `npm run build`：通过 TypeScript 与 Vite 构建。现有较大 chunk 警告仍存在，未把构建警告当作真实 Core Web Vitals 测量。
- `npm run test:seo`：三页 canonical、语言、结构化数据、CSP 哈希、分享图尺寸、站点地图和 404 配置检查通过。
- 浏览器检查：关闭 JavaScript 后首页简介及两份指南可读；320、375、768、1440 宽度无页面横向溢出；注入构建后的 CSP 后编辑器和指南入口可用。
- Playwright：`studio-layout`、`advanced-mode`、`fullscreen` 共 4 项通过，覆盖两种工作模式、响应式布局、高级设置和全屏切换。
- 浏览器证据保存在本地 `artifacts/seo/`。本地 Vite preview 不执行 Cloudflare `_headers` / `_redirects`，CSP 使用响应头注入验证；真实 CDN 的状态码、重定向和响应头仍需部署后确认。

## 部署后的 P2 工作

1. 验证首页与两份指南返回 200；随机不存在路径返回 404；检查 canonical、语言链接、分享图以及 robots/sitemap 的公开响应。
2. 在 Google Search Console 和 Bing Webmaster Tools 中验证站点并提交 sitemap；使用 URL 检查确认索引与渲染结果。需要站点所有者权限，本次未操作这些账户。
3. 检查 Cloudflare 的实际机器人规则，确认 Googlebot、Bingbot 及希望允许的搜索爬虫没有被 WAF 意外拦截。robots 的默认允许策略不等于覆盖 CDN 访问规则。
4. 记录搜索查询、曝光、点击、指南进入编辑器的实际转化；用固定的真实用户问题定期人工检查 AI 搜索是否引用该站。不要把单次回答或自制评分当作排名增长证据。
5. 获取移动端 PageSpeed / CrUX 或真实用户性能数据，再决定是否拆分大型编辑器资源。当前没有声称取得某个 Lighthouse 分数或 Core Web Vitals 改善。

## 依据与边界

- [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)：AI 搜索仍依赖 SEO 基础、可读取文本与一致的结构化数据，不要求特殊 AI 文本文件。没有为了“GEO”额外生成 llms.txt，也不保证收录或引用。
- [Google：JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)：抓取和 JavaScript 渲染是不同阶段，静态指南降低说明内容对脚本执行的依赖。
- [OpenAI：Overview of OpenAI crawlers](https://developers.openai.com/api/docs/bots)：OAI-SearchBot 的搜索用途与 GPTBot 的训练用途不同；不得混用二者解释访问策略。
- [Cloudflare Pages：Serving Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/)：根目录 404.html 与静态文件路由用于本次托管配置。预览部署与正式域名的索引策略应分别检查。
