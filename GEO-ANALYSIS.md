# GEO 分析报告 — Duo Studio (iduo.clothpath.com)

审计日期:2026-09-12 · 依据:`seo-geo` skill(2026-05 版标准)· 方法:本地代码审查 + 线上实测(curl 实测爬虫 UA、HTTP 头、状态码)+ 站外搜索核查

> 评分为启发式评估,不是 Google 内部信号。Google 官方明确:第三方 SEO 工具无法访问 Google 排名数据,Search Console 才是权威一方数据源。GEO(生成式引擎优化)在 Google 的定义下仍是 SEO 基础工作在 AI 搜索面的应用,不存在独立"AI 索引"。

---

## 1. GEO Readiness Score: 65/100

| 维度 | 权重 | 得分 | 加权 | 结论 |
|---|---|---|---|---|
| 段落级可引用性 Citability | 25% | 72 | 18.0 | 定义句式、问句标题、直接回答都到位;缺日期、缺独特数据块 |
| 结构可读性 Structure | 20% | 90 | 18.0 | H1→H2 问句层级、表格、有序列表、FAQ 格式,接近范本 |
| 多模态 Multi-Modal | 15% | 40 | 6.0 | 每页仅 1 张分享图;步骤无截图、无动画演示(产品卖点恰是动画) |
| 权威与品牌信号 Authority | 20% | 30 | 6.0 | 站外品牌提及几乎为零,是最大短板(品牌提及与 AI 引用相关性约为外链的 3 倍) |
| 技术可访问性 Technical | 20% | 85 | 17.0 | 静态渲染、爬虫放行、robots/sitemap/404 全部正确;唯一阻塞是尚未提交索引 |

**总体判断:站内基础(此前 `docs/SEO-GEO.md` 那轮工作)质量很高,当前瓶颈依次是:① 未索引(阻塞一切)② 站外实体信号 ③ 内容缺日期与独特数据 ④ 多模态缺失。**

## 2. 平台分解

| 平台 | 得分 | 依据 |
|---|---|---|
| Google AI Overviews / AI Mode | 62/100 | 内容质量满足 AIO 引用条件(92% 引用来自 top-10 页面),但站点尚未进索引;AI Mode 引用池更宽、重新鲜度,当前无任何日期信号 |
| ChatGPT(Search) | 55/100 | GPTBot / OAI-SearchBot 实测放行(200);但 ChatGPT 引用高度依赖 Wikipedia(47.9%)与 Reddit(11.3%),本站在两者均无存在 |
| Perplexity | 48/100 | PerplexityBot 放行;但 Perplexity 首要引用源是 Reddit(~46.7%),本站无 Reddit 帖;实体未知度极高 |

仅约 11% 的域名会被 ChatGPT 与 Google AIO 同时引用,需分别针对两个面优化(见 §11 计划)。

## 3. AI 爬虫访问状态(2026-09-12 实测)

以真实 UA 字符串请求 `https://iduo.clothpath.com/guide/`:

| 爬虫 | 实测状态 | 说明 |
|---|---|---|
| GPTBot(OpenAI 训练) | 200 放行 | ChatGPT 语料 |
| OAI-SearchBot(OpenAI 搜索) | 200 放行 | ChatGPT Search 引用源 |
| ClaudeBot(Anthropic) | 200 放行 | Claude 网络功能 |
| PerplexityBot | 200 放行 | Perplexity 引用源 |
| Googlebot / bingbot | 200 放行 | 常规索引 |
| Bytespider(字节) | 200 放行 | 训练爬虫,可选封锁 |

robots.txt 为 `User-agent: * / Allow: /` + sitemap 声明,云端(Cloudflare)未拦截任何 AI UA。**无需改动**,这是理想状态。若日后想拒绝训练类爬虫(Bytespider、CCBot)而保留搜索类,再显式分组,当前不建议动。

## 4. llms.txt 状态

缺失(`https://iduo.clothpath.com/llms.txt` → 404)。

按 Google 官方 AI 优化指南(2026-06-29 更新):Google Search 忽略 llms.txt,加不加都不影响 Google 可见性。**不作为 Google 优化项**。可作为可选项加入,服务于非 Google AI 服务(极小成本),模板:

