import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDownToLine,
  Check,
  ChevronDown,
  Copy,
  Download,
  Expand,
  Film,
  Github,
  Globe,
  Moon,
  FolderOpen,
  ImagePlus,
  Images,
  Info,
  Layers,
  LoaderCircle,
  Pause,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Redo2,
  X,
} from 'lucide-react';
import {
  BACKGROUNDS,
  currentPage,
  dimensions,
  initialProject,
  blankPage,
  missingSlots,
  resolveSlot,
  OUTPUT_SIZES,
  SCENES,
  sceneSlot,
  SLOT_IDS,
  SPECS,
  safeName,
  projectAssetBytes,
} from './lib/project';
import type { Page, Project, SceneId, Slot } from './lib/project';
import { download, parseProjectFile, readAsset } from './lib/assets';
import { restoreProject, saveProject } from './lib/storage';
import { projectAt, totalDuration } from './lib/timeline';
import { BrowserControls } from './components/BrowserControls';
import { Stage } from './components/Stage';
import { Modal } from './components/Modal';
import { animationSize, exportProject, videoCapabilities } from './lib/export';
import type { ExportKind } from './lib/export';
import { captureBrowserProject } from './lib/browserCapture';
import { t, useI18n } from './i18n';
import type { DictionaryKey } from './i18n';

const REPO_URL = 'https://github.com/huanglizhuo/iPhoneDuoMock';
const THEME_KEY = 'duo-studio-theme';
type Theme = 'light' | 'dark';
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Storage unavailable; fall back to the system preference below.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

