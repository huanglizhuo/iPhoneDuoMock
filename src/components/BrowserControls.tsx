import { useEffect, useState } from 'react';
import { ExternalLink, Globe, RotateCcw } from 'lucide-react';
import type { Project } from '../lib/project';
import { websiteUrl, browserViewport } from '../lib/browser';
import { t } from '../i18n';

export function BrowserControls({
  project,
  onChange,
  onReload,
}: {
  project: Project;
  onChange: (value: Project['browser']) => void;
  onReload: () => void;
}) {
  const [draft, setDraft] = useState(project.browser.url),
    [error, setError] = useState('');
  useEffect(() => setDraft(project.browser.url), [project.browser.url]);
  const inner = browserViewport(project, true),
    outer = browserViewport(project, false);
  return (
    <div className="browser-controls">
      <div className="browser-intro">
        <Globe size={22} />
        <div>
          <strong>{t('browser.site')}</strong>
        </div>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const url = websiteUrl(draft);
            if (url && new URL(url).origin === location.origin)
              throw new Error(t('browser.sameOrigin'));
            onChange({ ...project.browser, url });
            setDraft(url);
            setError('');
            onReload();
            if (window.innerWidth <= 900)
              document.getElementById('duo-preview')?.scrollIntoView({ block: 'start' });
          } catch (e) {
            setError((e as Error).message || t('browser.invalidUrl'));
          }
        }}
      >
        <label className="field-label">
          {t('browser.address')}
          <input
            id="browser-address"
            type="text"
            inputMode="url"
            aria-label={t('browser.address')}
            placeholder="https://example.com"
            value={draft}
            maxLength={4096}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <div className="browser-actions">
          <button className="button primary" type="submit">
            {t('browser.open')}
          </button>
          <button
            className="button quiet"
            type="button"
            aria-label={t('aria.reload')}
            onClick={onReload}
          >
            <RotateCcw size={16} />
            {t('browser.reload')}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="inline-warning">
          {error}
        </p>
      )}
      <div className="browser-links">
        <button
          type="button"
          className="text-button"
          onClick={() => {
            onChange({ ...project.browser, url: '' });
            setError('');
            onReload();
          }}
        >
          {t('browser.useDemo')}
        </button>
        {project.browser.url && (
          <a href={project.browser.url} target="_blank" rel="noreferrer" className="text-button">
            {t('browser.openOriginal')} <ExternalLink size={12} />
          </a>
        )}
      </div>
      <div className="viewport-sizes">
        <span>
          {t('browser.innerScreen')} {inner.width} × {inner.height}
        </span>
        <span>
          {t('browser.outerScreen')} {outer.width} × {outer.height}
        </span>
        <small>{t('browser.cssNote')}</small>
      </div>
      <label className="field-label">
        {t('browser.viewport')}
        <select
          aria-label={t('browser.pixelRatio')}
          value={project.browser.pixelRatio}
          onChange={(e) =>
            onChange({ ...project.browser, pixelRatio: Number(e.target.value) as 1 | 2 | 3 })
          }
        >
          <option value="3">{t('browser.ratio3')}</option>
          <option value="2">{t('browser.ratio2')}</option>
          <option value="1">{t('browser.ratio1')}</option>
        </select>
      </label>
      <div className="segmented fit-switch">
        <button
          type="button"
          className={project.browser.interactive ? 'active' : ''}
          aria-pressed={project.browser.interactive}
          onClick={() => onChange({ ...project.browser, interactive: true })}
        >
          {t('browser.interact')}
        </button>
        <button
          type="button"
          className={!project.browser.interactive ? 'active' : ''}
          aria-pressed={!project.browser.interactive}
          onClick={() => onChange({ ...project.browser, interactive: false })}
        >
          {t('browser.rotate')}
        </button>
      </div>
      <p className="helper-text">{t('browser.modeHint')}</p>
      {project.scene !== 'fold' && project.view.open < 0.99 && (
        <p className="helper-text">{t('browser.splitHint')}</p>
      )}
      <details className="browser-help">
        <summary>{t('browser.helpSummary')}</summary>
        <p>{t('browser.helpBlank')}</p>
        <p>{t('browser.helpSync')}</p>
        <p>{t('browser.helpExport')}</p>
      </details>
    </div>
  );
}
