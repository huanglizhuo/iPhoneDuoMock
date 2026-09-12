import { canvas, context, decodeImage, png } from './assets';
import { compose } from './compositor';
import { DeviceRenderer } from './device';
import {
  currentPage,
  dimensions,
  missingSlots,
  resolveSlot,
  SCENES,
  SLOT_IDS,
  SPECS,
  safeName,
} from './project';
import type { Project, Slot } from './project';
import { projectAt, totalDuration } from './timeline';
import { t } from '../i18n';
export type ExportKind = 'png' | 'mp4' | 'webm' | 'gif' | 'zip' | 'raw';
export type ExportResult = { blob: Blob; name: string };
const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const aborted = (signal: AbortSignal) => {
  if (signal.aborted) throw new DOMException(t('export.abortError'), 'AbortError');
};
export function animationSize(p: Project, gif = false) {
  const { width, height } = dimensions({ ...p, mode: 'animation' });
  const f = Math.min(1, (gif ? 640 : 1280) / Math.max(width, height));
  return { width: Math.round((width * f) / 2) * 2, height: Math.round((height * f) / 2) * 2 };
}
export async function videoCapabilities(p: Project) {
  const { canEncodeVideo } = await import('mediabunny');
  const size = animationSize(p);
  const [mp4, webm] = await Promise.all([canEncodeVideo('avc', size), canEncodeVideo('vp9', size)]);
  return { mp4, webm };
}
export async function exportProject(
  p: Project,
  kind: ExportKind,
  signal: AbortSignal,
  onProgress: (n: number) => void,
  rawSlot: Slot = 'outer',
): Promise<ExportResult> {
  aborted(signal);
  if (p.workspace === 'browser') throw new Error(t('errors.captureRequired'));
  const page = currentPage(p);
  const base = `${safeName(p.name)}-${safeName(page.name)}`;
  if (kind === 'raw') {
    const a = page.slots[rawSlot].asset;
    if (!a) throw new Error(t('errors.rawMissing'));
    const spec = SPECS[rawSlot];
    if (a.width !== spec.width || a.height !== spec.height)
      throw new Error(
        t('errors.rawSize', {
          required: `${spec.width} × ${spec.height}`,
          actual: `${a.width} × ${a.height}`,
        }),
      );
    const img = await decodeImage(a.data);
    aborted(signal);
    const c = canvas(a.width, a.height);
    context(c).drawImage(img, 0, 0);
    const blob = await png(c);
    onProgress(1);
    return { blob, name: `${base}-${rawSlot}-ui.png` };
  }
  if (kind === 'zip') return exportBundle(p, signal, onProgress);
  const animation = ['mp4', 'webm', 'gif'].includes(kind);
  const project: Project = animation ? { ...p, mode: 'animation' } : p;
  const missing = missingSlots(project);
  if (missing.length && !p.demo)
    throw new Error(
      t('errors.missingSlots', {
        slots: missing.map((s) => SPECS[s].label).join(t('misc.listJoin')),
      }),
    );
  const suffix = missing.length ? '-demo' : '';
  const renderer = new DeviceRenderer(4096);
  try {
    await renderer.prepare(project, page);
    aborted(signal);
    if (kind === 'png') {
      const size = dimensions(p),
        c = canvas(size.width, size.height);
      compose(c, renderer, p, size.width, size.height);
      const blob = await png(c);
      aborted(signal);
      onProgress(1);
      return { blob, name: `${base}-${p.scene}${suffix}.png` };
    }
    const size = animationSize(p, kind === 'gif'),
      c = canvas(size.width, size.height);
    const fps = kind === 'gif' ? 12 : 30,
      duration = totalDuration(p.animation),
      frames = Math.ceil(duration * fps);
    const render = (i: number) =>
      compose(
        c,
        renderer,
        projectAt({ ...project, view: { ...project.view, transparent: false } }, i / fps),
        size.width,
        size.height,
      );
    if (kind === 'gif') {
      const { GIFEncoder, quantize, applyPalette } = await import('gifenc');
      const gif = GIFEncoder();
      for (let i = 0; i < frames; i++) {
        aborted(signal);
        render(i);
        const data = context(c).getImageData(0, 0, c.width, c.height).data;
        const palette = quantize(data, 128);
        gif.writeFrame(applyPalette(data, palette), c.width, c.height, {
          palette,
          delay: (Math.round(((i + 1) * 100) / fps) - Math.round((i * 100) / fps)) * 10,
          repeat: 0,
        });
        onProgress(((i + 1) / frames) * 0.98);
        await tick();
      }
      gif.finish();
      onProgress(1);
      return {
        blob: new Blob([gif.bytes()], { type: 'image/gif' }),
        name: `${base}-${project.scene}${suffix}.gif`,
      };
    }
    const {
      Output,
      BufferTarget,
      CanvasSource,
      Mp4OutputFormat,
      WebMOutputFormat,
      canEncodeVideo,
      Quality,
    } = await import('mediabunny');
    const codec = kind === 'mp4' ? 'avc' : 'vp9';
    if (!(await canEncodeVideo(codec, size)))
      throw new Error(t('errors.codec', { kind: kind.toUpperCase() }));
    aborted(signal);
    const output = new Output({
      format: kind === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: new BufferTarget(),
    });
    const source = new CanvasSource(c, { codec, quality: new Quality('high') });
    output.addVideoTrack(source, { frameRate: fps });
    try {
      await output.start();
      for (let i = 0; i < frames; i++) {
        aborted(signal);
        render(i);
        await source.add(i / fps, 1 / fps);
        onProgress(((i + 1) / frames) * 0.97);
        if (i % 3 === 0) await tick();
      }
      aborted(signal);
      await output.finalize();
      aborted(signal);
      onProgress(1);
      return {
        blob: new Blob([output.target.buffer!], {
          type: kind === 'mp4' ? 'video/mp4' : 'video/webm',
        }),
        name: `${base}-${project.scene}${suffix}.${kind}`,
      };
    } catch (error) {
      await output.cancel().catch(() => {});
      throw error;
    }
  } finally {
    renderer.dispose();
  }
}
async function exportBundle(
  p: Project,
  signal: AbortSignal,
  progress: (n: number) => void,
): Promise<ExportResult> {
  const jobs = p.pages.flatMap((page, index) =>
    SLOT_IDS.filter((s) => resolveSlot(page, s).data.asset).map((slot) => ({ page, index, slot })),
  );
  if (!jobs.length) throw new Error(t('errors.bundleEmpty'));
  const { zipSync, strToU8 } = await import('fflate');
  const files: Record<string, Uint8Array> = {};
  const manifest: unknown[] = [];
  const renderer = new DeviceRenderer(4096);
  try {
    for (let i = 0; i < jobs.length; i++) {
      aborted(signal);
      const { page, index, slot } = jobs[i];
      const scene = slot === 'outer' ? 'closed' : slot;
      const state: Project = {
        ...p,
        activePageId: page.id,
        demo: false,
        scene,
        mode: 'image',
        view: { ...p.view, open: SCENES.find((s) => s.id === scene)!.open },
      };
      await renderer.prepare(state, page);
      aborted(signal);
      const d = dimensions(state),
        c = canvas(d.width, d.height);
      compose(c, renderer, state, d.width, d.height);
      const file = `${String(index + 1).padStart(2, '0')}-${safeName(page.name)}/${slot}.png`;
      files[file] = new Uint8Array(await (await png(c)).arrayBuffer());
      const resolved = resolveSlot(page, slot);
      const a = resolved.data.asset!;
      manifest.push({
        file,
        scene,
        page: page.name,
        source: a.source,
        derivedFrom: resolved.leftHalf ? resolved.source : null,
        crop: resolved.leftHalf ? 'left-half' : null,
        input: [a.width, a.height],
        output: [d.width, d.height],
      });
      progress(((i + 1) / jobs.length) * 0.95);
      await tick();
    }
    aborted(signal);
    files['manifest.json'] = strToU8(
      JSON.stringify(
        { schemaVersion: 1, specificationsDate: '2026-09-10', items: manifest },
        null,
        2,
      ),
    );
    const result = zipSync(files, { level: 0 });
    aborted(signal);
    progress(1);
    return {
      blob: new Blob([result as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
      name: `${safeName(p.name)}-scenes.zip`,
    };
  } finally {
    renderer.dispose();
  }
}
