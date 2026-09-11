import { useEffect, useRef, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { flushSync } from 'react-dom';
import type { Project } from '../lib/project';
import { currentPage, dimensions } from '../lib/project';
import { DeviceRenderer } from '../lib/device';
import type { BrowserSurface } from '../lib/browser';
import { compose } from '../lib/compositor';
import { t } from '../i18n';
export function Stage({
  project,
  onView,
  onCommit,
  browserReload = 0,
}: {
  project: Project;
  browserReload?: number;
  onView: (yaw: number, pitch: number) => void;
  onCommit: () => void;
}) {
  const wrapper = useRef<HTMLDivElement>(null),
    target = useRef<HTMLCanvasElement>(null),
    renderer = useRef<DeviceRenderer | null>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const [error, setError] = useState('');
  const [surfaces, setSurfaces] = useState<BrowserSurface[]>([]);
  const [frameEvent, setFrameEvent] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const sync = () => {
      setFullscreen(document.fullscreenElement === wrapper.current);
      if (!document.fullscreenElement) fullscreenButton.current?.focus();
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFallbackFullscreen(false);
        setFullscreen(false);
        fullscreenButton.current?.focus();
      }
    };
    document.addEventListener('keydown', escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', escape);
    };
  }, [fallbackFullscreen]);
  const toggleFullscreen = async () => {
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      setFullscreen(false);
    } else if (document.fullscreenElement === wrapper.current) {
      await document.exitFullscreen();
    } else {
      try {
        if (!wrapper.current?.requestFullscreen) throw new Error('Fullscreen unavailable');
        await wrapper.current.requestFullscreen();
      } catch {
        setFallbackFullscreen(true);
        setFullscreen(true);
      }
    }
  };

  useEffect(() => setFrameEvent(false), [project.browser.url, browserReload]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const drag = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);
  useEffect(() => {
    try {
      renderer.current = new DeviceRenderer();
      setReady(true);
    } catch {
      setError(t('errors.webglUnavailable'));
    }
    return () => {
      renderer.current?.dispose();
      renderer.current = null;
    };
  }, []);
  useEffect(() => {
    const observer = new ResizeObserver(([e]) => {
      const d = dimensions(project),
        width = Math.max(1, Math.round(e.contentRect.width * Math.min(devicePixelRatio, 2)));
      setSize({
        width,
        height: fullscreen
          ? Math.max(1, Math.round(e.contentRect.height * Math.min(devicePixelRatio, 2)))
          : Math.round((width * d.height) / d.width),
      });
    });
    observer.observe(wrapper.current!);
    return () => observer.disconnect();
  }, [project.mode, project.output.size, project.output.storeSize, fullscreen]);
  useEffect(() => {
    let active = true;
    if (renderer.current && target.current) {
      renderer.current
        .prepare(project, currentPage(project))
        .then(() => {
          if (active && renderer.current && target.current) {
            compose(target.current, renderer.current, project, size.width, size.height);
            target.current.dataset.scene = project.scene;
            if (project.workspace === 'browser') {
              const cssWidth = wrapper.current!.clientWidth;
              const nextSurfaces = renderer.current.browserSurfaces(
                project,
                cssWidth,
                (cssWidth * size.height) / size.width,
              );
              // Commit the DOM mask before painting the corresponding canvas frame.
              flushSync(() => setSurfaces(nextSurfaces));
            }

            setError('');
            setLoading(false);
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }
    return () => {
      active = false;
    };
  }, [project, size, ready]);
  const d = dimensions(project);
  return (
    <div
      ref={wrapper}
      className={`stage-canvas ${fallbackFullscreen ? 'fullscreen-fallback' : ''} ${project.view.transparent && project.mode === 'image' ? 'checker' : ''}`}
      style={{ aspectRatio: `${d.width}/${d.height}` }}
    >
      <button
        ref={fullscreenButton}
        type="button"
        className="canvas-fullscreen-toggle"
        aria-label={t(fullscreen ? 'canvas.exitFullscreen' : 'canvas.fullscreen')}
        title={t(fullscreen ? 'canvas.exitFullscreen' : 'canvas.fullscreen')}
        aria-pressed={fullscreen}
        onClick={() => void toggleFullscreen()}
      >
        {fullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
      </button>
      <canvas
        ref={target}
        aria-label={t('aria.stage')}
        data-testid="device-canvas"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            yaw: project.view.yaw,
            pitch: project.view.pitch,
          };
        }}
        onPointerMove={(e) => {
          const a = drag.current;
          if (a)
            onView(
              Math.max(-0.9, Math.min(0.9, a.yaw + (e.clientX - a.x) / 320)),
              Math.max(-0.6, Math.min(0.6, a.pitch + (e.clientY - a.y) / 380)),
            );
        }}
        onPointerUp={() => {
          if (drag.current) {
            drag.current = null;
            onCommit();
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
          onCommit();
        }}
      />
      {project.workspace === 'browser' && (
        <div className="web-overlay" data-testid="web-overlay" data-scene={project.scene}>
          {(['inner-left', 'inner', 'outer'] as const)
            .filter((id) => id !== 'inner-left' || surfaces.some((s) => s.id === id))
            .map((id) => {
              const s = surfaces.find((s) => s.id === id);
              return (
                <div
                  key={id}
                  className="web-surface"
                  data-screen={id}
                  style={{
                    clipPath: s?.clip,
                    maskImage: s?.mask,
                    maskMode: s?.maskMode,
                    maskSize: '100% 100%',
                    visibility: s?.visible ? 'visible' : 'hidden',
                  }}
                >
                  <iframe
                    key={`${id}-${browserReload}`}
                    title={
                      id === 'inner-left'
                        ? t('browser.innerLeftFrame')
                        : id === 'inner'
                          ? t('browser.innerFrame')
                          : t('browser.outerFrame')
                    }
                    src={project.browser.url || '/browser-demo.html'}
                    sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="no-referrer"
                    tabIndex={project.browser.interactive && s?.visible ? 0 : -1}
                    style={{
                      width: s?.width ?? 951,
                      height: s?.height ?? 669,
                      transform: s?.matrix,
                      pointerEvents: project.browser.interactive ? 'auto' : 'none',
                    }}
                    onLoad={() => setFrameEvent(true)}
                  />
                  {!!s?.blur && (
                    <div
                      className="web-optics"
                      aria-hidden="true"
                      style={{
                        width: s.width,
                        height: s.height,
                        transform: s.matrix,
                        backdropFilter: `blur(${s.blur}px)`,
                        WebkitBackdropFilter: `blur(${s.blur}px)`,
                        maskImage:
                          id === 'outer'
                            ? 'linear-gradient(to right, transparent, black)'
                            : 'linear-gradient(to right, black, transparent 50%)',
                      }}
                    />
                  )}
                </div>
              );
            })}
          <span className="web-status sr-only" role="status">
            {frameEvent ? t('browser.statusOpened') : t('browser.statusLoading')}
          </span>
        </div>
      )}
      {loading && !error && (
        <div className="canvas-loading" role="status">
          {t('status.loadingModel')}
        </div>
      )}
      {error && (
        <div className="canvas-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
