# iPhoneDuoMock（Duo Studio）

**[English](README.md)** · **[简体中文](README.zh-CN.md)**

**在线体验：<https://iduo.clothpath.com/>**

完全运行于浏览器的折叠屏 App 素材工作台。中文界面，Apple 官网骨骼 3D 设备模型，用户图片不上传。Cloudflare Pages 只托管静态文件。

![Duo Studio 工作台](docs/screenshots/readme/workbench.png)

| 自由开合 | 实时网页模拟 | 深色模式与自定义背景 |
| :---: | :---: | :---: |
| ![半展开形态](docs/screenshots/readme/fold.png) | ![网页模拟](docs/screenshots/readme/browser-sim.png) | ![深色模式与自定义背景图](docs/screenshots/readme/dark-mode.png) |

## 本地运行

Node 22+。

```sh
npm ci
npm run dev
```

默认 http://127.0.0.1:5173/ 。

```sh
npm run build
npm run preview
npm test
npx playwright install chromium
npm run test:e2e
npm run test:production
npm run format:check
```

## 使用

1. 添加页面，在右侧分别上传外屏/内屏横向/内屏竖向/坐姿/站立截图。
2. 选择场景，拖动画布或使用滑杆；完整显示保留比例，裁切填充支持位置与缩放。
3. 切换展示图或开合动画，调整背景、机身、时长及输出尺寸。
4. 导出 PNG、MP4、WebM、GIF、真实上传场景 ZIP，或严格尺寸的纯界面 PNG。
5. 保存 `.duo.json` 项目可携带全部素材。浏览器会自动保存到 IndexedDB，清除站点数据会移除本地自动保存。

缺图时默认使用 Apple 官网 iPhone Duo 商品图册中的官方壁纸（合成自 https://www.apple.com/sg/iphone-duo 的视差图层），界面及导出文件名带示例标识。关闭示例后，缺图会阻断正式导出。批量 ZIP 包含真实上传场景及由内屏左半边生成的外屏，不包含示例。

演示图仅用于展示工具能力，用户上传后优先展示自己的图片。切换静态场景后调整折叠进度会保留该姿态。旧版上架套图项目导入后自动切换为展示图，并保留素材及历史设置。

## Cloudflare Pages

本项目不需要服务器、Functions、API key 或环境变量。

| 设置 | 值 |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 仓库根目录 |
| Node | 22（`.node-version`） |

可以通过 Git 集成部署，也可在本地构建后将 `dist` 上传到 Pages。不要上传源码目录或 `node_modules` 作为站点。`public/_headers` 和 `_redirects` 自动进入产物，配置 CSP、静态缓存与 SPA 回退。本次只准备部署结构，不自动创建 Cloudflare 项目。

官方部署参考：https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/

## 能力与限制

- 单张 PNG/JPEG/WebP 最大 20 MiB，边长不超过 4096 px，最多 1600 万像素；一个项目最多 20 页、内嵌图片编码总量最多 75 MiB，导入项目最大 80 MiB。
- 视频 WebCodecs + Mediabunny 逐帧编码，30 fps、最长边 1280 px；GIF 12 fps、最长边 640 px。MP4/AVC 和 WebM/VP9 根据浏览器实际能力检测，不支持时明确提示其他格式。
- PNG 使用选定原始输出尺寸；上架四种尺寸来自 2026-09-10 查阅的 Apple 规范。像素大小不等于运行时逻辑点尺寸。
- 设备网格与骨骼动画来自 Apple 官网，材质与屏幕效果由本站渲染；截图展示不等于已完成真实 App 适配。3D 宣传动画不是 App Store App Preview。
- 本次不含录屏输入、音轨、UI 自动重排、账号、云分享和多语言批量矩阵；详见 PRD P2/P3。
- 所有依赖本地打包，不使用外部图片、字体或转码服务。应用加载完成后，本地编辑可断网继续；未实现离线安装/刷新缓存。

## 文档

- [完整 PRD](docs/PRD.md)：优先级、交互规则、边界、验收。
- [实现计划](docs/IMPLEMENTATION_PLAN.md)：阶段、模块、技术方案、部署。
- [验证记录](docs/VALIDATION.md)：实际测试结果与限制。

## 素材与代码

演示旅行界面为原创。设备几何、外观贴图与动画来自 Apple 官网，资源来源、转换步骤及复现范围见 [资源记录](docs/APPLE_VIEWER.md)。这些资源的权利归原权利人所有，公开下载不等于取得再分发许可。运行时全部从本站加载，不请求 Apple 服务。第三方库许可见其包内 LICENSE。

## 网页模拟

顶部切换“网页模拟”，输入网站或使用本地演示页。网页按内外屏 CSS 视口排版，支持点击、滚动、设备姿态、镜头及开合演示。“操作网页 / 旋转设备”决定画布拖动行为；截图素材及配置在模式切换后保留。

只支持允许 iframe 嵌入的网站。静态弯折内屏使用独立分片文档，跨域交互状态不能同步；这里不模拟 Safari 或原生折叠 API。网站需要联网，网页内容不能直接导出；制作图片或视频时切回截图模式上传素材。完整需求、行为与实现边界见 [BROWSER_MODE.md](docs/BROWSER_MODE.md)。

## 致谢

- [iphone-duo](https://github.com/chuspeeism/iphone-duo) — 折叠屏设备 Mockup 方向的启发。
- [DuoLikeAnimation](https://github.com/elijah-semyonov/DuoLikeAnimation) — 开合动画实现的启发。
- Codex Astra — 本项目在 Codex Astra 编码智能体的协助下完成。

## 许可

以 [MIT License](LICENSE) 发布。设备几何、贴图与动画来自 Apple 官网，权利归原权利人所有；来源与复现范围见 [资源记录](docs/APPLE_VIEWER.md)。
