import { useState, useCallback } from 'react';

export function useSelection() {
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  } | null>(null);

  const startSelection = useCallback((x: number, y: number) => {
    setSelectionRect({ x1: x, y1: y, x2: x, y2: y });
  }, []);

  const updateSelection = useCallback(
    (x: number, y: number) => {
      if (selectionRect) {
        setSelectionRect((prev) => (prev ? { ...prev, x2: x, y2: y } : null));
      }
    },
    [selectionRect]
  );

  const endSelection = useCallback(() => {
    setSelectionRect(null);
  }, []);

  return {
    selectionRect,
    startSelection,
    updateSelection,
    endSelection,
  };
}