```
# Duo Studio
> Open-source, browser-based tool for iPhone Duo-style foldable phone mockups and folding animations from app screenshots. Runs locally, no upload.

## Pages
- [Guide](https://iduo.clothpath.com/guide/): How to make foldable mockups, preview embeddable websites, export PNG/MP4/WebM/GIF
- [中文指南](https://iduo.clothpath.com/zh/guide/): 折叠屏效果图制作与网页模拟指南
- [Editor](https://iduo.clothpath.com/): Interactive editor (requires JavaScript)
```

## 5. 品牌提及分析(Ahrefs 2025-12:品牌提及与 AI 引用相关性约为外链 DR 的 3 倍)

| 平台 | 现状 | 与 AI 引用的相关性 |
|---|---|---|
| YouTube | 无 | ~0.737,最强单一信号 |
| Reddit | 无 | 高(ChatGPT 11.3% / Perplexity 46.7% 的引用源) |
| Wikipedia | 无("iPhone Duo"词条存在,工具未入选生态列表) | 高 |
| LinkedIn | 无 | 中 |
| 博客/媒体 | 1 篇:[blakecrosley.com 的 iPhone Duo 生态 roundup](https://blakecrosley.com/blog/iphone-duo-day-two) 已点名 `huanglizhuo/iPhoneDuoMock` "Duo Studio" | 高质量种子 |
| GitHub | 公开,2 stars,README 链向线上站,topics: duo/iphone/mock | 实体锚点 ✓ |

**这是整份报告最大的机会点**:站内已做到 85 分水平,站外接近 0。且 iPhone Duo 将于 2026 年 10 月上市($1,999),开发者查询("iPhone Duo mockup"、"iPhone Duo screenshot size/generator")即将迎来洪峰,窗口期就是现在到 10 月。

## 6. 段落级可引用性(现有内容逐段)

最优引用段落长度 134–167 词;约 44% 的 AI 引用来自页面顶部 30% 区域。

| 段落 | 评价 | 建议 |
|---|---|---|
| 首页 noscript 回退段(~80 词) | ✓ "Duo Studio is an open-source, browser-based tool for…" 定义句式,自足 | 保持;此段就是 AI 不执行 JS 时首页的全部内容 |
| Guide 首段 intro(~60 词) | ✓ 定义 + 能力 + 边界,自足可引用 | 保持 |
| "Can I preview any website?" | ✓ 范本级:"No. The target website must allow iframe embedding." 直接回答 + 具体机制(CSP frame-ancestors / X-Frame-Options) | 保持 |
| "Is this an iPhone Duo emulator or an Apple tool?" | ✓ 差异化 + 免责,防止 AI 错误归类 | 建议把这段的核心句同步进首页回退段(首页更常被引用) |
| "What can I export?" | ✗ 偏短(~40 词),只有罗列,无规格 | **优先扩写**:格式 × 分辨率 × 适用场景 × 浏览器要求的规格表(见 §10) |
| "Which mode should I use?" 表格 | ✓ 结构好但只有 2 行 | 可加"输入/输出/是否需授权"列 |
| 全站 | ✗ 无任何发布/更新日期 | SE Ranking 130 万引用研究:<3 个月内容被 AI 引用概率约 3 倍;6 个月不更新失去引用资格 |

## 7. 服务端渲染检查

- `/guide/`、`/zh/guide/`:纯静态 HTML,无 JS 依赖 ✓(AI 爬虫不执行 JavaScript,这是关键面)
- 首页:React SPA,但 `#root` 内置静态回退内容(h1 + 定义段 + 指南链接),noscript 有提示 ✓
- 随机路径实测返回真 404(非软 200)✓;`/browser-demo.html` 308 重定向且带 noindex 头 ✓
- 结构化数据在初始 HTML 内(CSP 哈希白名单)✓

结论:技术渲染面无问题,不需要引入 SSR 框架。

## 8. Top 5 最高影响改动

1. **解除索引阻塞(本周)**:Google Search Console 验证 + 提交 sitemap + 对 3 个 URL 逐一"请求编入索引";Bing Webmaster Tools 同步;加 IndexNow。`site:` 检索当前无结果——未进索引时,后面所有优化对 Google 系 AI 面都无效。(docs/SEO-GEO.md 已列此为 P2 待办,现在升级为 P0。)
2. **给三页加日期 + 建立刷新机制(1 周)**:在 `generate-seo.mjs` 加 `updated` 变量,写入可见页脚、`WebPage` schema 的 `dateModified`、sitemap `lastmod`。每次功能更新同步刷新。这是性价比最高的单点改动。
3. **多模态升级(1–2 周)**:指南每个步骤配工具自导出的截图;首页与指南嵌入折叠动画 GIF/短视频——**工具本身就能导出这些素材,零外部成本,而"会动的折叠屏 mockup"正是产品差异化**。多模态内容被 AI 选中的率高 156%。
4. **新增"iPhone Duo 截图尺寸与规格"数据页(2 周,赶在 10 月前)**:把工具内置的一手几何数据(内外屏比例、六姿态方向、建议上传尺寸、导出分辨率表)做成英文静态页(+中文版)。开发者 9–10 月正在搜 "iPhone Duo screenshot size/requirements";这是只有本站能提供的非商品化一手数据,是 AI 最爱引用的类型。注意:只发布工具真实支持的数据,不做关键词变体堆砌(Google 明确反对)。
5. **站外实体建设(持续,10 月前集中)**:Reddit(r/iOSProgramming、r/webdev、r/SideProject)以真实使用场景分享;YouTube 1–2 分钟演示;Product Hunt 发布;邮件告知 blakecrosley.com 生态文的新进展。原则:提供真实价值,不做 mention-farming(Google 已明确将其列为无效做法)。

## 9. Schema 建议(克制原则:Google 明确"不要为 AI 功能过度投资结构化数据")

- ✅ `WebPage` 补 `datePublished` / `dateModified`(随 §8-2 日期机制)
- ✅ `WebApplication` 可选加 `maintainer`(指向 GitHub repo 的 `@type: Organization`)
- ❌ 不加 FAQPage(富结果已限权威政务/健康站,商品站无收益且 docs/SEO-GEO.md 已正确决策)
- ❌ 不加 HowTo(Google 已废弃其富结果)
- ❌ 不虚构 aggregateRating/review/author
- 现有 WebApplication + WebPage + hreflang 组合已合规,与可见内容一致

## 10. 内容重排建议(具体到执行)

1. **导出规格表**(替换现 "What can I export?" 纯文字):`格式 | 类型 | 常用尺寸/分辨率 | 浏览器要求 | 典型用途` 五列,数据从 `src/lib/export.ts` 与导出 UI 提取。表格是 AI 提取对比数据的首选结构。
2. **屏幕规格块**(新增小节 "What screenshot sizes should I prepare?"):内外屏方向、宽高比、每姿态建议尺寸。写成 134–167 词自足段落 + 表格,放在 guide 顶部 30% 区域。
3. **首页回退段吸收免责句**:加一句 "Duo Studio creates iPhone Duo-style visual mockups; it does not run iOS and is not an Apple product."(防止 AI 检索把工具误述为模拟器/官方工具——目前这句只在 guide 第 6 节)。
4. **步骤配图**:`<ol>` 每步后插工具实拍(用 EchoPod 演示项目自导出),`width/height/alt` 齐全。
5. **动画演示**:guide 首段图下方嵌入 GIF(WebP/APNG 更小),`alt` 描述动作;同时把该 GIF 用于后续 Reddit/PH 帖。

## 11. 执行 Plan

> **实施状态(2026-09-12)**:Phase 0 本地部分、Phase 1 全部、Phase 3 数据页已完成并验证(`npm run build` + `npm run test:seo` 全绿)。需要站点所有者操作的部分(GSC/Bing/站外发布)见 `docs/GEO-EXECUTION.md`。

所有站内改动继续走 `scripts/generate-seo.mjs` 单一事实源(仓库既定维护模式),`npm run test:seo` 同步补断言。

### Phase 0 — 解除阻塞(本周,~2h)
- [x] IndexNow key 文件生成并入构建(`public/680382cc15ef6d4d80c7ee1b39691099.txt`,提交命令见执行文档)
- [ ] GSC 验证(DNS TXT 或 HTML 文件经 generate-seo.mjs 注入)→ 提交 sitemap → 3 URL 请求索引 ← **需你操作**
- [ ] Bing Webmaster Tools 验证;部署后向 IndexNow 提交 ← **需你操作**
- [ ] GitHub repo:topics 补 `iphone-duo` `mockup` `foldable` `screenshot`;README 链到 `/guide/` 与 `/specs/` ← **需你操作(步骤已备好)**
- 验收:GSC「网页索引编制」5 URL 均为"已编入索引"(通常数日内)

### Phase 1 — 内容纵深(第 1–2 周,~1.5 天)
- [x] 日期机制:`updated` 常量 → 页脚可见 `<time>` + `datePublished`/`dateModified` schema + sitemap `lastmod`;test:seo 断言
- [x] 导出规格表(格式×内容×分辨率帧率×说明,来自 `src/lib/export.ts` 实测)+ 屏幕规格块(来自 `SPECS` 实测),无编造数据
- [x] 首页回退段吸收免责句("does not run iOS and is not an Apple product")
- [x] 步骤截图 + 折叠动画 GIF:`npm run capture:guide` 自动采集(工作区/导出弹窗/六姿态拼图/20 帧折叠 GIF),guide 引用并带尺寸与 alt
- 验收:✅ 关闭 JS 全部内容可读;test:seo 全绿;5 页桌面/移动无横向溢出;4 张素材全部加载

### Phase 2 — 站外实体(第 2–4 周,10 月发布前完成,~2 天)
- [ ] YouTube:1–2 分钟演示视频(脚本/标题/描述模板已备好,见执行文档)
- [ ] Reddit:r/iOSProgramming、r/webdev、r/SideProject 三篇不同角度真实场景帖(草稿已备好)
- [ ] Product Hunt 发布(10 月 iPhone Duo 上市周借势);HN Show HN 可选
- [ ] 联系 blakecrosley.com 告知新功能与指南(邮件草稿已备好)
- 验收:至少 1 个 Reddit 帖 + 1 个 YouTube 视频 + 1 次发布活动真实上线

### Phase 3 — 数据页与持续度量(第 4 周起)
- [x] "iPhone Duo screenshot sizes & export specs" 英文静态页 `/specs/`(+中文 `/zh/specs/`),入 sitemap,首页与 guide 内链,hreflang 配对
- [x] llms.txt(仅面向非 Google AI 服务,Google 按官方声明忽略它)
- [ ] 度量:GSC 查询/曝光/点击周看;每月固定查询集人工核查 AI 引用(查询清单见执行文档)
- [ ] 刷新节奏:功能更新→改 `updated`→部署→IndexNow 重提交;季度全量复核本报告

### 明确不做(与 Google 官方立场对齐)
- ✗ llms.txt 作为 Google 排名手段(可加,但仅为非 Google AI,预期收益≈0)
- ✗ 内容切块(chunking)、AI 风格改写、长尾关键词变体堆砌
- ✗ 虚构作者/评分/FAQ 富结果标记
- ✗ 批量生产低价值页面刷新鲜度

---

## 附:本次实测证据摘要

- robots/sitemap/404/headers 于 2026-09-12 curl 实测;7 个爬虫 UA 全部 200
- `site:iduo.clothpath.com` 经通用网页搜索无结果(非 Google 官方索引检查,以 GSC 为准)
- GitHub 仓库状态经 github.com 实测:公开、MIT、2 stars、README 含 live demo 链接
- 站外提及经网页搜索:仅 blakecrosley.com 一篇点名
- 本地代码:`index.html`(静态回退)、`scripts/generate-seo.mjs`(SEO 单一事实源)、`public/{robots.txt,sitemap.xml,guide/,zh/guide/,social/}` 与线上一致
