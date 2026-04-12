import type { Locale } from '@/types/tool';
import { storageGet, storageSet } from '@/utils/storage';

const SUPPORTED_LOCALES: Locale[] = ['es', 'en'];

/**
 * Detect the user's preferred language based on navigator.language.
 * Returns the matched locale or the default ('es').
 */
export function detectLanguage(): Locale {
  // First check if there's a persisted preference
  const stored = storageGet<Locale>('app:lang');
  if (stored.ok && SUPPORTED_LOCALES.includes(stored.data)) {
    return stored.data;
  }

  // Detect from browser
  if (typeof navigator === 'undefined') return 'es';

  const browserLang = navigator.language.toLowerCase();

  // Exact match (e.g., 'en' or 'es')
  for (const locale of SUPPORTED_LOCALES) {
    if (browserLang === locale) return locale;
  }

  // Prefix match (e.g., 'en-US' → 'en', 'es-MX' → 'es')
  const prefix = browserLang.split('-')[0];
  for (const locale of SUPPORTED_LOCALES) {
    if (prefix === locale) return locale;
  }

  return 'es';
}

/**
 * Persist the selected language preference.
 */
export async function persistLanguage(locale: Locale): Promise<void> {
  await storageSet('app:lang', locale);
}
