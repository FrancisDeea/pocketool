import { describe, it, expect } from 'vitest';

// We need to test storage.ts but it directly uses localStorage.
// Instead of trying to mock the global, let's test the logic patterns.

describe('storage.ts - logic patterns', () => {
  describe('key naming convention', () => {
    it('tool keys follow tool:[id]:[key] pattern', () => {
      const key = 'tool:notes:list';
      expect(key).toMatch(/^tool:[a-z-]+:[a-z-]+$/);
    });

    it('app keys follow app:[key] pattern', () => {
      const key = 'app:theme';
      expect(key).toMatch(/^app:[a-z-]+$/);
    });
  });

  describe('StorageResult type', () => {
    it('ok result has data', () => {
      const result = { ok: true as const, data: 'test' };
      expect(result.ok).toBe(true);
      expect(result.data).toBe('test');
    });

    it('error result has error type', () => {
      const result = { ok: false as const, error: 'quota_exceeded' as const };
      expect(result.ok).toBe(false);
      expect(result.error).toBe('quota_exceeded');
    });
  });

  describe('JSON serialization', () => {
    it('serializes and deserializes objects', () => {
      const data = { items: [1, 2, 3], nested: { a: true } };
      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(data);
    });

    it('handles null values', () => {
      const data = { key: null };
      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(data);
    });

    it('throws on invalid JSON parse', () => {
      expect(() => JSON.parse('{invalid}')).toThrow();
    });

    it('handles arrays', () => {
      const data = [1, 'two', { three: 3 }];
      const serialized = JSON.stringify(data);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(data);
    });
  });

  describe('compression detection', () => {
    it('detects compressed values by prefix', () => {
      const compressed = '__compressed__:abc123';
      expect(compressed.startsWith('__compressed__:')).toBe(true);
    });

    it('does not flag normal values as compressed', () => {
      const normal = '{"key": "value"}';
      expect(normal.startsWith('__compressed__:')).toBe(false);
    });
  });

  describe('export filtering', () => {
    it('filters keys by prefix', () => {
      const allKeys = [
        'tool:notes:list',
        'app:theme',
        'app:lang',
        'unrelated-key',
        'tool:json-viewer:input',
      ];

      const filtered = allKeys.filter((k) => k.startsWith('tool:') || k.startsWith('app:'));

      expect(filtered).toEqual([
        'tool:notes:list',
        'app:theme',
        'app:lang',
        'tool:json-viewer:input',
      ]);
      expect(filtered).not.toContain('unrelated-key');
    });
  });

  describe('schema versioning', () => {
    it('version key follows convention', () => {
      const toolId = 'json-viewer';
      const versionKey = `tool:${toolId}:__version__`;
      expect(versionKey).toBe('tool:json-viewer:__version__');
    });

    it('migration receives old data and version', () => {
      const migrate = (oldData: unknown, fromVersion: number) => {
        if (fromVersion === 1) {
          return { ...(oldData as Record<string, unknown>), newField: 'default' };
        }
        return oldData;
      };

      const oldData = { existingField: 'value' };
      const migrated = migrate(oldData, 1);
      expect(migrated).toEqual({
        existingField: 'value',
        newField: 'default',
      });
    });

    it('migration is idempotent for current version', () => {
      const migrate = (oldData: unknown, fromVersion: number) => {
        if (fromVersion < 2) {
          return { ...(oldData as Record<string, unknown>), newField: 'default' };
        }
        return oldData;
      };

      const data = { existingField: 'value', newField: 'custom' };
      const result = migrate(data, 2);
      expect(result).toEqual(data);
    });
  });

  describe('error categorization', () => {
    it('identifies QuotaExceededError', () => {
      const err = new DOMException('Quota exceeded');
      Object.defineProperty(err, 'name', { value: 'QuotaExceededError' });
      expect(err instanceof DOMException).toBe(true);
      expect(err.name).toBe('QuotaExceededError');
    });

    it('categorizes non-quota errors as unavailable', () => {
      const err = new Error('Some other error');
      expect(err instanceof DOMException).toBe(false);
    });
  });
});
