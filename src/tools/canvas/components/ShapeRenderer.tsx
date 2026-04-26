import { memo } from 'react';
import { Rect, Ellipse, Line, Arrow, Text } from 'react-konva';
import type Konva from 'konva';
import type { Shape, RectShape, EllipseShape, TriangleShape } from '../types';

interface ShapeRendererProps {
  shape: Shape;
  snap?: boolean;
  scale?: number;
  viewport?: { x: number; y: number; scale: number };
  onSelect?: () => void;
  onDblClick?: (id: string) => void;
  onChange?: (newShape: Shape) => void;
  onDragMove?: () => void;
  isDraggable?: boolean;
}

const GRID_SIZE = 10;

/**
 * Snap a bounding box position so the closest edge (or center) snaps to the grid.
 * Considers left, right, center-X and top, bottom, center-Y.
 */
function snapBoxToGrid(
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number,
): { x: number; y: number } {
  const tolerance = Math.min(GRID_SIZE / 2, 6 / scale);

  function snapEdge(pos: number, size: number): number {
    const left = pos;
    const right = pos + size;
    const center = pos + size / 2;

    const nearLeft = Math.round(left / GRID_SIZE) * GRID_SIZE;
    const nearRight = Math.round(right / GRID_SIZE) * GRID_SIZE;
    const nearCenter = Math.round(center / GRID_SIZE) * GRID_SIZE;

    const dLeft = Math.abs(left - nearLeft);
    const dRight = Math.abs(right - nearRight);
    const dCenter = Math.abs(center - nearCenter);

    const minDist = Math.min(dLeft, dRight, dCenter);
    if (minDist > tolerance) return pos;
    if (minDist === dLeft) return nearLeft;
    if (minDist === dRight) return nearRight - size;
    return nearCenter - size / 2;
  }

  return {
    x: snapEdge(x, width),
    y: snapEdge(y, height),
  };
}

function ShapeRendererInner({
  shape,
  snap = false,
  scale = 1,
  viewport,
  onSelect,
  onDblClick,
  onChange,
  onDragMove,
  isDraggable = false,
}: ShapeRendererProps) {
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    // Keep stroke constant regardless of node scale (zoom + resize)
    strokeScaleEnabled: false,
    hitStrokeWidth: Math.max(shape.strokeWidth || 0, 20 / scale),
    opacity: shape.opacity,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    draggable: isDraggable,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: () => onDblClick?.(shape.id),
    onDblTap: () => onDblClick?.(shape.id),
    dragBoundFunc: (pos: { x: number; y: number }) => {
      if (!snap || !viewport) return pos;

      // Convert screen pos to world pos
      const worldX = (pos.x - viewport.x) / viewport.scale;
      const worldY = (pos.y - viewport.y) / viewport.scale;

      // Get shape dimensions for multi-edge snapping
      let width = 0;
      let height = 0;
      if (shape.type === 'rect' || shape.type === 'triangle') {
        width = (shape as RectShape).width;
        height = (shape as RectShape).height;
      } else if (shape.type === 'ellipse') {
        // Ellipse x/y is center, offset to get top-left
        width = (shape as EllipseShape).radiusX * 2;
        height = (shape as EllipseShape).radiusY * 2;
        const snapped = snapBoxToGrid(
          worldX - (shape as EllipseShape).radiusX,
          worldY - (shape as EllipseShape).radiusY,
          width,
          height,
          viewport.scale,
        );
        return {
          x: (snapped.x + (shape as EllipseShape).radiusX) * viewport.scale + viewport.x,
          y: (snapped.y + (shape as EllipseShape).radiusY) * viewport.scale + viewport.y,
        };
      }

      const snapped = snapBoxToGrid(worldX, worldY, width, height, viewport.scale);
      return {
        x: snapped.x * viewport.scale + viewport.x,
        y: snapped.y * viewport.scale + viewport.y,
      };
    },
    onDragMove: () => {
      onDragMove?.();
    },
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      onChange?.({
        ...shape,
        x: e.target.x(),
        y: e.target.y(),
      } as Shape);
    },
    onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      const scaleX = Math.abs(node.scaleX());
      const scaleY = Math.abs(node.scaleY());

      // Reset the node's scale back to 1 — dimensions are absorbed into the shape props
      node.scaleX(1);
      node.scaleY(1);

      if (shape.type === 'rect') {
        const s = shape as RectShape;
        onChange?.({
          ...s,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, s.width * scaleX),
          height: Math.max(5, s.height * scaleY),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        } as Shape);
      } else if (shape.type === 'triangle') {
        const s = shape as TriangleShape;
        onChange?.({
          ...s,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, s.width * scaleX),
          height: Math.max(5, s.height * scaleY),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        } as Shape);
      } else if (shape.type === 'ellipse') {
        const s = shape as EllipseShape;
        onChange?.({
          ...s,
          x: node.x(),
          y: node.y(),
          radiusX: Math.max(5, s.radiusX * scaleX),
          radiusY: Math.max(5, s.radiusY * scaleY),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        } as Shape);
      } else {
        onChange?.({
          ...shape,
          x: node.x(),
          y: node.y(),
          scaleX,
          scaleY,
          rotation: node.rotation(),
        } as Shape);
      }
    },
  };

  switch (shape.type) {
    case 'rect':
      return (
        <Rect
          {...commonProps}
          width={shape.width}
          height={shape.height}
          cornerRadius={shape.cornerRadius}
        />
      );

    case 'ellipse':
      return (
        <Ellipse
          {...commonProps}
          radiusX={shape.radiusX}
          radiusY={shape.radiusY}
        />
      );

    case 'triangle': {
      // Use a closed Line (polygon) instead of RegularPolygon for full control
      // x/y is top-left corner; triangle points: bottom-left, top-center, bottom-right
      const { width, height } = shape;
      return (
        <Line
          {...commonProps}
          points={[0, height, width / 2, 0, width, height]}
          closed
        />
      );
    }

    case 'line':
      return <Line {...commonProps} points={shape.points} lineCap="round" lineJoin="round" />;

    case 'arrow':
      return (
        <Arrow
          {...commonProps}
          points={shape.points}
          pointerLength={shape.headSize === 'small' ? 8 : shape.headSize === 'large' ? 20 : 13}
          pointerWidth={shape.headSize === 'small' ? 6 : shape.headSize === 'large' ? 16 : 10}
        />
      );

    case 'pen':
      return (
        <Line
          {...commonProps}
          points={shape.points}
          tension={shape.tension}
          lineCap="round"
          lineJoin="round"
        />
      );

    case 'text':
      return (
        <Text
          {...commonProps}
          text={shape.text}
          fontSize={shape.fontSize}
          fontStyle={shape.fontStyle}
          align={shape.align}
        />
      );

    default:
      return null;
  }
}

export const ShapeRenderer = memo(ShapeRendererInner, (prev, next) => {
  // Custom comparison: only re-render if the shape data or selection-related props changed
  return (
    prev.shape === next.shape &&
    prev.isDraggable === next.isDraggable &&
    prev.snap === next.snap &&
    prev.scale === next.scale &&
    prev.onDragMove === next.onDragMove
  );
});
