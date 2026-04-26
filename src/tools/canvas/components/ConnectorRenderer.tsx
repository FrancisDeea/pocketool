import { memo, type RefObject } from 'react';
import { Arrow, Circle, Group, Line as KonvaLine } from 'react-konva';
import type Konva from 'konva';
import type { Connector, Shape, AnchorSide } from '../types';
import { getAnchorPosition, getShapeBoundingBox } from '../types';

interface ConnectorRendererProps {
  connector: Connector;
  fromShape: Shape;
  toShape: Shape;
  stageRef?: RefObject<Konva.Stage | null>;
  /** Incremented during shape drag to force re-render for live connector updates */
  dragTick?: number;
  isSelected?: boolean;
  onSelect?: () => void;
}

const ANCHORS: AnchorSide[] = ['N', 'S', 'E', 'W'];

/**
 * Get the live bounding box of a shape by reading its Konva node position
 * during drag (when React state hasn't been committed yet).
 */
function getLiveAnchorPosition(
  shape: Shape,
  anchor: AnchorSide,
  stageRef?: RefObject<Konva.Stage | null>,
): { x: number; y: number } {
  if (stageRef?.current) {
    const node = stageRef.current.findOne('#' + shape.id);
    if (node) {
      // Read the live position from the Konva node (updated during drag)
      const liveX = node.x();
      const liveY = node.y();

      // Create a temporary shape with the live position to compute anchor
      const liveShape = { ...shape, x: liveX, y: liveY } as Shape;
      return getAnchorPosition(liveShape, anchor);
    }
  }
  return getAnchorPosition(shape, anchor);
}

function ConnectorRendererInner({
  connector,
  fromShape,
  toShape,
  stageRef,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  dragTick,
  isSelected = false,
  onSelect,
}: ConnectorRendererProps) {
  const start = getLiveAnchorPosition(fromShape, connector.fromAnchor, stageRef);
  const end = getLiveAnchorPosition(toShape, connector.toAnchor, stageRef);
  const points = [start.x, start.y, end.x, end.y];

  return (
    <Group>
      {/* Invisible fat hit area for easier clicking */}
      <KonvaLine
        points={points}
        stroke="transparent"
        strokeWidth={20}
        hitStrokeWidth={20}
        listening={true}
        onClick={onSelect}
        onTap={onSelect}
      />
      {/* Visible connector arrow */}
      <Arrow
        points={points}
        stroke={isSelected ? '#6366f1' : connector.stroke}
        strokeWidth={isSelected ? connector.strokeWidth + 1 : connector.strokeWidth}
        strokeScaleEnabled={false}
        dash={connector.style === 'dashed' ? [8, 4] : undefined}
        pointerLength={12}
        pointerWidth={10}
        fill={isSelected ? '#6366f1' : connector.stroke}
        lineCap="round"
        listening={false}
      />
    </Group>
  );
}

export const ConnectorRenderer = memo(ConnectorRendererInner, (prev, next) => {
  return (
    prev.connector === next.connector &&
    prev.fromShape === next.fromShape &&
    prev.toShape === next.toShape &&
    prev.dragTick === next.dragTick &&
    prev.isSelected === next.isSelected
  );
});

// ── Anchor dots shown when connector tool is active ──────────────────

interface AnchorDotsProps {
  shape: Shape;
  hoveredAnchorId?: string | null; // "shapeId:anchor"
  scale: number;
}

function AnchorDotsInner({ shape, hoveredAnchorId, scale }: AnchorDotsProps) {
  return (
    <Group>
      {ANCHORS.map((anchor) => {
        const pos = getAnchorPosition(shape, anchor);
        const isHovered = hoveredAnchorId === `${shape.id}:${anchor}`;
        return (
          <Circle
            key={anchor}
            x={pos.x}
            y={pos.y}
            radius={isHovered ? 7 / scale : 5 / scale}
            fill={isHovered ? '#6366f1' : 'white'}
            stroke="#6366f1"
            strokeWidth={2 / scale}
            strokeScaleEnabled={false}
            listening={false}
          />
        );
      })}
    </Group>
  );
}

export const AnchorDots = memo(AnchorDotsInner);

// ── Draft line while dragging a connector ────────────────────────────

interface DraftConnectorProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export function DraftConnector({ fromX, fromY, toX, toY }: DraftConnectorProps) {
  return (
    <Arrow
      points={[fromX, fromY, toX, toY]}
      stroke="#6366f1"
      strokeWidth={2}
      strokeScaleEnabled={false}
      dash={[6, 4]}
      pointerLength={12}
      pointerWidth={10}
      fill="#6366f1"
      opacity={0.8}
      listening={false}
    />
  );
}
