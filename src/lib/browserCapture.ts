import { canvas, context } from './assets';
import { currentPage, SLOT_IDS, SPECS } from './project';
import type { Project, Slot } from './project';
import { t } from '../i18n';

const CAPTURE_HANDLE = 'duo-studio-export';
const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
type CaptureMediaDevices = MediaDevices & {
  setCaptureHandleConfig?: (config: {
    exposeOrigin: boolean;
    handle: string;
    permittedOrigins: string[];
  }) => void;
};
type CaptureTrack = MediaStreamTrack & {
  getCaptureHandle?: () => { handle?: string } | null;
};

function captureError(error: unknown) {
  if (!(error instanceof DOMException))
    return error instanceof Error ? error : new Error(String(error));
  if (error.name === 'NotAllowedError') return new Error(t('errors.capturePermission'));
  if (error.name === 'NotReadableError') return new Error(t('errors.captureBusy'));
  if (error.name === 'AbortError') return new Error(t('errors.captureCancelled'));
  return new Error(t('errors.captureFailed', { reason: error.message || error.name }));
}

async function waitForVideo(video: HTMLVideoElement, signal: AbortSignal) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(t('errors.captureTimeout'))), 8000);
    const done = () => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', cancelled);
      video.removeEventListener('loadeddata', ready);
    };
    const ready = () => {
      done();
      resolve();
    };
    const cancelled = () => {
      done();
      reject(new DOMException(t('export.abortError'), 'AbortError'));
    };
    video.addEventListener('loadeddata', ready, { once: true });
    signal.addEventListener('abort', cancelled, { once: true });
  });
}

async function waitForCapturedFrame(
  video: HTMLVideoElement,
  signal: AbortSignal,
  isCurrentTile: () => boolean,
) {
  const deadline = performance.now() + 5000;
  do {
    if (performance.now() >= deadline) throw new Error(t('errors.captureTimeout'));
    await frame();
    await frame();
    if (signal.aborted) throw new DOMException(t('export.abortError'), 'AbortError');
    if (isCurrentTile()) return;
    if (!('requestVideoFrameCallback' in video)) continue;
    await new Promise<void>((resolve, reject) => {
      const done = () => signal.removeEventListener('abort', cancelled);
      const timeout = window.setTimeout(
        () => {
          done();
          reject(new Error(t('errors.captureTimeout')));
        },
        Math.max(1, deadline - performance.now()),
      );
      const cancelled = () => {
        window.clearTimeout(timeout);
        done();
        reject(new DOMException(t('export.abortError'), 'AbortError'));
      };
      video.requestVideoFrameCallback(() => {
        window.clearTimeout(timeout);
        done();
        resolve();
      });
      signal.addEventListener('abort', cancelled, { once: true });
    });
  } while (!isCurrentTile());
}

function screenFor(slot: Slot) {
  return slot === 'outer' || slot === 'standing' ? 'outer' : 'inner';
}

