import { describe, it, expect } from 'vitest';
import { parseRegex, findMatches, buildSegments } from '../../src/tools/regex-tester/index';
import type { RegexMatch } from '../../src/tools/regex-tester/index';

// ── parseRegex ────────────────────────────────────────────────────────────────

describe('parseRegex', () => {
  it('returns null regex and no error for empty pattern', () => {
    const { regex, error } = parseRegex('', 'g');
    expect(regex).toBeNull();
    expect(error).toBeNull();
  });

  it('returns a RegExp for a valid pattern', () => {
    const { regex, error } = parseRegex('hello', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect(error).toBeNull();
  });

  it('passes flags to the RegExp', () => {
    const { regex } = parseRegex('abc', 'gi');
    expect(regex?.flags).toContain('g');
    expect(regex?.flags).toContain('i');
  });

  it('returns error for invalid pattern', () => {
    const { regex, error } = parseRegex('[invalid', 'g');
    expect(regex).toBeNull();
    expect(error).toBeTruthy();
    expect(typeof error).toBe('string');
  });

  it('handles empty flags string', () => {
    const { regex, error } = parseRegex('test', '');
    expect(regex).toBeInstanceOf(RegExp);
    expect(error).toBeNull();
  });

  it('handles special regex characters in pattern', () => {
    const { regex, error } = parseRegex('\\d+', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect(error).toBeNull();
  });

  it('handles lookahead patterns', () => {
    const { regex, error } = parseRegex('foo(?=bar)', 'g');
    expect(regex).toBeInstanceOf(RegExp);
    expect(error).toBeNull();
  });
});

// ── findMatches ───────────────────────────────────────────────────────────────

describe('findMatches', () => {
  it('returns empty array for empty text', () => {
    const { regex } = parseRegex('hello', 'g');
    expect(findMatches(regex!, '')).toEqual([]);
  });

  it('finds a single match without global flag', () => {
    const { regex } = parseRegex('hello', '');
    const matches = findMatches(regex!, 'say hello world');
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('hello');
    expect(matches[0].index).toBe(4);
    expect(matches[0].end).toBe(9);
  });

  it('finds only first match without global flag', () => {
    const { regex } = parseRegex('o', '');
    const matches = findMatches(regex!, 'hello world');
    expect(matches).toHaveLength(1);
    expect(matches[0].index).toBe(4);
  });

  it('finds all matches with global flag', () => {
    const { regex } = parseRegex('o', 'g');
    const matches = findMatches(regex!, 'hello world');
    expect(matches).toHaveLength(2);
    expect(matches[0].index).toBe(4);
    expect(matches[1].index).toBe(7);
  });

  it('is case sensitive by default', () => {
    const { regex } = parseRegex('Hello', 'g');
    const matches = findMatches(regex!, 'hello Hello HELLO');
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('Hello');
  });

  it('is case insensitive with i flag', () => {
    const { regex } = parseRegex('hello', 'gi');
    const matches = findMatches(regex!, 'hello Hello HELLO');
    expect(matches).toHaveLength(3);
  });

  it('returns match index and end position correctly', () => {
    const { regex } = parseRegex('world', 'g');
    const matches = findMatches(regex!, 'hello world');
    expect(matches[0].index).toBe(6);
    expect(matches[0].end).toBe(11);
  });

  it('captures groups', () => {
    const { regex } = parseRegex('(\\w+)@(\\w+)', 'g');
    const matches = findMatches(regex!, 'user@host');
    expect(matches).toHaveLength(1);
    expect(matches[0].groups).toEqual(['user', 'host']);
  });

  it('captures multiple groups across multiple matches', () => {
    const { regex } = parseRegex('(\\d+)-(\\d+)', 'g');
    const matches = findMatches(regex!, '12-34 and 56-78');
    expect(matches).toHaveLength(2);
    expect(matches[0].groups).toEqual(['12', '34']);
    expect(matches[1].groups).toEqual(['56', '78']);
  });

  it('returns empty groups array when no capture groups', () => {
    const { regex } = parseRegex('hello', 'g');
    const matches = findMatches(regex!, 'hello');
    expect(matches[0].groups).toEqual([]);
  });

  it('handles optional groups that did not match', () => {
    const { regex } = parseRegex('(a)(b)?', 'g');
    const matches = findMatches(regex!, 'ac');
    expect(matches[0].groups[1]).toBe('');
  });

  it('finds matches with digit patterns', () => {
    const { regex } = parseRegex('\\d+', 'g');
    const matches = findMatches(regex!, 'abc 123 def 456');
    expect(matches).toHaveLength(2);
    expect(matches[0].value).toBe('123');
    expect(matches[1].value).toBe('456');
  });

  it('handles multiline flag with ^ and $', () => {
    const { regex } = parseRegex('^line', 'gm');
    const matches = findMatches(regex!, 'line one\nline two\nother');
    expect(matches).toHaveLength(2);
  });

  it('returns no matches when pattern does not match', () => {
    const { regex } = parseRegex('xyz', 'g');
    const matches = findMatches(regex!, 'hello world');
    expect(matches).toHaveLength(0);
  });

  it('does not infinite loop on zero-length matches', () => {
    const { regex } = parseRegex('a*', 'g');
    const matches = findMatches(regex!, 'bbb');
    expect(Array.isArray(matches)).toBe(true);
  });

  it('handles unicode characters', () => {
    const { regex } = parseRegex('café', 'g');
    const matches = findMatches(regex!, 'un café por favor');
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('café');
  });
});

// ── buildSegments ─────────────────────────────────────────────────────────────

describe('buildSegments', () => {
  it('returns single unmatched segment when no matches', () => {
    const segments = buildSegments('hello world', []);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('hello world');
    expect(segments[0].matched).toBe(false);
    expect(segments[0].matchIndex).toBeNull();
  });

  it('returns single matched segment when entire text matches', () => {
    const match: RegexMatch = { index: 0, end: 5, value: 'hello', groups: [] };
    const segments = buildSegments('hello', [match]);
    expect(segments).toHaveLength(1);
    expect(segments[0].matched).toBe(true);
    expect(segments[0].matchIndex).toBe(0);
  });

  it('splits text into before/match/after segments', () => {
    const match: RegexMatch = { index: 6, end: 11, value: 'world', groups: [] };
    const segments = buildSegments('hello world', [match]);
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ text: 'hello ', matched: false, matchIndex: null });
    expect(segments[1]).toEqual({ text: 'world', matched: true, matchIndex: 0 });
  });

  it('handles match at start of string', () => {
    const match: RegexMatch = { index: 0, end: 5, value: 'hello', groups: [] };
    const segments = buildSegments('hello world', [match]);
    expect(segments[0].matched).toBe(true);
    expect(segments[0].text).toBe('hello');
    expect(segments[1].text).toBe(' world');
  });

  it('handles multiple matches', () => {
    const matches: RegexMatch[] = [
      { index: 0, end: 1, value: 'a', groups: [] },
      { index: 2, end: 3, value: 'a', groups: [] },
    ];
    const segments = buildSegments('a a', matches);
    const matched = segments.filter(s => s.matched);
    const unmatched = segments.filter(s => !s.matched);
    expect(matched).toHaveLength(2);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0].text).toBe(' ');
  });

  it('assigns correct matchIndex to each matched segment', () => {
    const matches: RegexMatch[] = [
      { index: 0, end: 1, value: 'a', groups: [] },
      { index: 2, end: 3, value: 'b', groups: [] },
    ];
    const segments = buildSegments('a b', matches);
    const matched = segments.filter(s => s.matched);
    expect(matched[0].matchIndex).toBe(0);
    expect(matched[1].matchIndex).toBe(1);
  });

  it('handles empty string input', () => {
    const segments = buildSegments('', []);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe('');
  });

  it('handles trailing unmatched text after last match', () => {
    const match: RegexMatch = { index: 0, end: 5, value: 'hello', groups: [] };
    const segments = buildSegments('hello world', [match]);
    const last = segments[segments.length - 1];
    expect(last.matched).toBe(false);
    expect(last.text).toBe(' world');
  });
});
