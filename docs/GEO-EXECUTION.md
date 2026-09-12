# GEO 执行文档 — 需要你操作的部分

配套 [GEO-ANALYSIS.md](../GEO-ANALYSIS.md)。站内改动已全部完成并验证;本文档按优先级列出剩余的手动步骤,每步给出具体操作和可粘贴内容。

---

## 第 0 步:部署本次改动(先做这个)

```bash
cd /Users/lizhuo/owork/duo-emulator
git add -A
git commit -m "Add specs data pages, dates, guide assets, llms.txt and IndexNow key"
git push origin main
```

Cloudflare Pages 会自动构建部署。部署完成后跑一遍验证(5 页 200、404 正确、key 文件可访问):

```bash
for p in / /guide/ /zh/guide/ /specs/ /zh/specs/ /llms.txt /680382cc15ef6d4d80c7ee1b39691099.txt /sitemap.xml; do
  printf "%s -> " "$p"; curl -sS -o /dev/null -w "%{http_code}\n" "https://iduo.clothpath.com$p"
done
curl -sS -o /dev/null -w "404 check: %{http_code}\n" https://iduo.clothpath.com/no-such-page
# 期望:全部 200,最后一行 404
```

---

## 第 1 步:Google Search Console(最高优先级,阻塞一切索引)

