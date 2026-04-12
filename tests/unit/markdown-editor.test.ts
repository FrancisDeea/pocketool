import { describe, it, expect } from 'vitest';
import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';

/**
 * Markdown Editor logic tests.
 * Tests the core markdown parsing and rendering.
 */

function createMarked(): Marked {
  const m = new Marked();
  m.use(gfmHeadingId());
  return m;
}

describe('Markdown Editor logic', () => {
  const marked = createMarked();

  describe('basic rendering', () => {
    it('renders headings', () => {
      const html = marked.parse('# Hello') as string;
      expect(html).toContain('<h1');
      expect(html).toContain('Hello');
    });

    it('renders bold text', () => {
      const html = marked.parse('**bold**') as string;
      expect(html).toContain('<strong>bold</strong>');
    });

    it('renders italic text', () => {
      const html = marked.parse('*italic*') as string;
      expect(html).toContain('<em>italic</em>');
    });

    it('renders links', () => {
      const html = marked.parse('[test](https://example.com)') as string;
      expect(html).toContain('<a href="https://example.com"');
      expect(html).toContain('test</a>');
    });

    it('renders code blocks', () => {
      const html = marked.parse('```js\nconst x = 1;\n```') as string;
      expect(html).toContain('<code');
      expect(html).toContain('const x = 1;');
    });

    it('renders inline code', () => {
      const html = marked.parse('use `const` keyword') as string;
      expect(html).toContain('<code>const</code>');
    });
  });

  describe('GFM features', () => {
    it('renders tables', () => {
      const md = `| Col A | Col B |
| --- | --- |
| 1 | 2 |`;
      const html = marked.parse(md) as string;
      expect(html).toContain('<table');
      expect(html).toContain('<th');
      expect(html).toContain('Col A');
    });

    it('renders task lists', () => {
      const md = `- [x] Done
- [ ] Not done`;
      const html = marked.parse(md) as string;
      expect(html).toContain('type="checkbox"');
    });

    it('renders strikethrough', () => {
      const html = marked.parse('~~deleted~~') as string;
      expect(html).toContain('<del>deleted</del>');
    });
  });

  describe('heading IDs', () => {
    it('generates IDs for headings', () => {
      const html = marked.parse('## My Section') as string;
      expect(html).toContain('id="my-section"');
    });
  });

  describe('edge cases', () => {
    it('handles empty input', () => {
      const html = marked.parse('') as string;
      expect(html).toBe('');
    });

    it('handles very long input', () => {
      const longMd = '# Title\n' + 'paragraph '.repeat(10000);
      const html = marked.parse(longMd) as string;
      expect(html).toContain('<h1');
    });
  });
});
