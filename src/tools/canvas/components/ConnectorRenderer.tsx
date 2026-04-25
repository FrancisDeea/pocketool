import { Line, Arrow } from 'react-konva';
import type { Connector, Shape } from '../types';

interface ConnectorRendererProps {
  connector: Connector;
  fromShape: Shape;
  toShape: Shape;
}

export function ConnectorRenderer({ connector, fromShape, toShape }: ConnectorRendererProps) {
  const getAnchorPos = (shape: Shape, anchor: string) => {
    // Basic implementation for now
    const { x, y } = shape;
    let w = (shape as any).width || ((shape as any).radiusX * 2) || 0;
    let h = (shape as any).height || ((shape as any).radiusY * 2) || 0;
    
    // Konva Ellipse is centered
    const ox = shape.type === 'ellipse' ? x - w/2 : x;
    const oy = shape.type === 'ellipse' ? y - h/2 : y;

    switch (anchor) {
      case 'N': return [ox + w / 2, oy];
      case 'S': return [ox + w / 2, oy + h];
      case 'E': return [ox + w, oy + h / 2];
      case 'O': return [ox, oy + h / 2];
      default: return [x, y];
    }
  };

  const start = getAnchorPos(fromShape, connector.fromAnchor);
  const end = getAnchorPos(toShape, connector.toAnchor);

  const points = [...start, ...end];

  return (
    <Arrow
      points={points}
      stroke={connector.stroke}
      strokeWidth={connector.strokeWidth}
      dash={connector.style === 'dashed' ? [5, 5] : undefined}
      pointerLength={10}
      pointerWidth={10}
    />
  );
}
