import { useEffect, useRef } from 'react';
import { db } from '@/db';
import type { CanvasState } from '../types';

/**
 * Autosave hook — persists only canvas state (shapes + connectors),
 * snap, and showGrid. Viewport (zoom + pan) is intentionally NOT
 * persisted so it always resets on page load.
 */
export function useAutoSave(
  state: CanvasState,
  snap: boolean,
  showGrid: boolean,
  showOrigin: boolean
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if this is the first render to avoid saving the initial hydrated state
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render — initial state comes from DB, no need to write it back
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

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
          id: 'tool:canvas:snap',
          content: snap,
          updatedAt: now,
        }),
        db.toolStates.put({
          id: 'tool:canvas:show-grid',
          content: showGrid,
          updatedAt: now,
        }),
        db.toolStates.put({
          id: 'tool:canvas:show-origin',
          content: showOrigin,
          updatedAt: now,
        }),
      ]);
    }, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [state, snap, showGrid, showOrigin]);
}
