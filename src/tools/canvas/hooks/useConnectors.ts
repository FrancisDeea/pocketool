import { useState, useCallback } from 'react';
import type { Connector, Shape } from '../types';

export function useConnectors() {
  const [activeAnchor, setActiveAnchor] = useState<{ shapeId: string, anchor: 'N' | 'S' | 'E' | 'O' } | null>(null);

  const getAnchorPos = (shape: Shape, anchor: 'N' | 'S' | 'E' | 'O') => {
    const { x, y } = shape;
    let width = 0;
    let height = 0;

    if (shape.type === 'rect' || shape.type === 'triangle') {
      width = shape.width;
      height = shape.height;
    } else if (shape.type === 'ellipse') {
      width = shape.radiusX * 2;
      height = shape.radiusY * 2;
      // Adjust x,y for ellipse which is center based in Konva but we might store as top-left?
      // Konva Ellipse uses x,y as center.
    }

    switch (anchor) {
      case 'N': return { x: x + width / 2, y };
      case 'S': return { x: x + width / 2, y: y + height };
      case 'E': return { x: x + width, y: y + height / 2 };
      case 'O': return { x, y: y + height / 2 };
    }
  };

  return {
    activeAnchor,
    setActiveAnchor,
    getAnchorPos
  };
}
