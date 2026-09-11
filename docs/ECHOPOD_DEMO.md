# EchoPod 示例来源

用户授权提供两张截图作为模拟器默认展示案例。原文件复制到 `public/demo/echopod/`，没有重绘或修改 App 内容。

| 资源 | 原始尺寸 | SHA-256 |
| --- | --- | --- |
| inner.png | 2670×1878 | 90f98d1b19b158188bc329e4903849ad47d15f29fc8922a1e363f97821aa6cbd |
| outer.png | 1398×2034 | 240d14eb9036f6cc7945b745d471861f5988bf80ccdd897d5cc3923ffad608fc |

介绍核对于 2026-09-11：[EchoPod 官网](https://echopod.clothpath.com/)。当前描述涵盖播客、YouTube 和个人音视频语言学习，逐词字幕、即时查词、翻译及 AI 语法解释。

示例采用同源静态图片，运行时不调用 EchoPod 服务。横向画布使用内屏示例，纵向使用外屏示例；其他姿态用于展示构图，不代表另有对应的真实 App 布局截图。用户上传始终优先，示例不计入上传数量或真实素材 ZIP。

## 四方向截图更新（2026-09-11）

以下静态文件与用户本轮提供的原始 PNG SHA-256 完全一致：

| 设备场景 | 示例文件 | 原图尺寸 |
| --- | --- | --- |
| 展开横屏、自由开合内屏 | `public/demo/echopod/inner.png` | 2853 × 2007 |
| 展开竖屏、坐姿 | `public/demo/echopod/inner-portrait.png` | 2007 × 2853 |
| 站立外屏 | `public/demo/echopod/outer-landscape.png` | 2034 × 1398 |
| 闭合、自由开合外屏 | `public/demo/echopod/outer.png` | 1398 × 2034 |

取图改为按 Slot 映射，不再用画布宽高推断内外屏。用户上传的截图仍优先；演示图片仍不计入真实上传素材。
