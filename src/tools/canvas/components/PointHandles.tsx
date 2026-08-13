import { Group, Circle } from 'react-konva';
import type Konva from 'konva';
import type { Shape, LineShape, ArrowShape, ViewportState } from '../types';

interface PointHandlesProps {
  shape: LineShape | ArrowShape;
  viewport: ViewportState;
  snap: boolean;
  onChange: (shape: Shape) => void;
}

export function PointHandles({ shape, viewport, snap, onChange }: PointHandlesProps) {
  const gridSize = 10;

  const snapToGrid = (val: number) => {
    if (!snap) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  const getAbsolutePoints = () => {
    const { x, y, rotation, points } = shape;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const x1 = x;
    const y1 = y;
    const x2 = x + points[2] * cos - points[3] * sin;
    const y2 = y + points[2] * sin + points[3] * cos;

    return [
      { x: x1, y: y1 },
      { x: x2, y: y2 },
    ];
  };

  const updateShapeGeometry = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    const pos = e.target.position();
    const snappedX = snapToGrid(pos.x);
    const snappedY = snapToGrid(pos.y);

    // Update handle position to snapped
    e.target.position({ x: snappedX, y: snappedY });

    // Find the actual line/arrow node to update it visually
    const shapeNode = stage.findOne('#' + shape.id) as Konva.Line | Konva.Arrow;
    if (!shapeNode) return;

    const points = [...shape.points];
    const absPoints = getAbsolutePoints();

    if (index === 0) {
      // Moving start point (x, y)
      const targetAbsEnd = absPoints[1];

      shapeNode.x(snappedX);
      shapeNode.y(snappedY);

      const rad = (-shapeNode.rotation() * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dx = targetAbsEnd.x - snappedX;
      const dy = targetAbsEnd.y - snappedY;

      points[2] = dx * cos - dy * sin;
      points[3] = dx * sin + dy * cos;
      shapeNode.points([0, 0, points[2], points[3]]);
    } else {
      // Moving end point
      const rad = (-shapeNode.rotation() * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      const dx = snappedX - shapeNode.x();
      const dy = snappedY - shapeNode.y();

      points[2] = dx * cos - dy * sin;
      points[3] = dx * sin + dy * cos;
      shapeNode.points([0, 0, points[2], points[3]]);
    }

    return { x: shapeNode.x(), y: shapeNode.y(), points };
  };

  const handleDragMove = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    updateShapeGeometry(index, e);
    e.target.getLayer()?.batchDraw();
  };

  const handleDragEnd = (index: number, e: Konva.KonvaEventObject<DragEvent>) => {
    const result = updateShapeGeometry(index, e);
    if (result) {
      onChange({
        ...shape,
        x: result.x,
        y: result.y,
        points: result.points,
      } as Shape);
    }
  };

  const absPoints = getAbsolutePoints();

  return (
    <Group>
      {absPoints.map((p, i) => (
        <Circle
          key={i}
          x={p.x}
          y={p.y}
          radius={8 / viewport.scale}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={2 / viewport.scale}
          draggable
          onDragMove={(e) => handleDragMove(i, e)}
          onDragEnd={(e) => handleDragEnd(i, e)}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'move';
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      ))}
    </Group>
  );
}
