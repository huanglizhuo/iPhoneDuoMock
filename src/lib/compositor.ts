import { BACKGROUNDS } from './project';
import type { Project } from './project';
import { context } from './assets';
import { DeviceRenderer } from './device';
export function compose(
  target: HTMLCanvasElement,
  renderer: DeviceRenderer,
  p: Project,
  width: number,
  height: number,
) {
  if (target.width !== width || target.height !== height) {
    target.width = width;
    target.height = height;
  }
  const ctx = context(target),
    preset = BACKGROUNDS.find((b) => b.id === p.view.background),
    custom = p.view.background === 'custom';
  ctx.clearRect(0, 0, width, height);
  const transparent = p.mode !== 'animation' && p.view.transparent;
  if (!transparent) {
    ctx.fillStyle = custom ? p.view.backgroundColor : preset!.color;
    ctx.fillRect(0, 0, width, height);
    const image = custom ? renderer.backgroundImage : null;
    if (image) {
      // The custom image always fills the canvas; a ratio mismatch is cropped on both axes.
      const scale = Math.max(width / image.width, height / image.height),
        w = image.width * scale,
        h = image.height * scale;
      ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    }
  }
  const x = 0,
    y = 0,
    w = width,
    h = height;
  const deviceCanvas = renderer.draw(p, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  // The fixed-origin fold viewer has no screen-space ground shadow.
  if (!transparent && p.scene !== 'fold') {
    ctx.save();
    ctx.translate(x + w / 2, y + h * 0.83);
    ctx.scale(w * 0.3, h * 0.045);
    const gradient = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
    gradient.addColorStop(0, 'rgba(22,29,36,0.13)');
    gradient.addColorStop(1, 'rgba(22,29,36,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  ctx.drawImage(deviceCanvas, x, y, w, h);
}