type Change = (p: Project) => void;
function Range({
  label,
  value,
  min,
  max,
  step = 0.01,
  display,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  display?: string;
  onChange: (n: number) => void;
  onCommit?: () => void;
}) {
  return (
    <label className="range-control">
      <span>
        {label}
        <output>{display ?? value}</output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
    </label>
  );
}
function Section({
  title,
  children,
  extra,
}: {
  title: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <section className="inspector-section">
      <div className="section-label">
        <h3>{title}</h3>
        {extra}
      </div>
      {children}
    </section>
  );
}
function SceneIcon({ scene, size = 27 }: { scene: SceneId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.45"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {scene === 'closed' ? (
        <rect x="11" y="5" width="15" height="26" rx="3" />
      ) : scene === 'portrait' ? (
        <>
          <rect x="8" y="3" width="21" height="30" rx="2.5" />
          <path d="M8 18h21" />
        </>
      ) : scene === 'landscape' ? (
        <>
          <rect x="3" y="7" width="30" height="22" rx="2.5" />
          <path d="M18 7v22" />
        </>
      ) : scene === 'seated' ? (
        <>
          <path d="m8 5 21 3-3 17-21-3zM5 22l7 8 20-3-6-2" />
        </>
      ) : scene === 'standing' ? (
        <>
          <path d="m4 28 12-23 17 24-17-2zM16 5v22" />
        </>
      ) : (
        <>
          <path d="m3 9 15-5v27L3 26zM18 4l15 5v17l-15 5" />
          <path d="M18 4v27" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const { lang, setLang } = useI18n();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#101419' : '#f6f7f9');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Ignore storage failures; the toggle still applies for this session.
    }
  }, [theme]);
  const [project, setProject] = useState<Project>(initialProject);
  const state = useRef(project);
  state.current = project;
  const [loaded, setLoaded] = useState(false),
    [saveState, setSaveState] = useState<{ key: DictionaryKey; error?: boolean }>({
      key: 'status.restoring',
    });
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [modal, setModal] = useState<'export' | 'help' | 'delete' | null>(null),
    [loadingFile, setLoadingFile] = useState(false);
  const [browserReload, setBrowserReload] = useState(0);
  const [slot, setSlot] = useState<Slot>('landscape');
  const [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0);
  const past = useRef<Project[]>([]),
    future = useRef<Project[]>([]),
    draftBase = useRef<Project | null>(null);
  const [, historyTick] = useState(0);
  const importInput = useRef<HTMLInputElement>(null);
  const failedRestore = useRef(false);
  const notify = (text: string, error = false) => setNotice({ text, error });
  useEffect(() => {
    let active = true;
    restoreProject()
      .then((p) => {
        if (active) {
          if (p) {
            setProject(p);
            state.current = p;
            setSlot(sceneSlot(p.scene));
          }
          setSaveState({ key: 'status.saved' });
          setLoaded(true);
        }
      })
      .catch(() => {
        if (active) {
          failedRestore.current = true;
          setLoaded(true);
          setSaveState({ key: 'status.restoreFailed', error: true });
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || failedRestore.current) return;
    let active = true;
    setSaveState({ key: 'status.saving' });
    const timer = setTimeout(
      () =>
        saveProject(project)
          .then(() => {
            if (active) setSaveState({ key: 'status.saved' });
          })
          .catch(() => {
            if (active) setSaveState({ key: 'status.saveFailed', error: true });
          }),
      650,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [project, loaded]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.error ? 9000 : 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const commit = () => {
    if (draftBase.current && draftBase.current !== state.current) {
      past.current = [...past.current, draftBase.current].slice(-30);
      future.current = [];
      historyTick((n) => n + 1);
    }
    draftBase.current = null;
  };
  const change = (recipe: Change, checkpoint = true) => {
    const previous = state.current;
    const next = structuredClone(previous);
    recipe(next);
    if (projectAssetBytes(next) > 75 * 1024 * 1024) {
      notify(t('notice.assetLimit'), true);
      return false;
    }
    if (checkpoint) {
      const base = draftBase.current ?? previous;
      past.current = [...past.current, base].slice(-30);
      draftBase.current = null;
      future.current = [];
      historyTick((n) => n + 1);
    } else if (!draftBase.current) draftBase.current = previous;
    state.current = next;
    setProject(next);
    return true;
  };
  const undo = () => {
    commit();
    const p = past.current.pop();
    if (p) {
      future.current.push(state.current);
      setProject(p);
      state.current = p;
      setPlaying(false);
      historyTick((n) => n + 1);
    }
  };
  const redo = () => {
    const p = future.current.pop();
    if (p) {
      past.current.push(state.current);
      setProject(p);
      state.current = p;
      setPlaying(false);
      historyTick((n) => n + 1);
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (modal || loadingFile || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => {
    if (!playing) return;
    const start = performance.now() - time * 1000,
      duration = totalDuration(project.animation);
    let frame = 0;
    const run = (now: number) => {
      const t = Math.min(duration, (now - start) / 1000);
      setTime(t);
      if (t >= duration) setPlaying(false);
      else frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
    // Start time is sampled when playback begins, not on every rendered frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, project.animation]);
  const page = currentPage(project),
    data = page.slots[slot],
    scene = SCENES.find((s) => s.id === project.scene)!;
  const duration = totalDuration(project.animation);
  const shown = projectAt(project, time);
  const output = dimensions(shown);
  const missing = missingSlots(shown);
  const selectScene = (id: SceneId) => {
    setPlaying(false);
    setTime(0);
    setSlot(sceneSlot(id));
    change((p) => {
      p.scene = id;
      if (p.mode === 'animation') p.mode = 'image';
      p.view.open = SCENES.find((s) => s.id === id)!.open;
    });
  };
  const modifyPage = (fn: (p: Page) => void, checkpoint = true) =>
    change((p) => fn(currentPage(p)), checkpoint);
  const modifySlot = (fn: (s: typeof data) => void, checkpoint = true) =>
    modifyPage((p) => fn(p.slots[slot]), checkpoint);
  const upload = async (files: FileList | null, targetSlot = slot) => {
    if (!files?.length) return;
    if (files.length > 1) {
      notify(t('notice.singleImage'), true);
      return;
    }
    const pageId = page.id;
    setLoadingFile(true);
    setPlaying(false);
    try {
      const asset = await readAsset(files[0]);
      const ok = change((p) => {
        const target = p.pages.find((x) => x.id === pageId);
        if (target) target.slots[targetSlot].asset = asset;
      });
      if (!ok) return;
      setSlot(targetSlot);
      notify(t('notice.replaced', { slot: SPECS[targetSlot].label }));
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoadingFile(false);
    }
  };
  const uploadBackground = async (files: FileList | null) => {
    if (!files?.length) return;
    setLoadingFile(true);
    try {
      const asset = await readAsset(files[0]);
      change((p) => {
        p.view.background = 'custom';
        p.view.backgroundImage = {
          name: asset.name,
          data: asset.data,
          width: asset.width,
          height: asset.height,
        };
      });
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoadingFile(false);
    }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    setLoadingFile(true);
    setPlaying(false);
    try {
      const p = await parseProjectFile(file);
      commit();
      past.current = [...past.current, state.current].slice(-30);
      future.current = [];
      state.current = p;
      setProject(p);
      setSlot(sceneSlot(p.scene));
      failedRestore.current = false;
      setTime(0);
      notify(t('notice.projectRestored'));
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoadingFile(false);
      if (importInput.current) importInput.current.value = '';
    }
  };
  const persist = () => {
    commit();
    download(
      new Blob([JSON.stringify(state.current)], { type: 'application/json' }),
      `${safeName(project.name)}.duo.json`,
    );
    notify(t('notice.projectDownloaded'));
  };
  const setAnimation = (fn: (a: Project['animation']) => void, checkpoint = true) => {
    setPlaying(false);
    setTime(0);
    change((p) => fn(p.animation), checkpoint);
  };
  const [advanced, setAdvanced] = useState(false);
  const changeMode = (mode: Project['mode']) => {
    setPlaying(false);
    change((p) => {
      p.mode = mode;
    });
  };
  const inputControls =
    project.workspace === 'browser' ? (
      <BrowserControls
        advanced={advanced}
        project={shown}
        onChange={(value) =>
          change((p) => {
            p.browser = value;
          })
        }
        onReload={() => setBrowserReload((n) => n + 1)}
      />
    ) : (
      <Section
        title={t('section.screen')}
        extra={
          <span className="count-label">
            {SLOT_IDS.filter((s) => page.slots[s].asset).length}/5
          </span>
        }
      >
        <div className="segmented fit-switch" aria-label={t('aria.pickScreen')}>
          <button
            className={slot === 'outer' || slot === 'standing' ? 'active' : ''}
            aria-pressed={slot === 'outer' || slot === 'standing'}
            onClick={() => setSlot('outer')}
          >
            {t('slotGroup.outer')}
          </button>
          <button
            className={slot !== 'outer' && slot !== 'standing' ? 'active' : ''}
            aria-pressed={slot !== 'outer' && slot !== 'standing'}
            onClick={() => setSlot('landscape')}
          >
            {t('slotGroup.inner')}
          </button>
        </div>
        <p className="export-hint">{t('hint.outerAuto')}</p>
        <select
          aria-label={t('aria.editSlot')}
          value={slot}
          onChange={(e) => setSlot(e.target.value as Slot)}
        >
          {SLOT_IDS.map((s) => (
            <option key={s} value={s}>
              {SPECS[s].label}
              {page.slots[s].asset ? ' ✓' : ''}
            </option>
          ))}
        </select>
        {resolveSlot(page, slot).leftHalf && (
          <p className="export-hint" role="status">
            {t('hint.outerDerived', { source: SPECS[resolveSlot(page, slot).source].label })}
          </p>
        )}
        <label
          className={`upload-zone ${data.asset ? 'has-image' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void upload(e.dataTransfer.files);
          }}
        >
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            aria-label={t('aria.uploadSlot', { slot: SPECS[slot].label })}
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = '';
            }}
          />
          {data.asset ? (
            <>
              <img src={data.asset.data} alt={t('aria.currentUpload')} />
              <span className="replace-label">
                <ImagePlus size={14} />
                {t('action.replaceShot')}
              </span>
            </>
          ) : (
            <>
              <span className="upload-icon">
                <ImagePlus size={22} />
              </span>
              <strong>{t('upload.title')}</strong>
              <span>{t('upload.drop')}</span>
              <small>{t('upload.formats')}</small>
            </>
          )}
        </label>
        <div className="asset-spec">
          <span>
            {SPECS[slot].width} × {SPECS[slot].height} px
          </span>
          {data.asset && (
            <button
              className="text-button danger"
              aria-label={t('aria.removeAsset')}
              onClick={() =>
                modifySlot((s) => {
                  s.asset = null;
                })
              }
            >
              <Trash2 size={12} />
              {t('action.remove')}
            </button>
          )}
        </div>
        {data.asset && (
          <>
            <p className="asset-filename" title={data.asset.name}>
              {data.asset.name} · {data.asset.width}×{data.asset.height}
            </p>
            <label className="field-label">
              {t('field.assetSource')}
              <select
                aria-label={t('field.assetSource')}
                value={data.asset.source}
                onChange={(e) =>
                  modifySlot((s) => {
                    if (s.asset)
                      s.asset.source = e.target.value as 'design' | 'simulator' | 'device';
                  })
                }
              >
                {(['design', 'simulator', 'device'] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`source.${v}`)}
                  </option>
                ))}
              </select>
            </label>
            {(data.asset.width !== SPECS[slot].width ||
              data.asset.height !== SPECS[slot].height) && (
              <p className="inline-warning">{t('hint.sizeMismatch')}</p>
            )}
          </>
        )}
        <div className="segmented fit-switch">
          {(['contain', 'cover'] as const).map((f) => (
            <button
              key={f}
              className={data.fit === f ? 'active' : ''}
              onClick={() =>
                modifySlot((s) => {
                  s.fit = f;
                })
              }
            >
              {t(`fit.${f}`)}
            </button>
          ))}
        </div>
        <p className="export-hint">
          {data.fit === 'cover' ? t('hint.fitCover') : t('hint.fitContain')}
        </p>
        {data.fit === 'cover' && (
          <>
            <Range
              label={t('range.cropX')}
              value={data.x}
              min={0}
              max={1}
              display={`${Math.round(data.x * 100)}%`}
              onChange={(n) =>
                modifySlot((s) => {
                  s.x = n;
                }, false)
              }
              onCommit={commit}
            />
            <Range
              label={t('range.cropY')}
              value={data.y}
              min={0}
              max={1}
              display={`${Math.round(data.y * 100)}%`}
              onChange={(n) =>
                modifySlot((s) => {
                  s.y = n;
                }, false)
              }
              onCommit={commit}
            />
            <Range
              label={t('range.zoom')}
              value={data.zoom}
              min={1}
              max={2}
              display={`${data.zoom.toFixed(2)}×`}
              onChange={(n) =>
                modifySlot((s) => {
                  s.zoom = n;
                }, false)
              }
              onCommit={commit}
            />
          </>
        )}
        <label className="switch-row">
          <span>
            <Sparkles size={13} />
            {t('switch.demo')}
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={project.demo}
            onChange={(e) =>
              change((p) => {
                p.demo = e.target.checked;
              })
            }
          />
        </label>
      </Section>
    );
  return (
    <div
      className={`app-shell ${advanced ? 'advanced-ui' : 'simple-ui'}`}
      onClickCapture={(event) => {
        // WebKit does not focus buttons on pointer clicks; retain a reliable dialog return target.
        const button = (event.target as Element).closest('button');
        if (button && !button.disabled) button.focus({ preventScroll: true });
      }}
    >
      <header className="topbar">
        <a className="brand" href="./" aria-label={t('aria.brandHome')}>
          <span className="brand-mark">
            <SceneIcon scene="fold" size={25} />
          </span>
          <span>
            Duo<span className="brand-light"> Studio</span>
          </span>
        </a>
        <span className="top-separator" />
        <div className="project-title">
          <input
            aria-label={t('aria.projectName')}
            value={project.name}
            maxLength={60}
            onChange={(e) =>
              change((p) => {
                p.name = e.target.value || t('project.unnamed');
              }, false)
            }
            onBlur={commit}
            disabled={!loaded || loadingFile}
          />
          <span className={saveState.error ? 'save-status error-text' : 'save-status'}>
            <span className="status-dot" />
            {t(saveState.key)}
          </span>
        </div>
        <div className="workspace-picker" aria-label={t('aria.workspace')}>
          <button
            disabled={!loaded || loadingFile}
            aria-pressed={project.workspace === 'screenshots'}
            className={project.workspace === 'screenshots' ? 'active' : ''}
            onClick={() => {
              setPlaying(false);
              change((p) => {
                p.workspace = 'screenshots';
              });
            }}
          >
            <Images size={19} />
            <span>
              <strong>{t('workspace.screenshots')}</strong>
            </span>
          </button>
          <button
            disabled={!loaded || loadingFile}
            aria-pressed={project.workspace === 'browser'}
            className={project.workspace === 'browser' ? 'active' : ''}
            onClick={() => {
              setPlaying(false);
              change((p) => {
                p.workspace = 'browser';
              });
            }}
          >
            <Globe size={19} />
            <span>
              <strong>{t('workspace.browser')}</strong>
            </span>
          </button>
        </div>
        <div className="top-actions">
          <button
            className="icon-button history-button"
            title={t('aria.undoTitle')}
            aria-label={t('aria.undo')}
            disabled={!past.current.length || loadingFile}
            onClick={undo}
          >
            <Undo2 size={17} />
          </button>
          <button
            className="icon-button history-button"
            title={t('aria.redoTitle')}
            aria-label={t('aria.redo')}
            disabled={!future.current.length || loadingFile}
            onClick={redo}
          >
            <Redo2 size={17} />
          </button>
          <span className="top-separator" />
          <button
            className="button quiet"
            disabled={loadingFile || !loaded}
            onClick={() => importInput.current?.click()}
          >
            <FolderOpen size={16} />
            <span>{t('action.openProject')}</span>
          </button>
          <button className="button quiet" disabled={loadingFile || !loaded} onClick={persist}>
            <ArrowDownToLine size={16} />
            <span>{t('action.saveProject')}</span>
          </button>
          <span className="top-separator" />
          <a
            className="icon-button"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label={t('aria.github')}
            title="GitHub"
          >
            <Github size={17} />
          </a>
          <button
            className="icon-button"
            aria-label={t('aria.themeToggle')}
            title={t('aria.themeToggle')}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <div className="lang-switch" role="group" aria-label={t('aria.langSwitch')}>
            <button
              aria-pressed={lang === 'en'}
              className={lang === 'en' ? 'active' : ''}
              onClick={() => setLang('en')}
            >
              EN
            </button>
            <button
              aria-pressed={lang === 'zh'}
              className={lang === 'zh' ? 'active' : ''}
              onClick={() => setLang('zh')}
            >
              中文
            </button>
          </div>
        </div>
        <input
          hidden
          ref={importInput}
          aria-label={t('aria.importFile')}
          type="file"
          accept=".json,.duo.json"
          onChange={(e) => void importFile(e.target.files?.[0])}
        />
      </header>
      <fieldset
        className={`workspace ${advanced ? 'is-advanced' : 'is-basic'}`}
        disabled={!loaded || loadingFile}
      >
        <aside className="sidebar">
          {project.workspace === 'screenshots' && (
            <>
              <div className="sidebar-title">
                <span>{t('sidebar.pages')}</span>
                <span>{String(project.pages.length).padStart(2, '0')}</span>
              </div>
              <div className="page-list">
                {project.pages.map((pg, index) => (
                  <button
                    key={pg.id}
                    className={`page-item ${pg.id === page.id ? 'selected' : ''}`}
                    onClick={() => {
                      setPlaying(false);
                      change((p) => {
                        p.activePageId = pg.id;
                      });
                    }}
                  >
                    <span className="page-mini">
                      <Layers size={18} />
                    </span>
                    <span>
                      <strong>{pg.name}</strong>
                      <small>
                        {t('sidebar.scenesUploaded', {
                          n: SLOT_IDS.filter((s) => pg.slots[s].asset).length,
                        })}
                      </small>
                    </span>
                    <span className="page-number">{String(index + 1).padStart(2, '0')}</span>
                  </button>
                ))}
              </div>
              <button
                className="add-page"
                disabled={project.pages.length >= 20}
                onClick={() =>
                  change((p) => {
                    const pg = blankPage(t('page.defaultName', { n: p.pages.length + 1 }));
                    p.pages.push(pg);
                    p.activePageId = pg.id;
                  })
                }
              >
                <Plus size={15} />
                {t('action.addPage')}
              </button>
              <div className="sidebar-rule" />
            </>
          )}
          <div className="sidebar-title">
            <span>{t('sidebar.scenes')}</span>
            <span>06</span>
          </div>
          <nav className="scene-list" aria-label={t('sidebar.scenes')}>
            {SCENES.map((s) => (
              <button
                key={s.id}
                className={`scene-item ${project.scene === s.id ? 'selected' : ''}`}
                aria-pressed={project.scene === s.id}
                onClick={() => selectScene(s.id)}
              >
                <SceneIcon scene={s.id} />
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.alt}</small>
                </span>
                {s.id !== 'fold' && page.slots[sceneSlot(s.id)].asset ? (
                  <Check className="scene-check" size={14} />
                ) : project.scene === s.id ? (
                  <span className="selected-indicator" />
                ) : null}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <button className="help-link" onClick={() => setModal('help')}>
              <Info size={14} />
              {t('sidebar.guide')}
            </button>
          </div>
        </aside>
        <main className="main-workspace">
          <div className="workspace-toolbar">
            {!advanced && (
              <nav className="quick-scenes" aria-label={t('sidebar.scenes')}>
                {SCENES.map((item) => (
                  <button
                    key={item.id}
                    aria-pressed={project.scene === item.id}
                    onClick={() => selectScene(item.id)}
                  >
                    <SceneIcon scene={item.id} size={22} />
                    <span>{item.name}</span>
                  </button>
                ))}
              </nav>
            )}
            <div className="mode-tabs" aria-label={t('aria.mode')}>
              {(
                [
                  { id: 'image', icon: Images },
                  { id: 'animation', icon: Film },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  aria-pressed={project.mode === m.id}
                  className={project.mode === m.id ? 'active' : ''}
                  onClick={() => changeMode(m.id)}
                >
                  <m.icon size={15} />
                  {project.workspace === 'browser'
                    ? m.id === 'image'
                      ? t('mode.browse')
                      : t('mode.demo')
                    : m.id === 'image'
                      ? t('mode.image')
                      : t('mode.animation')}
                </button>
              ))}
            </div>
            <button
              className="workspace-export button primary"
              disabled={loadingFile || !loaded}
              onClick={() => {
                commit();
                setPlaying(false);
                setModal('export');
              }}
            >
              <Download size={16} />
              {t('action.export')}
              <span className="export-dot" />
            </button>
            <button
              className={`advanced-toggle button quiet ${advanced ? 'active' : ''}`}
              aria-expanded={advanced}
              aria-controls="scene-settings"
              onClick={() => setAdvanced((value) => !value)}
            >
              <SlidersHorizontal size={15} />
              {t('inspector.advanced')}
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="primary-inputs">
            {project.workspace === 'browser' ? (
              inputControls
            ) : (
              <details className="screenshot-inputs">
                <summary>
                  <ImagePlus size={16} />
                  {t('upload.title')}
                  <ChevronDown size={14} />
                </summary>
                {inputControls}
              </details>
            )}
          </div>
          <div className="canvas-area" id="duo-preview">
            <div className="canvas-heading">
              <div>
                <h1>{project.workspace === 'browser' ? t('canvas.webPreview') : scene.name}</h1>
              </div>
              <button
                className="icon-button reset-view"
                title={t('aria.resetView')}
                aria-label={t('aria.resetView')}
                onClick={() =>
                  change((p) => {
                    p.view.yaw = 0;
                    p.view.pitch = 0;
                    p.view.scale = 1;
                  })
                }
              >
                <RotateCcw size={17} />
              </button>
            </div>
            <div className="artboard-wrap">
              <div className="artboard-meta">
                <span>
                  IPHONE DUO
                  <span className="meta-divider">/</span>
                  {scene.en.toUpperCase()}
                </span>
                {project.workspace === 'browser' ? (
                  <span className="uploaded-tag">{t('tag.liveWeb')}</span>
                ) : missing.length > 0 ? (
                  <span className={project.demo ? 'demo-tag' : 'missing-tag'}>
                    {project.demo ? t('tag.demo') : t('tag.missing')}
                  </span>
                ) : (
                  <span className="uploaded-tag">
                    <Check size={11} />
                    {t('tag.yours')}
                  </span>
                )}
              </div>
              <Stage
                project={shown}
                browserReload={browserReload}
                onView={(yaw, pitch) =>
                  change((p) => {
                    p.view.yaw = yaw;
                    p.view.pitch = pitch;
                  }, false)
                }
                onCommit={commit}
              />
              <div className="artboard-foot">
                <span>
                  {project.workspace === 'browser'
                    ? project.browser.interactive
                      ? t('hint.browserInteractive')
                      : t('hint.browserRotate')
                    : t('hint.dragCanvas')}
                </span>
                <span>
                  {output.width} × {output.height} px
                </span>
              </div>
            </div>
          </div>
          <div className="timeline-panel">
            <div className="timeline-top">
              <div className="timeline-title">
                <button
                  className="play-button"
                  aria-label={playing ? t('aria.pause') : t('aria.play')}
                  onClick={() => {
                    if (project.mode !== 'animation') changeMode('animation');
                    if (time >= duration) setTime(0);
                    setPlaying(!playing);
                  }}
                >
                  {playing ? (
                    <Pause size={17} fill="currentColor" />
                  ) : (
                    <Play size={17} fill="currentColor" />
                  )}
                </button>
                <div>
                  <strong>
                    {project.mode === 'animation'
                      ? t('mode.animation')
                      : t('timeline.foldProgress')}
                  </strong>
                  <small>
                    {project.mode === 'animation'
                      ? `${time.toFixed(1)} / ${duration.toFixed(1)} s`
                      : t('timeline.explore')}
                  </small>
                </div>
              </div>
              <div className="mobile-history">
                <button
                  className="icon-button"
                  aria-label={t('aria.undo')}
                  disabled={!past.current.length}
                  onClick={undo}
                >
                  <Undo2 size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t('aria.redo')}
                  disabled={!future.current.length}
                  onClick={redo}
                >
                  <Redo2 size={15} />
                </button>
              </div>
              <span className="angle-display">
                {Math.round(shown.view.open * 180)}
                <small>°</small>
              </span>
            </div>
            {project.mode === 'animation' ? (
              <input
                className="fold-slider"
                aria-label={t('aria.animationTime')}
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={time}
                onChange={(e) => {
                  setPlaying(false);
                  setTime(Number(e.target.value));
                }}
              />
            ) : (
              <input
                className="fold-slider"
                aria-label={t('timeline.foldProgress')}
                type="range"
                min="0"
                max="1"
                step="0.005"
                value={project.view.open}
                onChange={(e) => {
                  setPlaying(false);
                  change((p) => {
                    p.view.open = Number(e.target.value);
                  }, false);
                }}
                onPointerUp={commit}
                onKeyUp={commit}
                onBlur={commit}
              />
            )}
            <div className="timeline-labels">
              <span>{project.mode === 'animation' ? '00:00' : t('timeline.closed')}</span>
              <span>
                {project.mode === 'animation' ? t('timeline.frameByFrame') : t('timeline.half')}
              </span>
              <span>
                {project.mode === 'animation' ? `${duration.toFixed(1)} s` : t('timeline.open')}
              </span>
            </div>
          </div>
        </main>
        <aside className="inspector" id="scene-settings" hidden={!advanced}>
          <div className="inspector-heading">
            <SlidersHorizontal size={16} />
            <strong>{t('inspector.title')}</strong>
            <span>EDIT</span>
          </div>
          <Section title={t('section.appearance')}>
            <label className="field-label">{t('field.background')}</label>
            <div className="swatches">
              {BACKGROUNDS.map((b) => (
                <button
                  key={b.id}
                  className={`swatch ${project.view.background === b.id ? 'active' : ''}`}
                  style={{ '--swatch': b.color } as React.CSSProperties}
                  title={b.name}
                  aria-label={t('aria.background', { name: b.name })}
                  aria-pressed={project.view.background === b.id}
                  onClick={() =>
                    change((p) => {
                      p.view.background = b.id;
                    })
                  }
                >
                  {project.view.background === b.id && <Check size={15} style={{ color: b.ink }} />}
                </button>
              ))}
              <label
                className={`swatch custom-color-swatch ${
                  project.view.background === 'custom' && !project.view.backgroundImage
                    ? 'active'
                    : ''
                }`}
                title={t('aria.bgColor')}
                aria-label={t('aria.bgColor')}
                aria-pressed={project.view.background === 'custom' && !project.view.backgroundImage}
              >
                <input
                  type="color"
                  aria-label={t('aria.bgColor')}
                  value={project.view.backgroundColor}
                  onChange={(e) =>
                    change((p) => {
                      p.view.background = 'custom';
                      p.view.backgroundColor = e.target.value;
                    })
                  }
                />
              </label>
              <span>
                {project.view.background === 'custom'
                  ? t('bg.custom')
                  : BACKGROUNDS.find((b) => b.id === project.view.background)!.name}
              </span>
            </div>
            <div className="bg-custom-row">
              <label className="button quiet bg-image-button">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  aria-label={t('aria.bgImage')}
                  onChange={(e) => {
                    void uploadBackground(e.target.files);
                    e.target.value = '';
                  }}
                />
                <ImagePlus size={14} />
                {t('action.uploadBgImage')}
              </label>
              {project.view.backgroundImage && (
                <button
                  className="text-button danger"
                  aria-label={t('action.removeBgImage')}
                  onClick={() =>
                    change((p) => {
                      p.view.backgroundImage = null;
                    })
                  }
                >
                  <Trash2 size={12} />
                  {t('action.removeBgImage')}
                </button>
              )}
            </div>
            <p className="export-hint">
              {project.view.backgroundImage
                ? t('hint.bgImage', { w: output.width, h: output.height })
                : t('hint.bgCustom')}
            </p>
            {project.mode === 'image' && (
              <label className="switch-row">
                <span>
                  {project.workspace === 'browser'
                    ? t('switch.transparentBrowser')
                    : t('switch.transparent')}
                </span>
                <input
                  type="checkbox"
                  checked={project.view.transparent}
                  onChange={(e) =>
                    change((p) => {
                      p.view.transparent = e.target.checked;
                    })
                  }
                />
              </label>
            )}
            <label className="field-label">
              {t('field.body')}
              <div className="segmented">
                <button
                  className={project.view.body === 'silver' ? 'active' : ''}
                  onClick={() =>
                    change((p) => {
                      p.view.body = 'silver';
                    })
                  }
                >
                  <span className="metal-dot silver" />
                  {t('body.silver')}
                </button>
                <button
                  className={project.view.body === 'dark' ? 'active' : ''}
                  onClick={() =>
                    change((p) => {
                      p.view.body = 'dark';
                    })
                  }
                >
                  <span className="metal-dot dark" />
                  {t('body.dark')}
                </button>
              </div>
            </label>
            <Range
              label={t('range.deviceSize')}
              value={project.view.scale}
              min={0.65}
              max={1.25}
              display={`${Math.round(project.view.scale * 100)}%`}
              onChange={(n) =>
                change((p) => {
                  p.view.scale = n;
                }, false)
              }
              onCommit={commit}
            />
            <details className="advanced">
              <summary>
                {t('details.camera')}
                <ChevronDown size={13} />
              </summary>
              <Range
                label={t('range.yaw')}
                value={project.view.yaw}
                min={-0.9}
                max={0.9}
                display={`${Math.round((project.view.yaw * 180) / Math.PI)}°`}
                onChange={(n) =>
                  change((p) => {
                    p.view.yaw = n;
                  }, false)
                }
                onCommit={commit}
              />
              <Range
                label={t('range.pitch')}
                value={project.view.pitch}
                min={-0.6}
                max={0.6}
                display={`${Math.round((project.view.pitch * 180) / Math.PI)}°`}
                onChange={(n) =>
                  change((p) => {
                    p.view.pitch = n;
                  }, false)
                }
                onCommit={commit}
              />
            </details>
          </Section>
          {project.mode === 'animation' && (
            <Section title={t('section.animation')}>
              <label className="field-label">
                {t('field.action')}
                <select
                  aria-label={t('aria.animationAction')}
                  value={project.animation.kind}
                  onChange={(e) =>
                    setAnimation((a) => {
                      a.kind = e.target.value as 'open' | 'close' | 'loop';
                    })
                  }
                >
                  <option value="loop">{t('actionKind.loop')}</option>
                  <option value="open">{t('actionKind.open')}</option>
                  <option value="close">{t('actionKind.close')}</option>
                </select>
              </label>
              <Range
                label={t('range.duration')}
                value={project.animation.duration}
                min={2}
                max={10}
                step={0.5}
                display={`${project.animation.duration} s`}
                onChange={(n) =>
                  setAnimation((a) => {
                    a.duration = n;
                  }, false)
                }
                onCommit={commit}
              />
              <Range
                label={t('range.startHold')}
                value={project.animation.startHold}
                min={0}
                max={2}
                step={0.1}
                display={`${project.animation.startHold} s`}
                onChange={(n) =>
                  setAnimation((a) => {
                    a.startHold = n;
                  }, false)
                }
                onCommit={commit}
              />
              <Range
                label={t('range.endHold')}
                value={project.animation.endHold}
                min={0}
                max={2}
                step={0.1}
                display={`${project.animation.endHold} s`}
                onChange={(n) =>
                  setAnimation((a) => {
                    a.endHold = n;
                  }, false)
                }
                onCommit={commit}
              />
              <label className="field-label">
                {t('field.easing')}
                <select
                  aria-label={t('field.easing')}
                  value={project.animation.easing}
                  onChange={(e) =>
                    setAnimation((a) => {
                      a.easing = e.target.value as 'smooth' | 'linear';
                    })
                  }
                >
                  <option value="smooth">{t('easing.smooth')}</option>
                  <option value="linear">{t('easing.linear')}</option>
                </select>
              </label>
              <p className="helper-text">
                {project.workspace === 'browser'
                  ? t('hint.animationBrowser')
                  : t('hint.animationShots')}
              </p>
            </Section>
          )}
          <Section
            title={
              project.workspace === 'browser' ? t('section.previewCanvas') : t('section.output')
            }
          >
            <select
              aria-label={t('section.output')}
              value={project.output.size}
              onChange={(e) =>
                change((p) => {
                  p.output.size = e.target.value as Project['output']['size'];
                })
              }
            >
              {Object.entries(OUTPUT_SIZES).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
            <p className="helper-text">
              {project.workspace === 'browser'
                ? t('hint.outputBrowser')
                : project.mode === 'animation'
                  ? t('hint.outputAnimation')
                  : t('hint.outputImage')}
            </p>
          </Section>
          {project.workspace === 'screenshots' && (
            <Section title={t('section.demo')}>
              <p className="helper-text">{t('demo.description')}</p>
              <p className="helper-text">{t('demo.note')}</p>
              <a
                className="text-button"
                href="https://www.apple.com/sg/iphone-duo/"
                target="_blank"
                rel="noreferrer"
              >
                {t('demo.link')}
              </a>
            </Section>
          )}
          {project.workspace === 'screenshots' && (
            <>
              <Section title={t('section.page')}>
                <label className="field-label">
                  {t('field.pageName')}
                  <input
                    aria-label={t('field.pageName')}
                    maxLength={40}
                    value={page.name}
                    onChange={(e) =>
                      modifyPage((p) => {
                        p.name = e.target.value || t('page.unnamed');
                      }, false)
                    }
                    onBlur={commit}
                  />
                </label>
                <div className="page-tools">
                  <button
                    className="button quiet"
                    disabled={project.pages.length >= 20}
                    onClick={() =>
                      change((p) => {
                        const copy = structuredClone(currentPage(p));
                        copy.id = crypto.randomUUID();
                        copy.name = t('page.copyOf', { name: copy.name.slice(0, 35) });
                        p.pages.push(copy);
                        p.activePageId = copy.id;
                      })
                    }
                  >
                    <Copy size={14} />
                    {t('action.duplicatePage')}
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label={t('aria.deletePage')}
                    disabled={project.pages.length === 1}
                    onClick={() => setModal('delete')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Section>
            </>
          )}
        </aside>
      </fieldset>
      {notice && (
        <div
          className={`toast ${notice.error ? 'error' : ''}`}
          role={notice.error ? 'alert' : 'status'}
        >
          {notice.error ? <Info size={17} /> : <Check size={17} />}
          <span>{notice.text}</span>
          <button aria-label={t('aria.closeNotice')} onClick={() => setNotice(null)}>
            <X size={14} />
          </button>
        </div>
      )}
      {loadingFile && (
        <div className="loading-overlay" role="status">
          <LoaderCircle className="spin" />
          {t('status.readingFile')}
        </div>
      )}
      {modal === 'export' && (
        <ExportModal project={shown} onClose={() => setModal(null)} initialRawSlot={slot} />
      )}
      {modal === 'delete' && (
        <Modal title={t('modal.deleteTitle')} onClose={() => setModal(null)}>
          <p className="modal-copy">{t('modal.deleteBody', { name: page.name })}</p>
          <div className="modal-actions">
            <button className="button" onClick={() => setModal(null)}>
              {t('action.keepPage')}
            </button>
            <button
              className="button danger-fill"
              onClick={() => {
                change((p) => {
                  p.pages = p.pages.filter((x) => x.id !== page.id);
                  p.activePageId = p.pages[0].id;
                });
                setModal(null);
              }}
            >
              {t('action.deletePage')}
            </button>
          </div>
        </Modal>
      )}
      {modal === 'help' && (
        <Modal title={t('help.title')} onClose={() => setModal(null)}>
          <div className="guide">
            <ol>
              <li>
                <strong>{t('help.step1Title')}</strong>
                <p>{t('help.step1Body')}</p>
              </li>
              <li>
                <strong>{t('help.step2Title')}</strong>
                <p>{t('help.step2Body')}</p>
              </li>
              <li>
                <strong>{t('help.step3Title')}</strong>
                <p>{t('help.step3Body')}</p>
              </li>
            </ol>
            <div className="guide-note">
              <ShieldCheck size={19} />
              <p>{t('help.privacyNote')}</p>
            </div>
            <p>{t('help.assetsNote')}</p>
            <p>{t('help.storeNote')}</p>
            <a
              href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/"
              target="_blank"
              rel="noreferrer"
            >
              {t('help.appleSpecs')}
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExportModal({
  project: inputProject,
  onClose,
  initialRawSlot,
}: {
  project: Project;
  onClose: () => void;
  initialRawSlot: Slot;
}) {
  // Freeze the document for the whole export session; autosave/UI renders must not abort an encoder.
  const [project] = useState(inputProject);
  const [kind, setKind] = useState<ExportKind>(project.mode === 'animation' ? 'mp4' : 'png'),
    [rawSlot, setRawSlot] = useState(initialRawSlot);
  const [capabilities, setCapabilities] = useState<{ mp4: boolean; webm: boolean } | null>(null);
  const [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState('');
  const [result, setResult] = useState<{ url: string; name: string; blob: Blob } | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    videoCapabilities(project)
      .then((c) => {
        if (active) setCapabilities(c);
      })
      .catch(() => {
        if (active) setCapabilities({ mp4: false, webm: false });
      });
    return () => {
      active = false;
      abort.current?.abort();
    };
  }, [project]);
  useEffect(
    () => () => {
      if (result) URL.revokeObjectURL(result.url);
    },
    [result],
  );
  const animation = ['mp4', 'webm', 'gif'].includes(kind);
  const browser = project.workspace === 'browser';
  const missing = browser
    ? []
    : missingSlots(animation ? { ...project, mode: 'animation' } : project);
  const unavailable =
    kind === 'mp4'
      ? capabilities?.mp4 === false
      : kind === 'webm'
        ? capabilities?.webm === false
        : false;
  const waiting = (kind === 'mp4' || kind === 'webm') && !capabilities;
  const spec = animation
    ? animationSize(project, kind === 'gif')
    : kind === 'raw'
      ? SPECS[rawSlot]
      : dimensions(project);
  const run = async () => {
    setBusy(true);
    setProgress(0);
    setError('');
    setResult(null);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const exportInput = browser
        ? await captureBrowserProject(project, controller.signal, (value) =>
            setProgress(value * 0.25),
          )
        : project;
      const r = await exportProject(
        exportInput,
        kind,
        controller.signal,
        (value) => setProgress((browser ? 0.25 : 0) + value * (browser ? 0.75 : 1)),
        rawSlot,
      );
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(r.blob);
      setResult({ ...r, url });
      download(r.blob, r.name);
    } catch (e) {
      setError((e as Error).name === 'AbortError' ? t('export.cancelled') : (e as Error).message);
    } finally {
      setBusy(false);
      abort.current = null;
    }
  };
  return (
    <Modal
      title={t('export.title')}
      onClose={() => {
        abort.current?.abort();
        onClose();
      }}
    >
      <div className="export-body">
        <p className="modal-subtitle">{t('export.subtitle')}</p>
        {browser && (
          <div className="guide-note browser-capture-note">
            <ShieldCheck size={19} />
            <div>
              <strong>{t('export.browserPermissionTitle')}</strong>
              <p>{t('export.browserPermissionBody')}</p>
            </div>
          </div>
        )}
        <fieldset disabled={busy} className="export-options">
          <div className="export-format-grid">
            {(
              [
                { id: 'png', title: t('export.png'), note: t('export.pngNote'), icon: Images },
                { id: 'mp4', title: t('export.mp4'), note: t('export.mp4Note'), icon: Film },
                { id: 'webm', title: t('export.webm'), note: t('export.webmNote'), icon: Play },
                { id: 'gif', title: t('export.gif'), note: t('export.gifNote'), icon: Sparkles },
                { id: 'zip', title: t('export.zip'), note: t('export.zipNote'), icon: Layers },
                { id: 'raw', title: t('export.raw'), note: t('export.rawNote'), icon: Expand },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                className={`format-card ${kind === f.id ? 'selected' : ''}`}
                onClick={() => {
                  setKind(f.id);
                  setError('');
                  setResult(null);
                }}
              >
                <f.icon size={20} />
                <strong>{f.title}</strong>
                <small>{f.note}</small>
                {kind === f.id && <Check className="format-check" size={14} />}
              </button>
            ))}
          </div>
          {kind === 'raw' && (
            <label className="field-label">
              {t('field.rawSlot')}
              <select value={rawSlot} onChange={(e) => setRawSlot(e.target.value as Slot)}>
                {SLOT_IDS.map((s) => (
                  <option value={s} key={s}>
                    {SPECS[s].label}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
        <div className="export-summary">
          <span>{kind === 'zip' ? t('export.scenes') : t('section.output')}</span>
          <strong>
            {kind === 'zip'
              ? t('export.sceneCount', {
                  count: browser
                    ? SLOT_IDS.length
                    : project.pages.reduce(
                        (n, p) => n + SLOT_IDS.filter((s) => resolveSlot(p, s).data.asset).length,
                        0,
                      ),
                })
              : `${spec.width} × ${spec.height} px`}
          </strong>
          {animation && (
            <>
              <span>{t('export.duration')}</span>
              <strong>
                {t('export.durationValue', {
                  seconds: totalDuration(project.animation).toFixed(1),
                })}
              </strong>
            </>
          )}
        </div>
        {missing.length > 0 && !['raw', 'zip'].includes(kind) && (
          <p className={project.demo ? 'export-hint' : 'inline-warning'}>
            {project.demo
              ? t('export.demoNotice')
              : t('export.missing', {
                  slots: missing.map((s) => SPECS[s].label).join(t('misc.listJoin')),
                })}
          </p>
        )}
        {animation && <p className="export-hint">{t('export.notStorePreview')}</p>}
        {waiting && <p className="export-hint">{t('export.detecting')}</p>}
        {unavailable && (
          <p className="inline-warning">
            {t('export.codecUnavailable', {
              formats:
                kind === 'mp4' && capabilities?.webm
                  ? t('export.formatsWebmOrGif')
                  : t('export.formatsGif'),
            })}
          </p>
        )}
        {busy && (
          <div className="export-progress" role="status">
            <div>
              <LoaderCircle size={15} className="spin" />
              <span>{t('export.generating', { percent: Math.round(progress * 100) })}</span>
            </div>
            <progress max="1" value={progress} />
            <small>{t('export.progressNote')}</small>
          </div>
        )}
        {error && (
          <p className="export-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <div className="export-success" role="status">
            <Check size={17} />
            <div>
              <strong>{t('export.done')}</strong>
              <small>
                {(result.blob.size / 1024 / 1024).toFixed(2)} MB · {result.name}
              </small>
              <a href={result.url} download={result.name}>
                {t('export.downloadAgain')}
              </a>
            </div>
          </div>
        )}
        {result && (kind === 'mp4' || kind === 'webm') && (
          <video
            className="export-preview"
            src={result.url}
            controls
            aria-label={t('aria.exportPreview')}
          />
        )}
        <div className="modal-actions">
          {busy ? (
            <button className="button" onClick={() => abort.current?.abort()}>
              {t('action.cancelExport')}
            </button>
          ) : (
            <button className="button" onClick={onClose}>
              {t('action.backToEdit')}
            </button>
          )}
          <button
            className="button primary"
            disabled={busy || unavailable || waiting}
            onClick={() => void run()}
          >
            {busy ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}{' '}
            {busy
              ? t('export.busy')
              : result
                ? t('export.regenerate')
                : browser && error
                  ? t('export.retryCapture')
                  : browser
                    ? t('export.allowAndGenerate')
                    : t('export.generate')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
