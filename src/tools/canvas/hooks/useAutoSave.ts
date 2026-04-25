import { useEffect, useRef } from 'react';
import { db } from '@/db';
import type { CanvasState, ViewportState } from '../types';

export function useAutoSave(state: CanvasState, viewport: ViewportState, snap: boolean, showGrid: boolean) {
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(async () => {
      const now = Date.now();
      
      await Promise.all([
        db.toolStates.put({
          id: 'tool:canvas:autosave',
          content: JSON.stringify(state),
          updatedAt: now,
        }),
        db.toolStates.put({
          id: 'tool:canvas:viewport',
          content: viewport,
          updatedAt: now,
        }),
        db.toolStates.put({
          id: 'tool:canvas:snap',
          content: snap,
          updatedAt: now,
        }),
        db.toolStates.put({
          id: 'tool:canvas:show-grid',
          content: showGrid,
          updatedAt: now,
        }),
      ]);
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, viewport, snap, showGrid]);
}
