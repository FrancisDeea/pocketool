import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock matchMedia for theme detection
function mockMatchMedia(matches: { darkMode: boolean; highContrast: boolean }) {
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: query.includes('dark')
        ? matches.darkMode
        : query.includes('contrast')
          ? matches.highContrast
          : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    configurable: true,
    writable: true,
  });
}

describe('theme store', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clear localStorage mock
    const store: Record<string, string> = {};
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => store[key] ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        get length() {
          return Object.keys(store).length;
        },
        key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it('applyTheme sets data-theme attribute on document', async () => {
    mockMatchMedia({ darkMode: true, highContrast: false });
    const { applyTheme } = await import('@/stores/theme');
    applyTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('applyTheme handles all theme modes', async () => {
    mockMatchMedia({ darkMode: true, highContrast: false });
    const { applyTheme } = await import('@/stores/theme');

    const modes = ['dark', 'dark-hc', 'light', 'light-hc'] as const;
    for (const mode of modes) {
      applyTheme(mode);
      expect(document.documentElement.getAttribute('data-theme')).toBe(mode);
    }
  });
});
