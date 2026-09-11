# Default Apple wallpaper

Captured from https://www.apple.com/iphone-duo/ using Chrome MCP on 2026-09-11.

The product viewer loads `scene-wallpaper.gltf`, cropped KTX textures and LUTs.
Its `WallpaperRenderer` renders the landscape with geometry and custom shaders,
then composites the lock-screen UI with foreground occlusion. Cropped textures
are not complete wallpaper images and must not be pasted into horizontal strips.

`scripts/capture-apple-wallpaper.js` extracts the viewer's complete `ScreenUi`
render targets. WebGL rows are flipped, linear RGB is converted to sRGB, and the
clock-occlusion alpha is replaced with opaque PNG alpha. No frame or screen glare
is baked into the image.

Original captured plates are preserved in `reference/apple-duo/`:

- `lockscreen-inner-render.png`: 2670 × 1878, fully open wallpaper state.
- `lockscreen-outer-render.png`: 1291 × 1878, closed wallpaper state.

`scripts/prepare-apple-assets.py` fits these complete plates to the four existing
demo output sizes. Portrait/seated use the outer portrait composition; standing
uses the inner landscape composition. These two adaptations are local crops,
not separately supplied Apple scenes. Upsampling does not add source detail.

The runtime uses bundled PNGs only. User uploads, animation geometry and exports
are unaffected. The demo URLs have a version query to refresh cached old images.
These are static demo plates; Apple's dynamic wallpaper parallax is not included.
