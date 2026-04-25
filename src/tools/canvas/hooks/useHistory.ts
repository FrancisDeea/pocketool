import { useState, useCallback } from 'react';
import type { CanvasState } from '../types';

const MAX_HISTORY = 50;

export function useHistory(initialState: CanvasState) {
  const [history, setHistory] = useState<CanvasState[]>([initialState]);
  const [index, setIndex] = useState(0);

  const pushState = useCallback((state: CanvasState) => {
    // If state is same as current, don't push
    if (JSON.stringify(state) === JSON.stringify(history[index])) return;

    const newHistory = history.slice(0, index + 1);
    newHistory.push(JSON.parse(JSON.stringify(state)));
    
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    } else {
      setHistory(newHistory);
      setIndex(newHistory.length - 1);
    }
  }, [history, index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
      return history[index - 1];
    }
    return null;
  }, [history, index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex(index + 1);
      return history[index + 1];
    }
    return null;
  }, [history, index]);

  return {
    state: history[index],
    pushState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1
  };
}
