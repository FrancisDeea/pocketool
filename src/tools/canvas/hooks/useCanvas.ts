import { useState, useCallback, useRef } from 'react';
import type Konva from 'konva';
import type { ViewportState } from '../types';

export function useCanvas(initialViewport?: ViewportState) {
  const [viewport, setViewport] = useState<ViewportState>(initialViewport || { x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastDist = useRef<number>(0);

  const getDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  };

  const getCenter = (p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };
  };

  const performZoom = useCallback((newScale: number, pointer: { x: number; y: number }) => {
    setViewport(v => {
      const oldScale = v.scale;
      const mousePointTo = {
        x: (pointer.x - v.x) / oldScale,
        y: (pointer.y - v.y) / oldScale,
      };

      const clampedScale = Math.max(0.1, Math.min(10, newScale));

      return {
        scale: clampedScale,
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
    });
  }, []);

  const handleZoom = useCallback((e: WheelEvent, stage: Konva.Stage | null) => {
    if (!stage) return;

    // Two-finger pan / Trackpad scroll (not pinch)
    if (!e.ctrlKey && !e.metaKey) {
      setViewport(v => ({
        ...v,
        x: v.x - e.deltaX,
        y: v.y - e.deltaY,
      }));
      return;
    }

    // Zoom
    const scaleBy = 1.05;
    const oldScale = viewport.scale;
    const pointer = stage.getPointerPosition() || { x: 0, y: 0 };
    const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    performZoom(newScale, pointer);
  }, [viewport.scale, performZoom]);

  const handleTouch = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const touch1 = e.evt.touches[0];
    const touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
      // Prevent multi-touch from drawing or selecting
      if (stage.isDragging()) stage.stopDrag();

      const p1 = { x: touch1.clientX, y: touch1.clientY };
      const p2 = { x: touch2.clientX, y: touch2.clientY };

      const rect = stage.container().getBoundingClientRect();
      const cp1 = { x: p1.x - rect.left, y: p1.y - rect.top };
      const cp2 = { x: p2.x - rect.left, y: p2.y - rect.top };

      const dist = getDistance(cp1, cp2);
      const center = getCenter(cp1, cp2);

      if (!lastDist.current) {
        lastDist.current = dist;
        lastCenter.current = center;
        return;
      }

      const pointTo = {
        x: (center.x - viewport.x) / viewport.scale,
        y: (center.y - viewport.y) / viewport.scale,
      };

      const newScale = viewport.scale * (dist / lastDist.current);
      const clampedScale = Math.max(0.1, Math.min(10, newScale));

      // Calculate new position to keep center fixed
      const newX = center.x - pointTo.x * clampedScale;
      const newY = center.y - pointTo.y * clampedScale;

      setViewport({
        scale: clampedScale,
        x: newX,
        y: newY,
      });

      lastDist.current = dist;
      lastCenter.current = center;
    }
  }, [viewport]);

  const handleTouchEnd = useCallback(() => {
    lastDist.current = 0;
    lastCenter.current = null;
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
    handlePan,
    handleTouch,
    handleTouchEnd
  };
}

