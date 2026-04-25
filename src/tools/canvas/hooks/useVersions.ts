import { useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, addToolHistory } from '@/db';
import type { CanvasState } from '../types';

export function useVersions() {
  const versions = useLiveQuery(() => 
    db.toolHistory
      .where('toolId')
      .equals('canvas')
      .reverse()
      .sortBy('timestamp'),
    []
  );

  const saveVersion = useCallback(async (name: string, data: CanvasState) => {
    // We pass limit: 0 to allow unlimited versions as per spec
    await addToolHistory('canvas', { name, state: data }, 0);
  }, []);

  const deleteVersion = useCallback(async (id: number) => {
    await db.toolHistory.delete(id);
  }, []);

  const renameVersion = useCallback(async (id: number, newName: string) => {
    const version = await db.toolHistory.get(id);
    if (version) {
      await db.toolHistory.update(id, {
        data: { ...(version.data as any), name: newName }
      });
    }
  }, []);

  return {
    versions: versions || [],
    saveVersion,
    deleteVersion,
    renameVersion
  };
}
