import { describe, it, expect } from 'vitest';

/**
 * JSON Viewer logic tests.
 * Tests the core parsing and search functionality
 * used by the JSON Viewer tool.
 */

function parseJson(input: string): { ok: true; data: unknown } | { ok: false; error: string } {
  if (!input.trim()) return { ok: false, error: '' };
  try {
    return { ok: true, data: JSON.parse(input) };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Invalid JSON',
    };
  }
}

function countNodes(data: unknown): number {
  let count = 0;
  const walk = (val: unknown) => {
    count++;
    if (val && typeof val === 'object') {
      Object.values(val as Record<string, unknown>).forEach(walk);
    }
  };
  walk(data);
  return count;
}

function searchJson(data: unknown, query: string, path = ''): string[] {
  const results: string[] = [];
  const q = query.toLowerCase();

  if (data && typeof data === 'object') {
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (key.toLowerCase().includes(q)) {
        results.push(currentPath);
      }
      if (val && typeof val !== 'object' && String(val).toLowerCase().includes(q)) {
        results.push(currentPath);
      }
      results.push(...searchJson(val, query, currentPath));
    }
  }

  return results;
}

describe('JSON Viewer logic', () => {
  describe('parseJson', () => {
    it('parses valid JSON objects', () => {
      const result = parseJson('{"name": "test"}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ name: 'test' });
      }
    });

    it('parses valid JSON arrays', () => {
      const result = parseJson('[1, 2, 3]');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual([1, 2, 3]);
      }
    });

    it('returns error for invalid JSON', () => {
      const result = parseJson('{invalid}');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBeTruthy();
      }
    });

    it('returns error for empty input', () => {
      const result = parseJson('');
      expect(result.ok).toBe(false);
    });

    it('handles nested objects', () => {
      const result = parseJson('{"a": {"b": {"c": 1}}}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ a: { b: { c: 1 } } });
      }
    });

    it('handles null values', () => {
      const result = parseJson('{"key": null}');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual({ key: null });
      }
    });
  });

  describe('countNodes', () => {
    it('counts nodes in a flat object', () => {
      expect(countNodes({ a: 1, b: 2 })).toBe(3); // root + 2 values
    });

    it('counts nodes in a nested object', () => {
      expect(countNodes({ a: { b: 1 } })).toBe(3); // root + nested + value
    });

    it('counts array elements', () => {
      expect(countNodes([1, 2, 3])).toBe(4); // root array + 3 elements
    });

    it('counts primitive as 1', () => {
      expect(countNodes('hello')).toBe(1);
    });
  });

  describe('searchJson', () => {
    it('finds keys matching query', () => {
      const data = { name: 'John', age: 30 };
      const results = searchJson(data, 'name');
      expect(results).toContain('name');
    });

    it('finds values matching query', () => {
      const data = { name: 'John', city: 'Madrid' };
      const results = searchJson(data, 'Madrid');
      expect(results).toContain('city');
    });

    it('is case insensitive', () => {
      const data = { Name: 'JOHN' };
      const results = searchJson(data, 'john');
      expect(results.length).toBeGreaterThan(0);
    });

    it('searches nested objects', () => {
      const data = { user: { profile: { email: 'test@test.com' } } };
      const results = searchJson(data, 'email');
      expect(results).toContain('user.profile.email');
    });

    it('returns empty for no matches', () => {
      const data = { name: 'John' };
      const results = searchJson(data, 'zzz');
      expect(results).toEqual([]);
    });
  });
});
