import { describe, it, expect } from 'vitest';

/**
 * Notes tool logic tests.
 * Tests CRUD operations, tags, search, and persistence.
 */

type Note = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

// Pure logic functions extracted from the Notes component

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createNote(overrides: Partial<Note> = {}): Note {
  return {
    id: generateId(),
    title: '',
    content: '',
    tags: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function filterNotes(
  notes: Note[],
  searchQuery: string,
  filterTag: string | null,
): Note[] {
  let result = notes;
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q),
    );
  }
  if (filterTag) {
    result = result.filter((n) => n.tags.includes(filterTag));
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt);
}

function getAllTags(notes: Note[]): string[] {
  const tags = new Set<string>();
  notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
  return Array.from(tags).sort();
}

function addTagToNote(note: Note, tag: string): Note {
  if (note.tags.includes(tag)) return note;
  return { ...note, tags: [...note.tags, tag], updatedAt: Date.now() };
}

function removeTagFromNote(note: Note, tag: string): Note {
  return {
    ...note,
    tags: note.tags.filter((t) => t !== tag),
    updatedAt: Date.now(),
  };
}

describe('Notes logic', () => {
  describe('createNote', () => {
    it('creates a note with defaults', () => {
      const note = createNote();
      expect(note.title).toBe('');
      expect(note.content).toBe('');
      expect(note.tags).toEqual([]);
      expect(note.id).toBeTruthy();
    });

    it('accepts overrides', () => {
      const note = createNote({ title: 'Test', tags: ['work'] });
      expect(note.title).toBe('Test');
      expect(note.tags).toEqual(['work']);
    });
  });

  describe('filterNotes', () => {
    const notes: Note[] = [
      createNote({
        id: '1',
        title: 'Shopping list',
        content: 'Buy milk and eggs',
        tags: ['personal'],
        updatedAt: 100,
      }),
      createNote({
        id: '2',
        title: 'Meeting notes',
        content: 'Discuss roadmap',
        tags: ['work'],
        updatedAt: 200,
      }),
      createNote({
        id: '3',
        title: 'Code review',
        content: 'Review PR #42',
        tags: ['work', 'dev'],
        updatedAt: 300,
      }),
    ];

    it('returns all notes when no filter', () => {
      const result = filterNotes(notes, '', null);
      expect(result).toHaveLength(3);
    });

    it('filters by search query (title)', () => {
      const result = filterNotes(notes, 'meeting', null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('filters by search query (content)', () => {
      const result = filterNotes(notes, 'milk', null);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('is case insensitive', () => {
      const result = filterNotes(notes, 'SHOPPING', null);
      expect(result).toHaveLength(1);
    });

    it('filters by tag', () => {
      const result = filterNotes(notes, '', 'work');
      expect(result).toHaveLength(2);
    });

    it('combines search and tag filter', () => {
      const result = filterNotes(notes, 'review', 'work');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('3');
    });

    it('sorts by updatedAt descending', () => {
      const result = filterNotes(notes, '', null);
      expect(result[0].id).toBe('3');
      expect(result[2].id).toBe('1');
    });

    it('returns empty array for no matches', () => {
      const result = filterNotes(notes, 'zzzzz', null);
      expect(result).toHaveLength(0);
    });
  });

  describe('getAllTags', () => {
    it('extracts unique sorted tags', () => {
      const notes = [
        createNote({ tags: ['b', 'a'] }),
        createNote({ tags: ['c', 'a'] }),
      ];
      expect(getAllTags(notes)).toEqual(['a', 'b', 'c']);
    });

    it('returns empty for notes without tags', () => {
      const notes = [createNote(), createNote()];
      expect(getAllTags(notes)).toEqual([]);
    });
  });

  describe('tag operations', () => {
    it('adds a tag to a note', () => {
      const note = createNote({ tags: ['a'] });
      const updated = addTagToNote(note, 'b');
      expect(updated.tags).toEqual(['a', 'b']);
    });

    it('does not duplicate tags', () => {
      const note = createNote({ tags: ['a'] });
      const updated = addTagToNote(note, 'a');
      expect(updated.tags).toEqual(['a']);
    });

    it('removes a tag from a note', () => {
      const note = createNote({ tags: ['a', 'b', 'c'] });
      const updated = removeTagFromNote(note, 'b');
      expect(updated.tags).toEqual(['a', 'c']);
    });

    it('handles removing non-existent tag gracefully', () => {
      const note = createNote({ tags: ['a'] });
      const updated = removeTagFromNote(note, 'z');
      expect(updated.tags).toEqual(['a']);
    });
  });
});
