import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from './en';
import { zh } from './zh';
import type { DictionaryKey } from './en';

import { ja } from './ja';
import { fr } from './fr';
import { initialLanguage, locales, STORAGE_KEY } from './locale';
import type { Lang } from './locale';
export { locales, languages } from './locale';
export type { Lang, DictionaryKey };
export const dictionaries: Record<Lang, Record<DictionaryKey, string>> = { en, zh, ja, fr };

/** Modules outside React (lib error messages, project defaults) read the locale from here. */
let currentLang: Lang = initialLanguage();

export function t(key: DictionaryKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[currentLang][key] ?? (en as Record<string, string>)[key] ?? key;
  if (vars)
    for (const [name, value] of Object.entries(vars))
      text = text.replaceAll(`{${name}}`, String(value));
  return text;
}

const I18nContext = createContext<{ lang: Lang; setLang: (lang: Lang) => void }>({
  lang: 'en',
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(currentLang);
  const setLang = useCallback((next: Lang) => {
    currentLang = next;
    const url = new URL(location.href);
    url.pathname = locales[next].path;
    history.replaceState(null, '', url);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the switch still applies for this session.
    }
    setLangState(next);
  }, []);
  useEffect(() => {
    const meta = locales[lang];
    document.documentElement.lang = meta.htmlLang;
    document.title = meta.title;
    const structured = document.querySelector('script[type="application/ld+json"]');
    if (structured?.textContent) {
      const app = JSON.parse(structured.textContent);
      app.url = 'https://iduo.clothpath.com' + meta.path;
      app.description = meta.description;
      app.inLanguage = meta.htmlLang;
      structured.textContent = JSON.stringify(app);
    }
    for (const [selector, value] of [
      ['meta[name="description"]', meta.description],
      ['meta[property="og:title"]', meta.title],
      ['meta[property="og:description"]', meta.description],
      ['meta[property="og:locale"]', meta.ogLocale],
      ['meta[property="og:url"]', 'https://iduo.clothpath.com' + meta.path],
      ['meta[name="twitter:title"]', meta.title],
      ['meta[name="twitter:description"]', meta.description],
    ])
      document.querySelector(selector)?.setAttribute('content', value);
    document
      .querySelector('link[rel="canonical"]')
      ?.setAttribute('href', 'https://iduo.clothpath.com' + meta.path);
  }, [lang]);
  return <I18nContext.Provider value={{ lang, setLang }}>{children}</I18nContext.Provider>;
}

/** Subscribe components to locale changes; call t() freely in the same render. */
export function useI18n() {
  return useContext(I18nContext);
}
