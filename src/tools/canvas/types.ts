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

export interface Connector {
  id: string;
  fromShapeId: string;
  fromAnchor: 'N' | 'S' | 'E' | 'O';
  toShapeId: string;
  toAnchor: 'N' | 'S' | 'E' | 'O';
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
