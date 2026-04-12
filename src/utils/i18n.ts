import type { Locale } from '@/types/tool';
import { storageGet } from '@/utils/storage';

// Translation dictionaries loaded eagerly for performance
const translations: Record<Locale, Record<string, unknown>> = {
  es: {},
  en: {},
};

let initialized = false;

/**
 * Load all translation files. Should be called once at app startup.
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;

  try {
    const esUi = await import('@/i18n/es/ui.json');
    const esTools = await import('@/i18n/es/tools.json');
    const enUi = await import('@/i18n/en/ui.json');
    const enTools = await import('@/i18n/en/tools.json');

    translations.es = { ui: esUi.default, tools: esTools.default };
    translations.en = { ui: enUi.default, tools: enTools.default };
    initialized = true;
  } catch (error) {
    console.error('[i18n] Failed to load translations:', error);
  }
}

/**
 * Get the current locale from storage or default.
 */
export function getCurrentLocale(): Locale {
  const result = storageGet<Locale>('app:lang');
  if (result.ok && (result.data === 'es' || result.data === 'en')) {
    return result.data;
  }
  return 'es';
}

/**
 * Translate a key. Supports dot notation: t('ui.sidebar.title')
 * Falls back to the key itself if not found.
 */
export function t(key: string, locale?: Locale): string {
  const lang = locale ?? getCurrentLocale();
  const parts = key.split('.');

  if (parts.length < 2) return key;

  const namespace = parts[0];
  const translationKey = parts.slice(1).join('.');

  const ns = translations[lang]?.[namespace];
  if (!ns) return key;

  // Support nested keys
  const value = translationKey.split('.').reduce<unknown>((obj, k) => {
    if (obj && typeof obj === 'object' && k in obj) {
      return (obj as Record<string, unknown>)[k];
    }
    return undefined;
  }, ns);

  if (typeof value === 'string') return value;

  // Fallback to default locale
  if (lang !== 'es') {
    return t(key, 'es');
  }

  return key;
}
