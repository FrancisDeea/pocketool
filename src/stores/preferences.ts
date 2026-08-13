import { atom } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import type { Locale } from '@/types/tool';

/**
 * User language preference — persisted to localStorage as 'app:lang'
 */
export const $locale = persistentAtom<Locale>('app:lang', 'es');

/**
 * Sidebar collapsed state — persisted
 */
export const $sidebarCollapsed = persistentAtom<string>('app:sidebar-collapsed', 'false');

/**
 * Zen Mode state — Not persisted to avoid confusion on page load
 */
export const $zenMode = atom<boolean>(false);

/**
 * Browser Fullscreen state — Synced with browser API
 */
export const $isFullscreen = atom<boolean>(false);

export function isSidebarCollapsed(): boolean {
  return $sidebarCollapsed.get() === 'true';
}

export function toggleSidebar(): void {
  $sidebarCollapsed.set($sidebarCollapsed.get() === 'true' ? 'false' : 'true');
}

export function toggleZenMode(): void {
  $zenMode.set(!$zenMode.get());
}

export async function toggleFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
      $isFullscreen.set(true);
    } catch (err) {
      console.error('Error attempting to enable fullscreen:', err);
    }
  } else {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      $isFullscreen.set(false);
    }
  }
}
