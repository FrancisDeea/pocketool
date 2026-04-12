import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLanguage } from '@/utils/detect-lang';

// Mock storage module
vi.mock('@/utils/storage', () => ({
  storageGet: vi.fn(() => ({ ok: false, error: 'parse_error' })),
  storageSet: vi.fn(async () => ({ ok: true, data: undefined })),
}));

import { storageGet } from '@/utils/storage';
const mockStorageGet = vi.mocked(storageGet);

describe('detect-lang.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stored locale if present', () => {
    mockStorageGet.mockReturnValueOnce({ ok: true, data: 'en' });
    expect(detectLanguage()).toBe('en');
  });

  it('detects Spanish from navigator.language', () => {
    mockStorageGet.mockReturnValueOnce({ ok: false, error: 'parse_error' });
    Object.defineProperty(navigator, 'language', {
      value: 'es',
      configurable: true,
    });
    expect(detectLanguage()).toBe('es');
  });

  it('detects English from navigator.language', () => {
    mockStorageGet.mockReturnValueOnce({ ok: false, error: 'parse_error' });
    Object.defineProperty(navigator, 'language', {
      value: 'en',
      configurable: true,
    });
    expect(detectLanguage()).toBe('en');
  });

  it('matches prefix (en-US → en)', () => {
    mockStorageGet.mockReturnValueOnce({ ok: false, error: 'parse_error' });
    Object.defineProperty(navigator, 'language', {
      value: 'en-US',
      configurable: true,
    });
    expect(detectLanguage()).toBe('en');
  });

  it('matches prefix (es-MX → es)', () => {
    mockStorageGet.mockReturnValueOnce({ ok: false, error: 'parse_error' });
    Object.defineProperty(navigator, 'language', {
      value: 'es-MX',
      configurable: true,
    });
    expect(detectLanguage()).toBe('es');
  });

  it('falls back to es for unsupported languages', () => {
    mockStorageGet.mockReturnValueOnce({ ok: false, error: 'parse_error' });
    Object.defineProperty(navigator, 'language', {
      value: 'fr',
      configurable: true,
    });
    expect(detectLanguage()).toBe('es');
  });
});
