import { describe, it, expect, vi } from 'vitest';
import { resolveLanguage, initialLanguage, languages } from './locale';
import { dictionaries } from './index';
import { en } from './en';

describe('language selection', () => {
  it.each([
    ['/', null, ['fr-CA', 'en-US'], 'fr'],
    ['/', null, ['ja-JP'], 'ja'],
    ['/', null, ['zh-TW'], 'zh'],
    ['/', null, ['de-DE', 'fr-FR'], 'fr'],
    ['/', null, ['de-DE'], 'en'],
    ['/', null, [], 'en'],
    ['/', 'zh', ['fr-FR'], 'zh'],
    ['/', 'invalid', ['ja'], 'ja'],
    ['/fr/', 'ja', ['zh-CN'], 'fr'],
    ['/ja/', 'en', ['fr-FR'], 'ja'],
    ['/en/', 'fr', ['zh-CN'], 'en'],
    ['/', 'constructor', ['FR_ca'], 'fr'],
  ])('resolves %s with saved %s and browser %j', (path, saved, preferred, expected) => {
    expect(resolveLanguage(path, saved, preferred as string[])).toBe(expected);
  });
  it('detects browser language even when storage is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem() {
        throw new Error('blocked');
      },
    });
    vi.stubGlobal('navigator', { languages: ['ja-JP'], language: 'ja-JP' });
    vi.stubGlobal('location', { pathname: '/' });
    try {
      expect(initialLanguage()).toBe('ja');
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('covers every translation and interpolation token in all four languages', () => {
    const keys = Object.keys(en).sort();
    const tokens = (text: string) => [...text.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).sort();
    for (const lang of languages) {
      expect(Object.keys(dictionaries[lang]).sort()).toEqual(keys);
      for (const key of keys as (keyof typeof en)[]) {
        expect(dictionaries[lang][key].trim(), `${lang}.${key}`).not.toBe('');
        expect(tokens(dictionaries[lang][key]), `${lang}.${key}`).toEqual(tokens(en[key]));
      }
    }
  });
});
