import { persistentAtom } from '@nanostores/persistent';
import type { ThemeMode } from '@/types/tool';

/**
 * Theme store — persisted to localStorage as 'app:theme'
 *
 * Detection priority:
 * 1. LocalStorage (via nanostores/persistent)
 * 2. prefers-color-scheme + prefers-contrast
 * 3. Default: 'dark'
 */
export const $theme = persistentAtom<ThemeMode>('app:theme', detectInitialTheme());

/**
 * Detect the initial theme based on system preferences.
 */
function detectInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const prefersHighContrast = window.matchMedia(
    '(prefers-contrast: more)',
  ).matches;

  if (prefersDark && prefersHighContrast) return 'dark-hc';
  if (prefersDark) return 'dark';
  if (prefersHighContrast) return 'light-hc';
  return 'light';
}

/**
 * Apply the theme to the document. Call this on initial load and whenever
 * the theme changes.
 */
export function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}
