# 实现计划

## 技术选择

React + TypeScript + Vite，Three.js 加载 Apple 官网骨骼设备模型。Canvas 2D 负责屏幕纹理、排版合成，WebGL 负责机身及透视；预览和导出使用同一个 compose 函数。Mediabunny + WebCodecs 逐帧编码 MP4/WebM；gifenc 编码 GIF；fflate 本地 ZIP；Zod 严格校验便携项目；IndexedDB 自动保存。

不采用依赖 API 文件写入的截图模板，不使用服务器截图、远程字体、Apple 模型/CDN 或 FFmpeg 服务。无需跨源隔离，不使用 SharedArrayBuffer。

## 分阶段执行顺序与交付

1. **定义与构建基础（R01/R10）**：PRD、类型/schema、设备规格、静态构建、部署头。验收：TypeScript 与空壳构建。
2. **渲染验证（R03/R04/R05）**：几何、铰链、内外屏 UV、姿态、共享合成、原创演示内容。验收：五场景、连续开合、横竖文字正向。
3. **编辑状态（R02/R08/R09/R13）**：页面和素材槽位、文件解码、历史、导入校验、IndexedDB，完整 loading/error 状态。验收：上传/移除/撤销/刷新/导入回环。
4. **动画与导出（R06/R07/R11/R12/R14）**：纯函数时间轴、PNG、规格严格的 UI PNG、ZIP、视频/GIF、进度取消。验收：实际生成文件并解码，不以按钮存在代替测试。
5. **整体验证**：单元测试边界；Playwright 浏览器流程、尺寸/网络/响应式与下载；人工截图检查；修复后构建和回归。
6. **交付**：README、实际验证记录、Pages 构建参数，运行本地预览。用户说“后面部署”，本次不创建云端项目或上线。

## 文件职责

- `src/lib/project.ts`：类型、运行时校验、初始项目、槽位规格、页面与场景映射。
- `src/lib/timeline.ts`：动画总时长和时间→开合进度的纯函数。
- `src/lib/assets.ts`：导入/解码、等比绘制、原创示例纹理、下载工具。
- `src/lib/device.ts`：WebGL 几何、材质、姿态和生命周期。
- `src/lib/compositor.ts`：画布背景、设备合成、排版共用入口。
- `src/lib/export.ts`：可取消批量、视频、GIF、PNG 和严格原始截图导出。
- `src/lib/storage.ts`：IndexedDB；失败向调用方传播。
- `src/components/Stage.tsx`：尺寸观察、画布生命周期、拖动和渲染反馈。
- `src/components/Modal.tsx`：焦点管理和对话框基础。
- `src/App.tsx`：编排编辑状态、面板和导出流程。
- `tests/`：端到端浏览器流程；`src/lib/*.test.ts`：核心边界。

## 风险与处理

| 风险 | 处理与验证 |
| --- | --- |
| 官网材质采用专有扩展 | 保留几何和动画；将 ASTC 转 PNG；本地实现模糊与标准 PBR 材质，记录差异与资源来源 |
| WebCodecs 浏览器/硬件差异 | 实际能力探测，格式不可用显示原因；WebM/GIF 替代，验证当前浏览器 |
| 大量截图耗内存 | 单图/页数/项目体积上限，串行导出、资源释放、可取消 |
| 相机与内屏旋转不正确 | 彩色左右/上下测试图，五种静态截图视觉检查 |
| 异步覆盖新页面或已导入状态 | 目标 ID 和导入 busy 锁，恢复先完成后自动保存 |
| 存储丢失或满额 | 明确状态，便携项目保存，非法恢复不自动覆盖 |
| “上架适配”误解 | 区分规格校验与真实运行，纯截图只接受匹配尺寸素材 |

## 部署

Cloudflare Pages：构建命令 `npm run build`，输出目录 `dist`，Node 22（`.node-version`）。无需环境变量、Functions 或后端数据库。`public/_headers` 包含 CSP 和内容类型防嗅探；`public/_redirects` 支持静态 SPA 回退。生产仅同源资源。

官方依据：https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/ 、https://mediabunny.dev/guide/quick-start 。依赖以 package-lock.json 为准。

## 2026-09-10 查看器升级

P0：Chrome MCP 源站核对 → 下载资源与来源清单 → 保留骨骼模型并转换贴图 → 接入固定右半部、内外屏投影及空间模糊 → 校正五形态和透视 → 导出及生产环境回归。对应实现为 `device.ts`、`projected-screen.ts`、`prepare-apple-assets.py`，详情见 [接入记录](APPLE_VIEWER.md)。

P1：进一步复刻 Lotus 的灯光与专有玻璃着色、磁吸弹簧手感、独立空框 PNG 导出。以上不影响现有截图替换与动画导出。

## 内外屏上传与自动外屏（已实现）

- `resolveSlot` 统一解析外屏素材优先级，渲染、缺图校验和 ZIP 使用相同来源；避免复制派生图片导致不同步。
- `screenCanvas` 先裁原图左半边，再应用外屏独立的 contain/cover 和定位参数。
- `DeviceRenderer.prepare` 缓存键包括解析后的来源，内屏换图、独立外屏上传/移除与裁切变更均刷新。
- 上传区提供两块屏幕入口、自动来源说明、填充方式说明；新页面默认 cover，旧文档兼容。
- 回归：红/绿左右测试图只取红色左半边；contain 留边、cover 铺满；蓝色外屏覆盖/移除；换图与项目序列化；关闭示例导出 PNG；ZIP 包含派生外屏并标记来源。

## EchoPod 示例与功能精简（2026-09-11）

已按用户最新要求删除上架套图页面、排版编辑、排版合成与专属样式；历史计划中的 R14 不再属于交付功能。schema 接受旧 store 文档并转换为 image，保留原素材与元数据。

以用户提供的 EchoPod 内外屏 PNG 替代原创旅行绘图，图片为同源静态资源，加载有缓存和失败重试；示例不写入用户素材槽位。介绍来源与资源哈希见 `ECHOPOD_DEMO.md`。

折叠进度事件仅更新 view.open，保留 scene。新增五场景回归修复前在 closed→fold 断言失败，修复后通过。三个展示尺寸、EchoPod 入口、用户素材替换和旧项目迁移纳入自动验证。

## 网页模拟增量（已实现）

1. 扩展向后兼容的 workspace/browser 项目字段，保留截图资产与共用场景。
2. 增加 URL 控制、本地演示、逻辑视口、操作/旋转切换及移动端快捷入口。
3. 基于同一骨骼和相机构建 iframe CSS 投影、屏幕裁切与前叶遮挡；静态弯折采用分片，明确跨域同步边界。
4. 保护导出入口，增加 CSP frame-src；浏览器模式无服务器依赖。
5. 完成单元、Chromium、WebKit、响应式及生产 CSP 验证。详见 BROWSER_MODE.md 与 VALIDATION.md。
