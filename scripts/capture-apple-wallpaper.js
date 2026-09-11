// Development-only: evaluate this function with Chrome MCP on
// https://www.apple.com/iphone-duo/ after scrolling the product viewer into view.
// Save the returned data URLs as reference/apple-duo/lockscreen-{key}-render.png.
// These are complete original renders, not stitched source texture strips.
() => {
  const lotus = window.Lotus.instance();
  const wallpaper = [...lotus.scene.scripts].find((s) => s.script === 'WallpaperRenderer');
  if (!wallpaper?._rendered) throw new Error('Wait for the product viewer to render');
  const renderer = lotus.scene.renderer;
  const result = {};
  try {
    for (const [key, fold] of [['outer', 0], ['inner', 1]]) {
      wallpaper.materials.setState({
        duneCloseMatrix: wallpaper.duneAnchors.close.matrix(fold),
        duneFarMatrix: wallpaper.duneAnchors.far.matrix(fold),
        fold,
      });
      wallpaper.updateCamera(fold);
      wallpaper.render();
      const screen = [...wallpaper._screens.values()].find((s) => s.key === key);
      if (!screen?.plate) throw new Error(`Missing ${key} lock-screen UI`);
      const target = wallpaper.screenTarget(screen);
      const material = wallpaper.screenUiMaterial(screen);
      material.wallpaperMap = wallpaper.renderTarget.texture;
      material.uiMap = screen.plate;
      material.uniforms.wallpaperUvScale.value.fromArray(wallpaper.screenCrop(key));
      material.uniforms.uiUvScale.value.fromArray(wallpaper.uiFit(screen, target));
      const previous = renderer.getRenderTarget();
      try {
        wallpaper._uiMesh.material = material;
        renderer.setRenderTarget(target);
        renderer.render(wallpaper._uiScene, wallpaper._uiCamera);
      } finally {
        renderer.setRenderTarget(previous);
      }
      const { width, height } = target;
      const bytes = new Uint8Array(width * height * 4);
      renderer.readRenderTargetPixels(target, 0, 0, width, height, bytes);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      const image = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dst = (y * width + x) * 4;
          const src = ((height - 1 - y) * width + x) * 4;
          for (let channel = 0; channel < 3; channel++) {
            const linear = bytes[src + channel] / 255;
            image.data[dst + channel] = Math.round(255 * (linear <= 0.0031308
              ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055));
          }
          // Apple's alpha stores clock occlusion, not PNG transparency.
          image.data[dst + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      result[key] = canvas.toDataURL('image/png');
    }
  } finally {
    wallpaper._needsRender = true;
    lotus.tryRequestAnimationFrame();
  }
  return result;
};
