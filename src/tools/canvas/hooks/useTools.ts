import { useState, useCallback, useRef, useEffect } from 'react';
import type Konva from 'konva';
import type {
  Shape,
  ShapeType,
  ViewportState,
  CanvasState,
  RectShape,
  EllipseShape,
  TriangleShape,
  LineShape,
  ArrowShape,
  PenShape,
  TextShape,
} from '../types';

export interface PendingToolProperties {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export function useTools(
  activeTool: ShapeType,
  state: CanvasState,
  pushState: (state: CanvasState) => void,
  viewport: ViewportState,
  snap: boolean,
  onTextCreate?: (shape: Shape) => void,
  pendingProperties?: PendingToolProperties,
) {
  const [newShape, setNewShape] = useState<Shape | null>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  // Use refs for values needed in callbacks to avoid stale closures
  const viewportRef = useRef(viewport);
  const snapRef = useRef(snap);
  const stateRef = useRef(state);
  const pendingPropsRef = useRef(pendingProperties);
  const newShapeRef = useRef(newShape);
  const originRef = useRef(origin);

  // Keep refs in sync
  useEffect(() => { viewportRef.current = viewport; }, [viewport]);
  useEffect(() => { snapRef.current = snap; }, [snap]);
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { pendingPropsRef.current = pendingProperties; }, [pendingProperties]);
  useEffect(() => { newShapeRef.current = newShape; }, [newShape]);
  useEffect(() => { originRef.current = origin; }, [origin]);

  const DEFAULT_COLORS: Record<ShapeType, { fill: string; stroke: string }> = {
    select: { fill: 'transparent', stroke: 'transparent' },
    pan: { fill: 'transparent', stroke: 'transparent' },
    rect: { fill: '#3b82f6', stroke: '#1d4ed8' },
    ellipse: { fill: '#10b981', stroke: '#047857' },
    triangle: { fill: '#f59e0b', stroke: '#b45309' },
    line: { fill: 'transparent', stroke: '#6b7280' },
    arrow: { fill: '#ef4444', stroke: '#b91c1c' },
    pen: { fill: 'transparent', stroke: '#8b5cf6' },
    text: { fill: '#000000', stroke: 'transparent' },
    connector: { fill: 'transparent', stroke: '#6b7280' },
  };

  const getPointerPosition = (stage: Konva.Stage) => {
    const pos = stage.getPointerPosition();
    const v = viewportRef.current;
    if (!pos) return { x: 0, y: 0 };
    return {
      x: (pos.x - v.x) / v.scale,
      y: (pos.y - v.y) / v.scale,
    };
  };

  const snapVal = (val: number): number => {
    if (!snapRef.current) return val;
    const step = 10;
    return Math.round(val / step) * step;
  };

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (activeTool === 'select' || activeTool === 'pan') return;

      // Ignore multi-touch for drawing
      if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = getPointerPosition(stage);

      const startX = snapVal(pos.x);
      const startY = snapVal(pos.y);
      const id = crypto.randomUUID();
      const colors = DEFAULT_COLORS[activeTool] || { fill: '#3b82f6', stroke: '#2563eb' };
      const pending = pendingPropsRef.current;

      setOrigin({ x: startX, y: startY });

      const baseShape = {
        id,
        x: startX,
        y: startY,
        fill: pending?.fill ?? colors.fill,
        stroke: pending?.stroke ?? colors.stroke,
        strokeWidth: pending?.strokeWidth ?? (activeTool === 'text' ? 0 : 1),
        opacity: pending?.opacity ?? 1,
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
          // Ellipse: x/y will be the center, start at the origin
          shape = { ...baseShape, type: 'ellipse', radiusX: 0, radiusY: 0 } as EllipseShape;
          break;
        case 'line':
          shape = { ...baseShape, type: 'line', points: [0, 0, 0, 0] } as LineShape;
          break;
        case 'arrow':
          shape = { ...baseShape, type: 'arrow', points: [0, 0, 0, 0], headSize: 'medium' } as ArrowShape;
          break;
        case 'pen':
          shape = { ...baseShape, type: 'pen', points: [0, 0], tension: 0.5 } as PenShape;
          break;
        case 'text':
          shape = {
            ...baseShape,
            type: 'text',
            text: 'Text',
            fontSize: pending?.strokeWidth ? pending.strokeWidth * 8 : 20,
            fontStyle: 'normal',
            align: 'left',
          } as TextShape;
          break;
      }

      if (shape) {
        setNewShape(shape);
      }
    },
    // Only re-create when the active tool changes; viewport/snap/state via refs
    [activeTool],
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!newShapeRef.current) return;

      // Ignore multi-touch for drawing
      if (e.evt instanceof TouchEvent && e.evt.touches.length > 1) return;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = getPointerPosition(stage);
      const org = originRef.current;

      // Raw snapped current position
      const currentX = snapVal(pos.x);
      const currentY = snapVal(pos.y);

      setNewShape(prev => {
        if (!prev) return null;
        const updated = { ...prev } as Shape;

        switch (updated.type) {
          case 'rect':
          case 'triangle': {
            // Support dragging in any direction
            const x = Math.min(org.x, currentX);
            const y = Math.min(org.y, currentY);
            const w = Math.abs(currentX - org.x);
            const h = Math.abs(currentY - org.y);
            (updated as RectShape | TriangleShape).x = x;
            (updated as RectShape | TriangleShape).y = y;
            (updated as RectShape | TriangleShape).width = w;
            (updated as RectShape | TriangleShape).height = h;
            break;
          }
          case 'ellipse': {
            // Center between origin and current pointer
            const cx = (org.x + currentX) / 2;
            const cy = (org.y + currentY) / 2;
            const rx = Math.abs(currentX - org.x) / 2;
            const ry = Math.abs(currentY - org.y) / 2;
            (updated as EllipseShape).x = cx;
            (updated as EllipseShape).y = cy;
            (updated as EllipseShape).radiusX = rx;
            (updated as EllipseShape).radiusY = ry;
            break;
          }
          case 'line':
          case 'arrow': {
            const dx = currentX - org.x;
            const dy = currentY - org.y;
            (updated as LineShape | ArrowShape).points = [0, 0, dx, dy];
            break;
          }
          case 'pen': {
            const dx = pos.x - org.x;
            const dy = pos.y - org.y;
            (updated as PenShape).points = [...(prev as PenShape).points, dx, dy];
            break;
          }
        }

        return updated;
      });
    },
    // Only depends on activeTool; all other state via refs/closures
    [activeTool],
  );

  const handleMouseUp = useCallback(() => {
    const shape = newShapeRef.current;
    if (!shape) return;

    const isVisible = (s: Shape): boolean => {
      switch (s.type) {
        case 'rect':
        case 'triangle':
          return Math.abs((s as RectShape).width) > 2 || Math.abs((s as RectShape).height) > 2;
        case 'ellipse':
          return (s as EllipseShape).radiusX > 2 || (s as EllipseShape).radiusY > 2;
        case 'line':
        case 'arrow':
        case 'pen':
          return (s as LineShape).points.length >= 4;
        case 'text':
          return true;
        default:
          return false;
      }
    };

    if (isVisible(shape)) {
      pushState({
        ...stateRef.current,
        shapes: [...stateRef.current.shapes, shape],
      });
      if (shape.type === 'text') {
        onTextCreate?.(shape);
      }
    }
    setNewShape(null);
  }, [pushState, onTextCreate]);

  return {
    newShape,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
}
