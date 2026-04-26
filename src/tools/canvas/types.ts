export type ShapeType = 'select' | 'rect' | 'ellipse' | 'triangle' | 'line' | 'arrow' | 'connector' | 'pen' | 'text' | 'pan';

export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface EllipseShape extends BaseShape {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface TriangleShape extends BaseShape {
  type: 'triangle';
  width: number;
  height: number;
}

export interface LineShape extends BaseShape {
  type: 'line';
  points: number[];
}

export interface ArrowShape extends BaseShape {
  type: 'arrow';
  points: number[];
  headSize?: 'small' | 'medium' | 'large';
}

export interface PenShape extends BaseShape {
  type: 'pen';
  points: number[];
  tension: number;
}

export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontStyle: string;
  align: 'left' | 'center' | 'right';
}

/** Anchor side: N=top, S=bottom, E=right, W=left */
export type AnchorSide = 'N' | 'S' | 'E' | 'W';

export interface Connector {
  id: string;
  fromShapeId: string;
  fromAnchor: AnchorSide;
  toShapeId: string;
  toAnchor: AnchorSide;
  type: 'straight' | 'elbow';
  style: 'solid' | 'dashed';
  stroke: string;
  strokeWidth: number;
}

export type Shape = RectShape | EllipseShape | TriangleShape | LineShape | ArrowShape | PenShape | TextShape;

export interface ViewportState {
  x: number;
  y: number;
  scale: number;
}

export interface CanvasState {
  shapes: Shape[];
  connectors: Connector[];
}

/** Computed bounding box of a shape in world coordinates */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Computes the world-coordinate bounding box for any shape */
export function getShapeBoundingBox(shape: Shape): BoundingBox {
  switch (shape.type) {
    case 'rect':
    case 'triangle':
      return { x: shape.x, y: shape.y, width: shape.width, height: shape.height };
    case 'ellipse':
      return {
        x: shape.x - shape.radiusX,
        y: shape.y - shape.radiusY,
        width: shape.radiusX * 2,
        height: shape.radiusY * 2,
      };
    case 'line':
    case 'arrow':
    case 'pen': {
      const pts = shape.points;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let i = 0; i < pts.length; i += 2) {
        const px = shape.x + pts[i];
        const py = shape.y + pts[i + 1];
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
      return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    case 'text':
      // Approximate text bounding box
      return {
        x: shape.x,
        y: shape.y,
        width: shape.fontSize * (shape.text?.length || 1) * 0.6,
        height: shape.fontSize * 1.4,
      };
    default: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = shape as any;
      return { x: s.x ?? 0, y: s.y ?? 0, width: 0, height: 0 };
    }
  }
}

/** Returns the anchor point position for a shape in world coordinates */
export function getAnchorPosition(shape: Shape, anchor: AnchorSide): { x: number; y: number } {
  const bb = getShapeBoundingBox(shape);
  switch (anchor) {
    case 'N': return { x: bb.x + bb.width / 2, y: bb.y };
    case 'S': return { x: bb.x + bb.width / 2, y: bb.y + bb.height };
    case 'E': return { x: bb.x + bb.width, y: bb.y + bb.height / 2 };
    case 'W': return { x: bb.x, y: bb.y + bb.height / 2 };
  }
}
