import { useState, useCallback, useRef } from 'react';
import type Konva from 'konva';
import type { ViewportState } from '../types';

export function useCanvas(initialViewport?: ViewportState) {
  const [viewport, setViewport] = useState<ViewportState>(initialViewport || { x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoom = useCallback((e: WheelEvent, stage: Konva.Stage | null) => {
    e.preventDefault();
    if (!stage) return;

    setViewport(v => {
      // Two-finger pan / Trackpad scroll
      if (!e.ctrlKey && !e.metaKey) {
        return {
          ...v,
          x: v.x - e.deltaX,
          y: v.y - e.deltaY,
        };
      }

      // Zoom
      const scaleBy = 1.05;
      const oldScale = v.scale;
      
      // Get pointer position relative to stage
      const pointer = stage.getPointerPosition() || { x: 0, y: 0 };

      const mousePointTo = {
        x: (pointer.x - v.x) / oldScale,
        y: (pointer.y - v.y) / oldScale,
      };

      let newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      newScale = Math.max(0.1, Math.min(10, newScale));

      return {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
    });
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setViewport(v => ({
      ...v,
      x: v.x + dx,
      y: v.y + dy,
    }));
  }, []);

  return {
    viewport,
    setViewport,
    containerRef,
    handleZoom,
    handlePan
  };
}

