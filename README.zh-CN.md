# Duo Studio

[English](README.md) · [简体中文](README.zh-CN.md) · **[在线体验 ↗](https://iduo.clothpath.com/)**

将 App 截图或网页放进折叠屏设备，预览不同姿态，导出效果图和开合动画。全部在浏览器中运行。

[![Duo Studio — 上传、折叠、导出](docs/media/duo-studio-overview.gif)](docs/media/duo-studio-overview.mp4)

[观看 8 秒演示](docs/media/duo-studio-overview.mp4)

## 如何使用

1. **添加内容** — 上传内外屏截图，或切换「网页模拟」输入网址。
2. **选择姿态** — 合拢、展开横屏、展开竖屏、坐姿、站立或自由开合，调整折叠进度与背景。
3. **导出作品** — 保存 PNG 效果图或 MP4、WebM、GIF 动画，也可保存 `.duo.json` 项目供下次编辑。

截图在本地处理，不会上传。网页模拟仅支持允许嵌入的网站，导出时需授权捕获当前标签页。视频格式取决于浏览器支持情况。

## 本地运行

需要 Node.js 22+。

```sh
npm ci
npm run dev
```

打开 [localhost:5173](http://localhost:5173)。执行 `npm run build` 生成 `dist/`。

部署到 **Cloudflare Pages**：构建命令为 `npm run build`，输出目录为 `dist`，无需后端或 API key。

## 致谢与许可

灵感来自 [iphone-duo](https://github.com/chuspeeism/iphone-duo) 和 [DuoLikeAnimation](https://github.com/elijah-semyonov/DuoLikeAnimation)，由 Codex Astra 协助构建。

代码采用 [MIT 许可](LICENSE)。设备资源来自 Apple，权利归原权利人所有，详见[素材来源](docs/APPLE_VIEWER.md)。效果图用于展示外观，不代表已完成真实 App 适配。
