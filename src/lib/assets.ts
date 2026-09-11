import { projectSchema, SPECS, SLOT_IDS } from './project';
import { t } from '../i18n';
import type { Asset, Project, Slot, SlotData } from './project';
export function decodeImage(data: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(t('errors.decode')));
    img.src = data;
  });
}
export async function readAsset(file: File): Promise<Asset> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error(t('errors.imageType'));
  if (file.size > 20 * 1024 * 1024) throw new Error(t('errors.imageSize'));
  const data = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error(t('errors.readFile')));
    r.readAsDataURL(file);
  });
  const img = await decodeImage(data);
  if (Math.max(img.width, img.height) > 4096 || img.width * img.height > 16_000_000)
    throw new Error(t('errors.imagePixels'));
  return {
    name: file.name.slice(0, 200),
    data,
    width: img.width,
    height: img.height,
    source: 'design',
  };
}
export async function parseProjectFile(file: File): Promise<Project> {
  if (file.size > 80 * 1024 * 1024) throw new Error(t('errors.projectSize'));
  let project: Project;
  try {
    project = projectSchema.parse(JSON.parse(await file.text()));
  } catch {
    throw new Error(t('errors.projectInvalid'));
  }
  const seen = new Map<string, { width: number; height: number }>();
  for (const page of project.pages)
    for (const slot of SLOT_IDS) {
      const asset = page.slots[slot].asset;
      if (asset) {
        const image = seen.get(asset.data) ?? (await decodeImage(asset.data));
        if (
          image.width !== asset.width ||
          image.height !== asset.height ||
          image.width * image.height > 16_000_000
        )
          throw new Error(t('errors.projectMismatch'));
        seen.set(asset.data, { width: image.width, height: image.height });
      }
    }
  return project;
}
export function fitRect(
  iw: number,
  ih: number,
  w: number,
  h: number,
  slot: Pick<SlotData, 'fit' | 'x' | 'y' | 'zoom'>,
) {
  const scale =
    slot.fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih) * slot.zoom;
  const width = iw * scale,
    height = ih * scale;
  return {
    x: (w - width) * (slot.fit === 'contain' ? 0.5 : slot.x),
    y: (h - height) * (slot.fit === 'contain' ? 0.5 : slot.y),
    width,
    height,
  };
}
export function canvas(width: number, height: number) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}
export const context = (c: HTMLCanvasElement) => {
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error(t('errors.canvas'));
  return ctx;
};
export async function screenCanvas(
  slot: Slot,
  data: SlotData,
  demo: boolean,
  maxEdge = 2048,
  leftHalf = false,
) {
  const spec = SPECS[slot];
  const factor = Math.min(1, maxEdge / Math.max(spec.width, spec.height));
  const c = canvas(Math.round(spec.width * factor), Math.round(spec.height * factor));
  const ctx = context(c);
  ctx.fillStyle = '#131a1e';
  ctx.fillRect(0, 0, c.width, c.height);
  if (data.asset) {
    const img = await decodeImage(data.asset.data);
    const sourceWidth = leftHalf ? img.width / 2 : img.width;
    const r = fitRect(sourceWidth, img.height, c.width, c.height, data);
    ctx.drawImage(img, 0, 0, sourceWidth, img.height, r.x, r.y, r.width, r.height);
  } else if (demo) await drawDemo(ctx, c.width, c.height, slot);
  else {
    ctx.fillStyle = '#b8c3c8';
    ctx.textAlign = 'center';
    ctx.font = `${c.width * 0.045}px sans-serif`;
    ctx.fillText(t('upload.canvasPlaceholder'), c.width / 2, c.height / 2);
  }
  return c;
}
const demoImages = new Map<string, Promise<HTMLImageElement>>();
/** Bundled Apple lock screen examples are never counted as user uploads. */
export async function drawDemo(ctx: CanvasRenderingContext2D, w: number, h: number, slot: Slot) {
  const url = `/demo/apple/${slot === 'landscape' ? 'inner' : slot === 'portrait' || slot === 'seated' ? 'inner-portrait' : slot === 'standing' ? 'outer-landscape' : 'outer'}.png`;
  let pending = demoImages.get(url);
  if (!pending) {
    pending = decodeImage(url).catch((error) => {
      demoImages.delete(url);
      throw error;
    });
    demoImages.set(url, pending);
  }
  const img = await pending;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const rect = fitRect(img.width, img.height, w, h, { fit: 'contain', x: 0.5, y: 0.5, zoom: 1 });
  ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
export function png(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error(t('errors.pngExport')))), 'image/png'),
  );
}