1. 打开 [search.google.com/search-console](https://search.google.com/search-console),用你的 Google 账号登录。
2. **添加资源 → 选「网址前缀」→ 输入 `https://iduo.clothpath.com/`**。
3. 验证方式二选一:
   - **HTML 标记(推荐,最简单)**:GSC 会给你一个 `<meta name="google-site-verification" content="XXXX">`。把它加到 `scripts/generate-seo.mjs` 的 `head()` 函数里(`canonical` 那行后面),重新 `npm run build` 并 push,回 GSC 点「验证」。
   - **DNS TXT**:适合验证整个 `clothpath.com` 域。Cloudflare Dashboard → DNS → 添加记录:类型 `TXT`、名称 `@`、内容 `google-site-verification=XXXX` → 保存后回 GSC 验证。
4. 验证成功后:左侧「索引 → 站点地图」→ 输入 `sitemap.xml` → 提交(应显示"已发现 5 个网址")。
5. 顶部「网址检查」栏,逐个粘贴下面 5 个地址,每次点「请求编入索引」:
   - `https://iduo.clothpath.com/`
   - `https://iduo.clothpath.com/guide/`
   - `https://iduo.clothpath.com/zh/guide/`
   - `https://iduo.clothpath.com/specs/`
   - `https://iduo.clothpath.com/zh/specs/`
6. 2–3 天后回「索引 → 网页」确认"已编入索引"数量为 5。

> 效果链:进入 Google 索引 = 获得 AI Overviews / AI Mode 的引用资格(Google 官方:AI 功能与经典搜索共用同一索引,没有独立"AI 索引")。

## 第 2 步:Bing Webmaster Tools + IndexNow

1. 打开 [bing.com/webmasters](https://www.bing.com/webmasters),选「从 Google Search Console 导入」(第 1 步完成后一键导入,无需重新验证)。
2. IndexNow:key 文件已随本次改动部署。部署完成后执行一次提交:

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{
    "host": "iduo.clothpath.com",
    "key": "680382cc15ef6d4d80c7ee1b39691099",
    "urlList": [
      "https://iduo.clothpath.com/",
      "https://iduo.clothpath.com/guide/",
      "https://iduo.clothpath.com/zh/guide/",
      "https://iduo.clothpath.com/specs/",
      "https://iduo.clothpath.com/zh/specs/"
    ]
  }'
# 返回 200 即成功;202 表示 key 校验进行中,几分钟后自动生效
```

3. **以后每次内容更新**:改 `scripts/generate-seo.mjs` 顶部的 `updated` 日期 → build → push → 重跑上面的 curl。

## 第 3 步:GitHub 仓库增强(5 分钟)

1. **topics**:仓库页面右侧齿轮(About)→ Topics 添加:`iphone-duo` `foldable` `screenshot` `mockup`(已有 duo/iphone/mock 的补差集)。或用命令:
   ```bash
   gh api --method PUT repos/huanglizhuo/iPhoneDuoMock/topics \
     -f 'names[]=duo' -f 'names[]=iphone' -f 'names[]=mock' \
     -f 'names[]=iphone-duo' -f 'names[]=foldable' -f 'names[]=screenshot'
   ```
2. **Website 字段**:同一齿轮面板,Website 填 `https://iduo.clothpath.com/`(若已填则跳过)。
3. **README 增补**:在现有 live demo 链接附近加入(可直接粘贴):
   ```markdown
   ## Documentation
   - [User guide](https://iduo.clothpath.com/guide/) — screenshots, browser simulation, exports (中文指南)
   - [Screenshot sizes & export specs](https://iduo.clothpath.com/specs/) — exact pixel dimensions for every pose and format
   ```

## 第 4 步:Reddit(10 月 iPhone Duo 上市前完成)

**原则**:一帖一版、真实经验口吻、先贴内容后带链接、遵守各版自我推广规则(发帖前读版规)。素材用 `public/guide/hero-fold.gif`(可先传 [imgur.com](https://imgur.com) 或转成视频直接发 Reddit 播放器,Reddit 原生视频曝光更好)。

**帖 1 · r/iOSProgramming**(App Store 截图适配角度):
> **标题**:I open-sourced a free tool to preview iPhone Duo screenshots before spending $1,999 on the device
>
> **正文**:App Store Connect now takes iPhone Duo screenshot sizes, and none of us have hardware yet. So I built a browser tool that renders your inner/outer screenshots onto a 3D foldable — six poses (closed, landscape, portrait, tent/seated, standing), and you can export PNG stills or MP4 folding animations. Exact dimensions it renders: inner 2853×2007 landscape (1.42:1), outer 1398×2034. Everything runs locally, nothing uploads. Would love feedback from anyone preparing Duo-era App Store assets. [附 GIF/视频]

**帖 2 · r/webdev**(响应式测试角度):
> **标题**:Free browser tool that folds — test responsive layouts across foldable poses
>
> **正文**:I made an open-source tool that loads any iframe-embeddable site onto a foldable phone and lets you sweep through closed → half-open → landscape. Useful for checking how your layout behaves at intermediate fold states. Sites that block iframes won't load (X-Frame-Options etc.). [附 GIF]

**帖 3 · r/SideProject**(构建故事角度):
> **标题**:I spent a week building an iPhone Duo mockup studio in the browser — no backend, everything local
>
> **正文**:Three.js device model + screenshot projection + local export pipeline (PNG/WebM/GIF via WebCodecs). No server, no uploads — works on static hosting. Writing about the interesting parts (perspective-correct screen projection, exporting the fold animation) if there's interest.

## 第 5 步:YouTube(最强单一 AI 引用信号,相关性 ~0.737)

录一段 1–2 分钟演示(QuickTime/OBS 录屏即可),脚本:

| 时间 | 画面 | 讲述 |
|---|---|---|
| 0:00 | 折叠动画 GIF 循环 | "The iPhone Duo ships in October. Here's how to mock up your app on it today — for free." |
| 0:10 | 打开 iduo.clothpath.com | "Duo Studio, open-source, runs entirely in your browser." |
| 0:20 | 上传内外屏截图 | "Drop in your inner and outer screenshots — it tells you the exact sizes it wants." |
| 0:40 | 切换六种姿态 | "Six poses: closed, landscape, portrait, tent, standing — drag to rotate, slide to fold." |
| 1:05 | 导出 PNG/MP4/GIF | "Export stills up to 2853×2007, or a 30fps folding animation. Everything generated locally." |
| 1:25 | 规格页 /specs/ | "Full spec sheet and the guide are linked below. It's open source — link in the description." |

**标题候选**:`Make an iPhone Duo mockup from your screenshots — free & open source`
**描述模板**:
```
Duo Studio renders your app screenshots on an iPhone Duo-style foldable — six poses, folding animations, local export. Free and open source:
▶ Try it: https://iduo.clothpath.com/
▶ User guide: https://iduo.clothpath.com/guide/
▶ Screenshot sizes & export specs: https://iduo.clothpath.com/specs/
Inner screen: 2853×2007 px landscape (1.42:1) · Outer: 1398×2034 px
```

## 第 6 步:Product Hunt / Hacker News(10 月上市周借势)

- **Product Hunt**:tagline `Mock up your app on the iPhone Duo — before it ships`。描述用 guide 首段,首图用 `social/duo-studio.png`,画廊加 hero-fold.gif 和 poses.png。挑 10 月发布当周周二/周三太平洋时间 0:01 上线。
- **Hacker News**:`Show HN: Duo Studio – Open-source iPhone Duo mockup maker`(Show HN 规则:标题只留产品名,正文首评论讲构建细节)。

## 第 7 步:通知生态作者(争取已有提及的更新)

blakecrosley.com 已在 [iPhone Duo 生态 roundup](https://blakecrosley.com/blog/iphone-duo-day-two) 点名过本项目。找其博客联系邮箱发一封短信:

> Subject: Duo Studio update — browser mode, guides and spec page
>
> Hi Blake — thanks for including iPhoneDuoMock in your iPhone Duo assets roundup. Since then it's grown a browser-simulation mode (preview any iframe-embeddable site across fold poses), six-pose exports (PNG/MP4/WebM/GIF), and a dedicated screenshot-sizes spec page (inner 2853×2007, outer 1398×2034): https://iduo.clothpath.com/specs/. Happy to share anything useful for a future roundup.

## 第 8 步:月度 AI 引用核查(每月一次,30 分钟)

在 ChatGPT、Perplexity、Google(AI Overviews)分别问这组固定查询,记录是否引用 iduo.clothpath.com:

1. free iPhone Duo mockup tool
2. how to make App Store screenshots for iPhone Duo
3. iPhone Duo screenshot size / dimensions
4. iPhone Duo inner screen aspect ratio
5. foldable phone mockup generator online
6. tool to preview website on foldable phone
7. iPhone Duo mockup open source github
8. how to test responsive layout on iPhone Duo

规则:不做单次回答归因;连续 2–3 个月的趋势才算信号。同时看 GSC「效果」里查询曝光变化。

## 维护备忘(内容更新流程)

1. 改 `scripts/generate-seo.mjs` 顶部的 `updated`(日期)→ 若功能变化,同步更新 sections 里的描述与 `src/lib/project.ts` 的 `SPECS`(两处尺寸必须一致,test:seo 不校验这一点,靠人工)。
2. 若 UI 大改,重跑 `npm run capture:guide` 刷新指南截图(需要本地 `npm run dev` 环境与 ffmpeg/ImageMagick)。
3. `npm run build && npm run test:seo` → push → 重跑第 2 步的 IndexNow curl。
4. 每季度复核 GEO-ANALYSIS.md 评分与爬虫放行状态(`curl -A "GPTBot/1.0" https://iduo.clothpath.com/`)。
