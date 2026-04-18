import Dexie, { type EntityTable } from 'dexie';

export interface ToolState {
  key: string; // e.g., "tool:image-optimizer:preferences"
  value: any;
}

const db = new Dexie('PocketoolDatabase') as Dexie & {
  toolStates: EntityTable<ToolState, 'key'>;
};

// Increment version when adding tables
db.version(1).stores({
  toolStates: 'key',
});

// Helper for reactive access
export { db };
