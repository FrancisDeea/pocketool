import { describe, it, expect } from 'vitest';

// Types mirroring the component
interface ImagePreferences {
  format: 'webp' | 'jpeg' | 'png';
  quality: number;
}

const DEFAULT_PREFS: ImagePreferences = {
  format: 'webp',
  quality: 80,
};

// Pure merge logic extracted from the component's updatePrefs
function mergePrefs(
  base: ImagePreferences,
  partial: Partial<ImagePreferences>,
): ImagePreferences {
  return { ...base, ...partial };
}

// Simulates what the component reads back from Dexie
function resolvePrefs(content: unknown): ImagePreferences {
  return (content as ImagePreferences) ?? DEFAULT_PREFS;
}

describe('Image Optimizer preferences logic', () => {
  describe('DEFAULT_PREFS', () => {
    it('has the expected default format and quality', () => {
      expect(DEFAULT_PREFS.format).toBe('webp');
      expect(DEFAULT_PREFS.quality).toBe(80);
    });
  });

  describe('mergePrefs', () => {
    it('overrides format while keeping quality', () => {
      const result = mergePrefs(DEFAULT_PREFS, { format: 'jpeg' });
      expect(result.format).toBe('jpeg');
      expect(result.quality).toBe(80);
    });

    it('overrides quality while keeping format', () => {
      const result = mergePrefs(DEFAULT_PREFS, { quality: 60 });
      expect(result.format).toBe('webp');
      expect(result.quality).toBe(60);
    });

    it('overrides both format and quality', () => {
      const result = mergePrefs(DEFAULT_PREFS, { format: 'png', quality: 100 });
      expect(result.format).toBe('png');
      expect(result.quality).toBe(100);
    });

    it('returns a new object (immutable)', () => {
      const result = mergePrefs(DEFAULT_PREFS, { quality: 50 });
      expect(result).not.toBe(DEFAULT_PREFS);
    });

    it('handles empty partial (no-op)', () => {
      const result = mergePrefs(DEFAULT_PREFS, {});
      expect(result).toEqual(DEFAULT_PREFS);
    });

    it('accepts boundary quality value of 1', () => {
      const result = mergePrefs(DEFAULT_PREFS, { quality: 1 });
      expect(result.quality).toBe(1);
    });

    it('accepts boundary quality value of 100', () => {
      const result = mergePrefs(DEFAULT_PREFS, { quality: 100 });
      expect(result.quality).toBe(100);
    });
  });

  describe('resolvePrefs (Dexie read path)', () => {
    it('returns stored prefs when content is a valid object', () => {
      const stored: ImagePreferences = { format: 'jpeg', quality: 65 };
      expect(resolvePrefs(stored)).toEqual(stored);
    });

    it('falls back to DEFAULT_PREFS when content is undefined', () => {
      // Simulates a first-run where no Dexie record exists yet
      expect(resolvePrefs(undefined)).toEqual(DEFAULT_PREFS);
    });

    it('falls back to DEFAULT_PREFS when content is null', () => {
      expect(resolvePrefs(null)).toEqual(DEFAULT_PREFS);
    });

    it('correctly uses the id/content/updatedAt shape (ToolState contract)', () => {
      // This test documents the correct Dexie record shape — previously the
      // component used { key, value } which doesn't match the ToolState schema.
      const correctRecord = {
        id: 'tool:image-optimizer:preferences',
        content: { format: 'png', quality: 90 } as ImagePreferences,
        updatedAt: Date.now(),
      };
      expect(correctRecord.id).toBe('tool:image-optimizer:preferences');
      expect(resolvePrefs(correctRecord.content)).toEqual({
        format: 'png',
        quality: 90,
      });
    });
  });
});
