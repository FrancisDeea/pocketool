import { useState, useCallback, useRef } from 'react';
import type { Connector, AnchorSide, CanvasState } from '../types';
import { getAnchorPosition } from '../types';

const ANCHOR_DETECT_RADIUS = 24; // px in screen space

export interface ConnectorDraft {
  fromShapeId: string;
  fromAnchor: AnchorSide;
  toX: number; // current cursor position (world coords)
  toY: number;
}

// Fallback for crypto.randomUUID in non-secure contexts (e.g. testing on local IP)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function useConnectors(
  state: CanvasState,
  pushState: (s: CanvasState) => void,
  viewport: { x: number; y: number; scale: number }
) {
  const [draft, setDraft] = useState<ConnectorDraft | null>(null);
  const draftRef = useRef<ConnectorDraft | null>(null);
  const [hoveredAnchor, setHoveredAnchor] = useState<{
    shapeId: string;
    anchor: AnchorSide;
  } | null>(null);
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;

  /** Find the closest anchor point to a world-coordinate pointer. Returns null if none is close enough. */
  const findClosestAnchor = useCallback(
    (worldX: number, worldY: number, excludeShapeId?: string) => {
      const anchors: AnchorSide[] = ['N', 'S', 'E', 'W'];
      let closest: { shapeId: string; anchor: AnchorSide; dist: number } | null = null;

      const v = viewportRef.current;
      const screenRadius = ANCHOR_DETECT_RADIUS / v.scale; // convert screen px → world px

      for (const shape of state.shapes) {
        if (shape.id === excludeShapeId) continue;
        for (const anchor of anchors) {
          const pos = getAnchorPosition(shape, anchor);
          const dist = Math.sqrt(Math.pow(pos.x - worldX, 2) + Math.pow(pos.y - worldY, 2));
          if (dist < screenRadius && (!closest || dist < closest.dist)) {
            closest = { shapeId: shape.id, anchor, dist };
          }
        }
      }

      return closest;
    },
    [state.shapes]
  );

  /** Called when a pointer-down happens in connector mode */
  const handleConnectorDown = useCallback(
    (worldX: number, worldY: number) => {
      const closest = findClosestAnchor(worldX, worldY);
      if (closest) {
        const newDraft = {
          fromShapeId: closest.shapeId,
          fromAnchor: closest.anchor,
          toX: worldX,
          toY: worldY,
        };
        draftRef.current = newDraft;
        setDraft(newDraft);
      }
    },
    [findClosestAnchor]
  );

  /** Called on pointer-move to update the draft endpoint and detect target anchor */
  const handleConnectorMove = useCallback(
    (worldX: number, worldY: number) => {
      setDraft((prev) => {
        if (!prev) return null;
        const newDraft = { ...prev, toX: worldX, toY: worldY };
        draftRef.current = newDraft;
        return newDraft;
      });

      const closest = findClosestAnchor(worldX, worldY);
      setHoveredAnchor(closest ? { shapeId: closest.shapeId, anchor: closest.anchor } : null);
    },
    [findClosestAnchor]
  );

  /** Called on pointer-up to finalise or cancel the connector */
  const handleConnectorUp = useCallback(
    (worldX: number, worldY: number) => {
      const currentDraft = draftRef.current;
      if (!currentDraft) return;

      const closest = findClosestAnchor(worldX, worldY, currentDraft.fromShapeId);
      if (closest && closest.shapeId !== currentDraft.fromShapeId) {
        const connector: Connector = {
          id: generateId(),
          fromShapeId: currentDraft.fromShapeId,
          fromAnchor: currentDraft.fromAnchor,
          toShapeId: closest.shapeId,
          toAnchor: closest.anchor,
          type: 'straight',
          style: 'solid',
          stroke: '#6b7280',
          strokeWidth: 2,
        };
        pushState({
          ...state,
          connectors: [...state.connectors, connector],
        });
      }

      draftRef.current = null;
      setDraft(null);
      setHoveredAnchor(null);
    },
    [findClosestAnchor, state, pushState]
  );

  const cancelConnector = useCallback(() => {
    draftRef.current = null;
    setDraft(null);
    setHoveredAnchor(null);
  }, []);

  return {
    draft,
    hoveredAnchor,
    handleConnectorDown,
    handleConnectorMove,
    handleConnectorUp,
    cancelConnector,
    findClosestAnchor,
    getAnchorPosition,
  };
}
