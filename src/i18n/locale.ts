import locales from './locales.json';
export { locales };
export type Lang = keyof typeof locales;
export const languages = Object.keys(locales) as Lang[];
export const STORAGE_KEY = 'duo-studio-lang';
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && Object.hasOwn(locales, value);
}
/** An explicit localized URL wins; the neutral root uses saved/browser preferences. */
export function resolveLanguage(path: string, saved: unknown, preferred: readonly string[]): Lang {
  const explicit = /^\/(en|zh|ja|fr)(?:\/|$)/.exec(path)?.[1];
  if (isLang(explicit)) return explicit;
  if (isLang(saved)) return saved;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (isLang(base)) return base;
  }
  return 'en';
}
export function initialLanguage(): Lang {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* Storage is optional. */
  }
  return resolveLanguage(
    typeof location === 'undefined' ? '/' : location.pathname,
    saved,
    typeof navigator === 'undefined'
      ? []
      : navigator.languages?.length
        ? navigator.languages
        : [navigator.language],
  );
}
