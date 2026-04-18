import { useState, useCallback, useMemo } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Tag,
  X,
  StickyNote,
  Clock,
} from 'lucide-react';
import Button from '@ui/Button';
import ScrollArea from '@ui/ScrollArea';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export default function Notes() {
  // Reactive query — automatically re-renders when DB changes
  const notes = useLiveQuery(
    () => db.notes.orderBy('updatedAt').reverse().toArray(),
    [],
    [],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
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
    return result;
  }, [notes, searchQuery, filterTag]);

  const handleCreate = useCallback(async () => {
    const id = generateId();
    const now = Date.now();
    await db.notes.add({
      id,
      title: '',
      content: '',
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
    setSelectedId(id);
  }, []);

  const handleUpdate = useCallback(
    async (field: 'title' | 'content', value: string) => {
      if (!selectedId) return;
      if (field === 'title') {
        await db.notes.update(selectedId, { title: value, updatedAt: Date.now() });
      } else {
        await db.notes.update(selectedId, { content: value, updatedAt: Date.now() });
      }
    },
    [selectedId],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await db.notes.delete(id);
      if (selectedId === id) setSelectedId(null);
    },
    [selectedId],
  );

  const handleAddTag = useCallback(async () => {
    if (!newTag.trim() || !selectedId || !selectedNote) return;
    const tag = newTag.trim().toLowerCase();
    if (selectedNote.tags.includes(tag)) {
      setNewTag('');
      return;
    }
    await db.notes.update(selectedId, {
      tags: [...selectedNote.tags, tag],
      updatedAt: Date.now(),
    });
    setNewTag('');
  }, [newTag, selectedId, selectedNote]);

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!selectedId || !selectedNote) return;
      await db.notes.update(selectedId, {
        tags: selectedNote.tags.filter((t) => t !== tag),
        updatedAt: Date.now(),
      });
    },
    [selectedId, selectedNote],
  );

  return (
    <div className="flex gap-4 h-[calc(100dvh-var(--topbar-height)-3rem)]">
      {/* Left: Note list */}
      <div className="w-72 shrink-0 flex flex-col max-md:w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-tertiary uppercase tracking-wide">
            Notas ({notes.length})
          </span>
          <Button variant="primary" size="sm" onClick={handleCreate}>
            <Plus size={14} />
            Nueva
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-surface border border-border rounded-lg">
          <Search size={14} className="text-text-tertiary shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar notas..."
            className="flex-1 bg-transparent text-sm outline-none text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            <button
              onClick={() => setFilterTag(null)}
              className={[
                'px-2 py-0.5 text-[10px] font-medium rounded-full cursor-pointer',
                'transition-colors border',
                !filterTag
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface-hover text-text-secondary border-border hover:border-border-hover',
              ].join(' ')}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(tag === filterTag ? null : tag)}
                className={[
                  'px-2 py-0.5 text-[10px] font-medium rounded-full cursor-pointer',
                  'transition-colors border',
                  filterTag === tag
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface-hover text-text-secondary border-border hover:border-border-hover',
                ].join(' ')}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Note list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-1 pr-1">
            {filteredNotes.length === 0 && (
              <div className="text-center py-12">
                <StickyNote
                  size={32}
                  className="mx-auto text-text-tertiary mb-3"
                />
                <p className="text-sm text-text-tertiary">
                  {notes.length === 0
                    ? 'No hay notas aún. ¡Crea una!'
                    : 'Sin resultados'}
                </p>
              </div>
            )}
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                onClick={() => setSelectedId(note.id)}
                className={[
                  'group p-3 rounded-lg cursor-pointer',
                  'transition-colors duration-[var(--transition-fast)]',
                  selectedId === note.id
                    ? 'bg-accent-muted border border-accent/20'
                    : 'hover:bg-surface-hover border border-transparent',
                ].join(' ')}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-text-primary truncate">
                    {note.title || 'Sin título'}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger shrink-0 cursor-pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5 line-clamp-2">
                  {note.content || 'Nota vacía'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-text-tertiary flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(note.updatedAt)}
                  </span>
                  {note.tags.length > 0 && (
                    <div className="flex gap-1">
                      {note.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0 text-[9px] text-text-tertiary bg-surface-hover rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Editor */}
      <div className="flex-1 flex flex-col min-h-0 max-md:hidden">
        {selectedNote ? (
          <>
            <input
              value={selectedNote.title}
              onChange={(e) => handleUpdate('title', e.target.value)}
              placeholder="Título de la nota..."
              className="text-xl font-semibold bg-transparent outline-none text-text-primary placeholder:text-text-tertiary mb-3"
            />

            {/* Tags */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Tag size={14} className="text-text-tertiary shrink-0" />
              {selectedNote.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-accent bg-accent-muted rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-danger cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  placeholder="+ etiqueta"
                  className="w-20 text-xs bg-transparent outline-none text-text-tertiary placeholder:text-text-tertiary"
                />
              </div>
            </div>

            <textarea
              value={selectedNote.content}
              onChange={(e) => handleUpdate('content', e.target.value)}
              placeholder="Escribe tu nota..."
              className={[
                'flex-1 p-4 rounded-xl resize-none',
                'bg-surface border border-border',
                'text-sm text-text-primary leading-relaxed',
                'placeholder:text-text-tertiary',
                'focus:outline-none focus:border-accent',
              ].join(' ')}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <StickyNote
                size={48}
                className="mx-auto text-text-tertiary mb-4"
              />
              <p className="text-text-tertiary">
                Selecciona o crea una nota
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
