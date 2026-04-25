import { useState, useCallback } from 'react';
import type Konva from 'konva';
import type { Shape, ShapeType, ViewportState, CanvasState, RectShape, EllipseShape, TriangleShape, LineShape, ArrowShape, PenShape, TextShape } from '../types';

export function useTools(
  activeTool: ShapeType,
  state: CanvasState,
  pushState: (state: CanvasState) => void,
  viewport: ViewportState,
  snap: boolean,
  onTextCreate?: (shape: Shape) => void
) {
  const [newShape, setNewShape] = useState<Shape | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const DEFAULT_COLORS: Record<ShapeType, { fill: string; stroke: string }> = {
    select: { fill: 'transparent', stroke: 'transparent' },
    pan: { fill: 'transparent', stroke: 'transparent' },
    rect: { fill: '#3b82f6', stroke: '#1d4ed8' },
    ellipse: { fill: '#10b981', stroke: '#047857' },
    triangle: { fill: '#f59e0b', stroke: '#b45309' },
    line: { fill: '#6b7280', stroke: '#374151' },
    arrow: { fill: '#ef4444', stroke: '#b91c1c' },
    pen: { fill: 'transparent', stroke: '#8b5cf6' },
    text: { fill: '#000000', stroke: 'transparent' },
    connector: { fill: 'transparent', stroke: '#6b7280' },
  };

  const getPointerPosition = (stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - viewport.x) / viewport.scale,
      y: (pos.y - viewport.y) / viewport.scale,
    };
  };

  const snapToGrid = (val: number) => {
    if (!snap) return val;
    const step = 10;
    // Magnetic feel: only snap if within 5 units
    const tolerance = 5;
    const nearest = Math.round(val / step) * step;
    return Math.abs(val - nearest) < tolerance ? nearest : val;
  };

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'select' || activeTool === 'pan') return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPointerPosition(stage);
    
    const startX = snapToGrid(pos.x);
    const startY = snapToGrid(pos.y);
    const id = crypto.randomUUID();
    const colors = DEFAULT_COLORS[activeTool] || { fill: '#3b82f6', stroke: '#2563eb' };

    setOrigin({ x: startX, y: startY });

    const baseShape = {
      id,
      x: startX,
      y: startY,
      fill: colors.fill,
      stroke: colors.stroke,
      strokeWidth: activeTool === 'text' ? 0 : 1,
      opacity: 1,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
    };

    let shape: Shape | null = null;

    switch (activeTool) {
      case 'rect':
        shape = { ...baseShape, type: 'rect', width: 0, height: 0 } as RectShape;
        break;
      case 'triangle':
        shape = { ...baseShape, type: 'triangle', width: 0, height: 0 } as TriangleShape;
        break;
      case 'ellipse':
        shape = { ...baseShape, type: 'ellipse', radiusX: 0, radiusY: 0 } as EllipseShape;
        break;
      case 'line':
        shape = { ...baseShape, type: 'line', points: [0, 0] } as LineShape;
        break;
      case 'arrow':
        shape = { ...baseShape, type: 'arrow', points: [0, 0] } as ArrowShape;
        break;
      case 'pen':
        shape = { ...baseShape, type: 'pen', points: [0, 0], tension: 0.5 } as PenShape;
        break;
      case 'text':
        shape = { ...baseShape, type: 'text', text: 'Text', fontSize: 20, fontStyle: 'normal', align: 'left' } as TextShape;
        break;
    }

    if (shape) {
      setNewShape(shape);
    }
  }, [activeTool, viewport, snap, state]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!newShape) return;

    const stage = e.target.getStage();
    if (!stage) return;
    const pos = getPointerPosition(stage);
    const currentX = snapToGrid(pos.x);
    const currentY = snapToGrid(pos.y);

    const updated = { ...newShape } as Shape;

    switch (updated.type) {
      case 'rect':
      case 'triangle':
        updated.width = currentX - origin.x;
        updated.height = currentY - origin.y;
        break;
      case 'ellipse':
        updated.radiusX = Math.abs(currentX - origin.x);
        updated.radiusY = Math.abs(currentY - origin.y);
        break;
      case 'line':
      case 'arrow':
      case 'pen':
        const dx = pos.x - updated.x;
        const dy = pos.y - updated.y;
        if (updated.type === 'pen') {
          updated.points = [...updated.points, dx, dy];
        } else {
          updated.points = [0, 0, dx, dy];
        }
        break;
    }

    setNewShape(updated);
  }, [newShape, activeTool, origin, viewport, snap]);

  const handleMouseUp = useCallback(() => {
    if (!newShape) return;

    // Filter out zero-size shapes
    const isVisible = (s: Shape): boolean => {
      switch (s.type) {
        case 'rect':
        case 'triangle':
          return Math.abs(s.width || 0) > 2 || Math.abs(s.height || 0) > 2;
        case 'ellipse':
          return s.radiusX > 2 || s.radiusY > 2;
        case 'line':
        case 'arrow':
        case 'pen':
          return s.points.length >= 4;
        case 'text':
          return true;
        default:
          return false;
      }
    };

    if (isVisible(newShape)) {
      pushState({
        ...state,
        shapes: [...state.shapes, newShape],
      });
      if (newShape.type === 'text') {
        onTextCreate?.(newShape);
      }
    }
    setNewShape(null);
  }, [newShape, state, pushState, onTextCreate]);

  return {
    newShape,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}

