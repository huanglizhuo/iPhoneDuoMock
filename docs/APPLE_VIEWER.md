# Apple Product Viewer 接入记录

核对日期：2026-09-10。来源：https://www.apple.com/iphone-duo/ 。通过 Chrome MCP 检查 DOM、网络资源、Three.js 场景与动画对象。

## 官网实际实现

- `product-viewer-enhanced-container product-viewer-canvas` 包含 Three.js r165 的 WebGL Canvas，并非视频帧序列。
- 场景入口：`/v/iphone-duo/a/static/scenes/iPhoneDuo_US_L_ktx.lsd`。
- glTF：`vroIlOhiWPzmavg.gltf` + `vroIlOhiWPzmavg.bin`。包含 62 个网格、一套蒙皮骨骼、`Intro` / `Slider` 两个 2 秒动画。`AnimationScrubber` 将铰链进度映射到 `Slider` 时间。
- 内屏：`skeleton_0_3_screenTexture_geo`；外屏：`skeleton_0_7_outerDisplayScreenTexture_geo`。图像通过屏幕材质显示，开合时使用投影采样，而非简单贴合网格 UV。
- 官网默认铰链进度：开合入口 0.3333、闭合 0、横屏/竖屏 1、坐式 0.5111、帐篷 0.25。不是将多个形态简单地旋转同一张手机图片。
- `Wipe` 使用两个带 mipmap 的离屏 RenderTarget。内屏 blurBounds `[0.45,1]`、wipePosition `1`、wipeFactor `-1.2`、wipeOffset `1.2`；外屏 blurBounds `[0,0.9]`、wipePosition `0`。竖向外屏在中间进度具有三角形强度曲线。
- 模糊随位置和铰链进度改变，暂停拖动后仍保留；因此不能用依赖拖动速度的 motion blur 或整个 Canvas 的 CSS filter 替代。
- 官网还包含自己的透视屏幕投射、壁纸着色器、分层灯光及弹簧吸附系统。

## 下载文件

`reference/apple-duo/` 保存原始 glTF、BIN、KTX2、EXR、场景配置、页面脚本、USDZ 以及 8 张官网参考帧。完整 URL / SHA-256 见 `manifest.json`；网络观察列表见 `urls.json` 与 `frame-urls.json`。

`iPhone_Duo_Star_White.usdz` 来自官网 AR 链接。WebGL 编辑器使用更小且包含开合动画的 glTF，USDZ 不打包进部署目录。

官网产品查看器中的 frame 是模型的边框、玻璃、按钮、摄像头及铰链网格。本次没有发现独立的“空屏透明 PNG frame”资源；保存的 `foldable.jpg`、`closed.jpg`、`landscape.jpg`、`portrait.jpg`、`laptop.jpg`、`tent.jpg` 等是官网带内容的参考帧，不冒充空框模板。

## 本地接入

1. `scripts/prepare-apple-assets.py` 将原始 ASTC 6×6 KTX2（Vulkan format 165/166）离线解码为 PNG，保留 UV、骨骼、几何和动画。这样无须运行时 ASTC 支持或 WASM 转码器。
2. `public/models/apple-duo/` 包含转换后的 glTF、BIN、33 张 PNG 和 EXR；约 4.9 MiB，单个文件小于 4 MiB。所有依赖为同源相对路径。
3. `DeviceRenderer` 使用原始 `Slider` 骨骼动画。自由开合模式固定模型原点和镜头，右半部不随铰链变化移动；静态姿态继续独立居中。
4. `ProjectedScreen` 从蒙皮变形后的玻璃位置向固定图像平面投射，求交点后采样用户图片。图像保持正立，玻璃在图像前展开；纵向超出图片覆盖区域时显示黑色，上下自然形成透视三角区域；横向使用边缘像素延展，不生成竖向黑条。
5. 外屏图像高度和比例由闭合屏幕标定，横向起点跟随铰链侧边界，避免边缘脱离。内屏使用完整展开的固定平面。图像不会随左屏一起拉伸、剪切或转成斜字。
6. 渐变模糊、图像覆盖边缘和暗化共同在投影图像坐标中处理。采样使用 mipmap 和 25 点二项式核；模糊半径按图像尺寸换算，不依赖拖动速度。停止拖动保留当前效果，回到终点恢复清晰图像。
7. 预览、PNG、GIF、MP4、WebM 共用此实现。其他五种静态姿态保留其屏幕 UV 和截图旋转；纯 UI 导出不添加机身、投影或模糊。
8. 首次加载显示状态提示。资源加载后不需要 Apple 网络服务；上传、替换、保存、导出完全在浏览器中执行。