export async function captureBrowserProject(
  project: Project,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  if (!navigator.mediaDevices?.getDisplayMedia) throw new Error(t('errors.captureUnsupported'));
  const mediaDevices = navigator.mediaDevices as CaptureMediaDevices;
  const clearCaptureHandle = () => {
    try {
      mediaDevices.setCaptureHandleConfig?.({
        exposeOrigin: false,
        handle: '',
        permittedOrigins: [],
      });
    } catch {
      // Optional API cleanup must not conceal the original export result.
    }
  };
  try {
    if (!mediaDevices.setCaptureHandleConfig) throw new Error(t('errors.captureUnsupported'));
    mediaDevices.setCaptureHandleConfig({
      exposeOrigin: false,
      handle: CAPTURE_HANDLE,
      permittedOrigins: [location.origin],
    });
  } catch (error) {
    clearCaptureHandle();
    throw captureError(error);
  }

  let stream: MediaStream;
  try {
    stream = await mediaDevices.getDisplayMedia({
      video: { displaySurface: 'browser' },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'exclude',
    } as MediaStreamConstraints);
  } catch (error) {
    clearCaptureHandle();
    throw captureError(error);
  }

  const track = stream.getVideoTracks()[0];
  const root = document.documentElement;
  const video = document.createElement('video');
  // A reserved strip travels through the same compositor/capture stream as the iframe.
  // Its changing color identifies the tile; exclude the strip from the exported pixels.
  const marker = document.createElement('div');
  marker.dataset.captureMarker = '';
  marker.style.cssText =
    'position:fixed;left:0;top:0;width:100vw;height:16px;z-index:2147483647;visibility:visible!important;pointer-events:none';
  const probe = context(canvas(1, 1));
  let tile = 0;
  const stop = () => stream.getTracks().forEach((item) => item.stop());
  if (signal.aborted) {
    stop();
    clearCaptureHandle();
    throw new DOMException(t('export.abortError'), 'AbortError');
  }
  signal.addEventListener('abort', stop, { once: true });

  try {
    if (!track) throw new Error(t('errors.captureEmpty'));
    const surface = track.getSettings().displaySurface;
    if (surface !== 'browser') throw new Error(t('errors.captureWrongSurface'));
    if ((track as CaptureTrack).getCaptureHandle?.()?.handle !== CAPTURE_HANDLE)
      throw new Error(t('errors.captureWrongTab'));
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForVideo(video, signal);

    const captured = structuredClone(project);
    const sourcePage = currentPage(captured);
    captured.workspace = 'screenshots';
    captured.demo = false;
    captured.pages = [sourcePage];
    captured.activePageId = sourcePage.id;
    root.dataset.browserCapture = 'true';
    (document.fullscreenElement ?? document.body).append(marker);

    for (let index = 0; index < SLOT_IDS.length; index++) {
      if (signal.aborted) throw new DOMException(t('export.abortError'), 'AbortError');
      if (track.readyState === 'ended') throw new Error(t('errors.captureEnded'));
      const slot = SLOT_IDS[index];
      const screen = screenFor(slot);
      const iframe = document.querySelector<HTMLIFrameElement>(
        `.web-surface[data-screen="${screen}"] iframe`,
      );
      if (!iframe) throw new Error(t('errors.captureFrameMissing'));

      const spec = SPECS[slot];
      const cssWidth = Math.round(spec.width / project.browser.pixelRatio);
      const cssHeight = Math.round(spec.height / project.browser.pixelRatio);
      const captureScaleX = video.videoWidth / innerWidth;
      const captureScaleY = video.videoHeight / innerHeight;
      root.dataset.browserCaptureScreen = screen;
      root.style.setProperty('--capture-frame-width', `${cssWidth}px`);
      root.style.setProperty('--capture-frame-height', `${cssHeight}px`);
      root.style.setProperty(
        '--capture-frame-scale-x',
        String(spec.width / cssWidth / captureScaleX),
      );
      root.style.setProperty(
        '--capture-frame-scale-y',
        String(spec.height / cssHeight / captureScaleY),
      );
      const output = canvas(spec.width, spec.height);
      const stripHeight = Math.ceil(16 * captureScaleY);
      const tileHeightLimit = video.videoHeight - stripHeight;
      if (tileHeightLimit <= 0) throw new Error(t('errors.captureEmpty'));
      for (let y = 0; y < spec.height; y += tileHeightLimit) {
        for (let x = 0; x < spec.width; x += video.videoWidth) {
          if (signal.aborted) throw new DOMException(t('export.abortError'), 'AbortError');
          if (!stream.active) throw new Error(t('errors.captureEnded'));
          root.style.setProperty('--capture-frame-left', `${-x / captureScaleX}px`);
          root.style.setProperty('--capture-frame-top', `${(stripHeight - y) / captureScaleY}px`);
          const stamp = ++tile;
          const color = [stamp % 4, Math.floor(stamp / 4) % 4, Math.floor(stamp / 16) % 4].map(
            (n) => 32 + n * 64,
          );
          marker.style.backgroundColor = `rgb(${color.join(',')})`;
          await waitForCapturedFrame(video, signal, () => {
            probe.drawImage(video, 8 * captureScaleX, 8 * captureScaleY, 1, 1, 0, 0, 1, 1);
            const actual = probe.getImageData(0, 0, 1, 1).data;
            return color.every((value, i) => Math.abs(actual[i] - value) < 16);
          });
          const tileWidth = Math.min(video.videoWidth, spec.width - x);
          const tileHeight = Math.min(tileHeightLimit, spec.height - y);
          context(output).drawImage(
            video,
            0,
            stripHeight,
            tileWidth,
            tileHeight,
            x,
            y,
            tileWidth,
            tileHeight,
          );
        }
      }
      sourcePage.slots[slot].asset = {
        name: `browser-${slot}.png`,
        data: output.toDataURL('image/png'),
        width: spec.width,
        height: spec.height,
        source: 'simulator',
      };
      onProgress((index + 1) / SLOT_IDS.length);
    }
    return captured;
  } catch (error) {
    throw captureError(error);
  } finally {
    signal.removeEventListener('abort', stop);
    stop();
    clearCaptureHandle();
    marker.remove();
    video.pause();
    video.srcObject = null;
    delete root.dataset.browserCapture;
    delete root.dataset.browserCaptureScreen;
    for (const name of [
      '--capture-frame-width',
      '--capture-frame-height',
      '--capture-frame-scale-x',
      '--capture-frame-scale-y',
      '--capture-frame-left',
      '--capture-frame-top',
    ])
      root.style.removeProperty(name);
  }
}
