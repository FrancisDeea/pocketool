import { Rect, Ellipse, Line, Arrow, Text, RegularPolygon } from 'react-konva';
import type Konva from 'konva';
import type { Shape, RectShape, EllipseShape, TriangleShape } from '../types';

interface ShapeRendererProps {
  shape: Shape;
  snap?: boolean;
  scale?: number;
  viewport?: { x: number, y: number };
  onSelect?: () => void;
  onDblClick?: (id: string) => void;
  onChange?: (newShape: Shape) => void;
  isDraggable?: boolean;
}

export function ShapeRenderer({ shape, snap, scale = 1, viewport, onSelect, onDblClick, onChange, isDraggable = false }: ShapeRendererProps) {
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    fill: shape.fill,
    stroke: shape.stroke,
    strokeWidth: shape.strokeWidth,
    hitStrokeWidth: Math.max(shape.strokeWidth || 0, 20 / scale), // Larger hit area for touch
    opacity: shape.opacity,
    rotation: shape.rotation,
    scaleX: shape.scaleX,
    scaleY: shape.scaleY,
    draggable: isDraggable,
    onClick: onSelect,
    onTap: onSelect,
    onDblClick: () => onDblClick?.(shape.id),
    onDblTap: () => onDblClick?.(shape.id),
    dragBoundFunc: (pos: { x: number, y: number }) => {
      if (!snap || !viewport) return pos;

      const gridSize = 10;
      const tolerance = Math.min(gridSize / 2, 5 / scale);

      const worldX = (pos.x - viewport.x) / scale;
      const worldY = (pos.y - viewport.y) / scale;

      const nearestX = Math.round(worldX / gridSize) * gridSize;
      const nearestY = Math.round(worldY / gridSize) * gridSize;

      const snappedWorldX = Math.abs(worldX - nearestX) < tolerance ? nearestX : worldX;
      const snappedWorldY = Math.abs(worldY - nearestY) < tolerance ? nearestY : worldY;

      return {
        x: snappedWorldX * scale + viewport.x,
        y: snappedWorldY * scale + viewport.y,
      };
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
      const scaleX = node.scaleX();
      const scaleY = node.scaleY();
      
      node.scaleX(1);
      node.scaleY(1);

      if (shape.type === 'rect' || shape.type === 'triangle') {
        const s = shape as RectShape | TriangleShape;
        onChange?.({
          ...s,
          x: node.x(),
          y: node.y(),
          width: Math.max(5, (s.width || 0) * scaleX),
          height: Math.max(5, (s.height || 0) * scaleY),
          rotation: node.rotation(),
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
      return <Rect {...commonProps} width={shape.width} height={shape.height} cornerRadius={shape.cornerRadius} />;
    case 'ellipse':
      return <Ellipse {...commonProps} radiusX={shape.radiusX} radiusY={shape.radiusY} />;
    case 'triangle':
      return (
        <RegularPolygon
          {...commonProps}
          x={shape.x + shape.width / 2}
          y={shape.y + shape.height / 2}
          sides={3}
          radius={Math.max(shape.width, shape.height) / 2}
          scaleX={shape.width / Math.max(shape.width, shape.height)}
          scaleY={shape.height / Math.max(shape.width, shape.height)}
        />
      );
    case 'line':
      return <Line {...commonProps} points={shape.points} />;
    case 'arrow':
      return <Arrow {...commonProps} points={shape.points} />;
    case 'pen':
      return <Line {...commonProps} points={shape.points} tension={shape.tension} lineCap="round" lineJoin="round" />;
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


