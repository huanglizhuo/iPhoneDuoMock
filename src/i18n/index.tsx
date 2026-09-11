import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { en } from './en';
import { zh } from './zh';
import type { DictionaryKey } from './en';

export type { DictionaryKey };
export type Lang = 'en' | 'zh';
const STORAGE_KEY = 'duo-studio-lang';
const dictionaries: Record<Lang, Record<string, string>> = { en, zh };

function storedLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    // Storage unavailable (private mode, tests); stay on the default locale.
  }
  return 'en';
}

/** Modules outside React (lib error messages, project defaults) read the locale from here. */
let currentLang: Lang = storedLang();

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
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the switch still applies for this session.
    }
    setLangState(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);
  return <I18nContext.Provider value={{ lang, setLang }}>{children}</I18nContext.Provider>;
}

/** Subscribe components to locale changes; call t() freely in the same render. */
export function useI18n() {
  return useContext(I18nContext);
}
