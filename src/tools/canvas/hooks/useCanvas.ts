import { useState, useCallback, useRef } from 'react';
import type Konva from 'konva';
import type { ViewportState } from '../types';


export function useCanvas() {
  // Viewport always starts at origin regardless of what's passed (no persistence)
  const [viewport, setViewport] = useState<ViewportState>({ x: 0, y: 0, scale: 1 });
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
    Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));

  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });

  const handleZoom = useCallback((e: WheelEvent, stage: Konva.Stage | null) => {
    if (!stage) return;

    // Two-finger pan / trackpad scroll (no ctrl/meta = scroll, not pinch)
    if (!e.ctrlKey && !e.metaKey) {
      setViewport(v => ({
        ...v,
        x: v.x - e.deltaX,
        y: v.y - e.deltaY,
      }));
      return;
    }

    // Zoom via ctrl+wheel or pinch-to-zoom (browser normalises to ctrlKey)
    const scaleBy = 1.05;
    const pointer = stage.getPointerPosition() || { x: 0, y: 0 };

    setViewport(v => {
      const oldScale = v.scale;
      const newScale = Math.max(0.1, Math.min(10, e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy));
      const mousePointTo = {
        x: (pointer.x - v.x) / oldScale,
        y: (pointer.y - v.y) / oldScale,
      };
      return {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
    });
  }, []);

  const handleTouch = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      // Stop any active drag so it doesn't fight with pinch-zoom
      if (stage.isDragging()) stage.stopDrag();

      const rect = stage.container().getBoundingClientRect();
      const cp1 = { x: touch1.clientX - rect.left, y: touch1.clientY - rect.top };
      const cp2 = { x: touch2.clientX - rect.left, y: touch2.clientY - rect.top };

      const dist = getDistance(cp1, cp2);
      const center = getCenter(cp1, cp2);

      if (!lastDist.current || !lastCenter.current) {
        lastDist.current = dist;
        lastCenter.current = center;
        return;
      }

      setViewport(v => {
        const scaleFactor = dist / lastDist.current;
        const newScale = Math.max(0.1, Math.min(10, v.scale * scaleFactor));

        const pointTo = {
          x: (center.x - v.x) / v.scale,
          y: (center.y - v.y) / v.scale,
        };

        // Pan delta between frames
        const dx = center.x - lastCenter.current!.x;
        const dy = center.y - lastCenter.current!.y;

        return {
          scale: newScale,
          x: center.x - pointTo.x * newScale + dx,
          y: center.y - pointTo.y * newScale + dy,
        };
      });

      lastDist.current = dist;
      lastCenter.current = center;
    } else {
      // Single finger or lift — reset gesture state
      lastDist.current = 0;
      lastCenter.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0;
    lastCenter.current = null;
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setViewport(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  return {
    viewport,
    setViewport,
    handleZoom,
    handlePan,
    handleTouch,
    handleTouchEnd,
  };
}
