import { persistentAtom } from '@nanostores/persistent';
import type { Locale } from '@/types/tool';

/**
 * User language preference — persisted to localStorage as 'app:lang'
 */
export const $locale = persistentAtom<Locale>('app:lang', 'es');

/**
 * Sidebar collapsed state — persisted
 */
export const $sidebarCollapsed = persistentAtom<string>(
  'app:sidebar-collapsed',
  'false',
);

export function isSidebarCollapsed(): boolean {
  return $sidebarCollapsed.get() === 'true';
}

export function toggleSidebar(): void {
  $sidebarCollapsed.set(
    $sidebarCollapsed.get() === 'true' ? 'false' : 'true',
  );
}
