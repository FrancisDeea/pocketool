import { useState, useCallback, useRef } from 'react';
import type { CanvasState } from '../types';

const MAX_HISTORY = 50;

export function useHistory(initialState: CanvasState) {
  const [history, setHistory] = useState<CanvasState[]>([initialState]);
  const [index, setIndex] = useState(0);

  // Refs to avoid stale closures in callbacks
  const historyRef = useRef(history);
  const indexRef = useRef(index);
  historyRef.current = history;
  indexRef.current = index;

  const pushState = useCallback((state: CanvasState) => {
    setHistory(prev => {
      const currentIndex = indexRef.current;
      const current = prev[currentIndex];

      // Quick reference equality check first, then deep compare
      if (current === state) return prev;
      if (
        current.shapes.length === state.shapes.length &&
        current.connectors.length === state.connectors.length &&
        JSON.stringify(current) === JSON.stringify(state)
      ) {
        return prev;
      }

      const newHistory = prev.slice(0, currentIndex + 1);
      // Deep clone to prevent mutations
      newHistory.push(JSON.parse(JSON.stringify(state)));

      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        setIndex(newHistory.length - 1);
        return newHistory;
      }

      setIndex(newHistory.length - 1);
      return newHistory;
    });
  }, []);

  const undo = useCallback(() => {
    setIndex(prev => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  }, []);

  const redo = useCallback(() => {
    setIndex(prev => {
      if (prev >= historyRef.current.length - 1) return prev;
      return prev + 1;
    });
  }, []);

  return {
    state: history[index],
    pushState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}
