import Dexie, { type EntityTable } from 'dexie';

// ── Table interfaces ─────────────────────────────────────

/** Persistent state for each tool (key-value store) */
export interface ToolState {
  id: string; // 'tool:[tool-id]:[key]' — Primary Key
  content: unknown; // typed per-tool
  updatedAt: number;
}

/** History/sessions per tool (optional, FIFO with limit) */
export interface ToolHistory {
  id?: number; // autoincrement
  toolId: string; // 'json-viewer', 'code-playground', etc.
  timestamp: number;
  data: unknown;
}

/** Snippets for Code Playground */
export interface Snippet {
  id: string; // uuid
  toolId: string; // 'code-playground'
  name: string;
  description: string;
  lang: 'html' | 'css' | 'js' | 'ts';
  content: string;
  isBuiltIn: boolean;
  createdAt: number;
}

/** Notes with tags */
export interface Note {
  id: string; // uuid
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

// ── Database definition ──────────────────────────────────

class PocketoolDB extends Dexie {
  toolStates!: EntityTable<ToolState, 'id'>;
  toolHistory!: EntityTable<ToolHistory, 'id'>;
  snippets!: EntityTable<Snippet, 'id'>;
  notes!: EntityTable<Note, 'id'>;

  constructor() {
    super('PocketoolDB');
    this.version(1).stores({
      toolStates: 'id, updatedAt',
      toolHistory: '++id, toolId, timestamp',
      snippets: 'id, toolId, isBuiltIn, createdAt',
      notes: 'id, updatedAt, *tags',
    });
  }
}

export const db = new PocketoolDB();

// ── Helper: limit history entries per tool ────────────────

const HISTORY_LIMIT = 10;

/**
 * Add a history entry for a tool, keeping only the last N entries.
 */
export async function addToolHistory(
  toolId: string,
  data: unknown,
): Promise<void> {
  await db.toolHistory.add({
    toolId,
    timestamp: Date.now(),
    data,
  });

  // Prune old entries beyond limit
  const count = await db.toolHistory.where('toolId').equals(toolId).count();
  if (count > HISTORY_LIMIT) {
    const toDelete = await db.toolHistory
      .where('toolId')
      .equals(toolId)
      .sortBy('timestamp');
    const deleteCount = count - HISTORY_LIMIT;
    const idsToDelete = toDelete
      .slice(0, deleteCount)
      .map((entry) => entry.id)
      .filter((id): id is number => id !== undefined);
    await db.toolHistory.bulkDelete(idsToDelete);
  }
}