## 这次差异的根因

### 右半部跟着移动

官方模型右侧骨骼在 `Slider` 动画中原本就是固定的。旧实现每一帧计算整个活动机身的包围盒并重新居中，导致父节点平移；深度中心也随开合变化，产生额外透视缩放。修复前，同一右屏顶点在 1200×800 画面五个开合进度下横向偏移约 198 像素。现在自由开合不再根据活动包围盒移动模型，回归要求偏差小于 0.5 像素。

### 内容跟着玻璃转、侧边全黑、缺少上下黑区

旧实现将屏幕网格 UV 直接用于截图，模糊结果仍铺满整块玻璃。即使调低压暗系数，也无法形成官网的固定图像投射效果。更早的压暗公式还会将亮图侧边清零。之前的“最大压暗 32%”只是处理症状，已被本次投影实现取代，不再保留 `ScreenWipe`。

官网脚本包含 ray/plane 求交、lookupUv、framing 和图像范围裁切；提取记录在 `reference/apple-duo/projection-*.glsl`。用户提供的参考仓库 [chuspeeism/iphone-duo](https://github.com/chuspeeism/iphone-duo) 也使用固定视点投影。本地采样逻辑参考该仓库 MIT 实现，适配官网 glTF 的坐标轴、蒙皮和相机；许可随构建发布在 `public/THIRD_PARTY_NOTICES.txt`。

## 验收与复现边界

- `tests/projection.spec.ts`：固定右屏顶点；正向/反向开合中横向色带保持水平；两端玻璃内部出现不透明黑区；图像有效区域仍明亮；空间模糊有位置差异；合上恢复同一画面；等尺寸替换截图正确生效。
- `tests/apple-viewer.spec.ts`：62 个网格、两个动画、两个屏幕节点及所有本地依赖完整。
- `tests/editor.spec.ts`：五姿态、真实上传图片、PNG/ZIP/四种上架尺寸、视频/GIF 解码、取消、保存恢复及网络边界。
- `docs/screenshots/projected-{0,25,33,50,65,100}.png`：本次闭合到展开的实际渲染截图。

当前复现了这次要求的固定右半部、左半部骨骼开合、投影内容、上下黑区及空间模糊。并未运行完整 Lotus 引擎；标准 Three.js PBR 材质与官网专有玻璃/分层灯光仍有差异，不能声称整个画面逐像素一致。

原始 Apple 资源的来源与哈希继续保留；项目没有运行时后端、鉴权服务或上传 API。

## 垂直边缘黑条修复

用户再次提供接近闭合/完全展开的截图后，增加 `tests/vertical-edge.spec.ts`。旧版投影把 `coverage.x * coverage.y` 同时乘入清晰图像和所有模糊采样；透视使左叶超出固定图像平面的横向范围，内屏左缘在 95% 展开读到 RGB 7，外屏右缘在 5% 展开读到 RGB 0。它们是有效屏幕内部的黑条，不是正常硬件边框。

Chrome MCP 再次核对官网的 framing、lookupUv 和取样逻辑：官网有 `/ 1.12` 的取景扩展，且边缘衰减范围延伸到 UV 范围以外，并非本地旧代码的 0–1 四边矩形清零。本地此次将横向覆盖固定为 1，纹理保持 clamp-to-edge；仅纵向范围参与黑区遮罩和边缘模糊。只更改这一变量，原失败测试即通过，确认根因是横向遮罩，而非缺失图片、物理边框或暗化公式。

回归覆盖内屏 90/95/98/100% 和外屏 0/2/5/10% 的亮边；已有固定右屏、上下黑区、局部模糊、图像替换和关闭恢复测试继续通过。效果图：`docs/screenshots/vertical-edge-fixed-{5,33,65,95}.png`。此修复对应用户指出的边缘行为，不将本地重写着色器描述为完整 Lotus 引擎的逐像素复制。
