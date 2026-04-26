import { Layer, Shape } from "react-konva";
import { useStore } from "@nanostores/react";
import { $theme } from "@/stores/theme";
import type { ViewportState } from "../types";

interface GridLayerProps {
  viewport: ViewportState;
  width: number;
  height: number;
  isVisible?: boolean;
}

/**
 * GridLayer provides an infinite background grid for the canvas.
 * It uses a Shape with a custom sceneFunc to draw vector lines manually,
 * ensuring pixel-perfect sharpness at any zoom level.
 * Also renders a crosshair at world origin (0,0) as a permanent reference.
 */
export function GridLayer({ viewport, width, height, isVisible = true }: GridLayerProps) {
  const theme = useStore($theme);
  const isDark = theme.includes("dark");
  const isHC = theme.includes("-hc");

  const isZoomedOut = viewport.scale < 0.6;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context) => {
          const scale = viewport.scale;
          const invScale = 1 / scale;

          // Calculate visible bounds in world coordinates
          const viewX = -viewport.x * invScale;
          const viewY = -viewport.y * invScale;
          const viewW = width * invScale;
          const viewH = height * invScale;

          // ── Grid lines ────────────────────────────────────
          if (isVisible && !isZoomedOut) {
            const gridSize = 40;
            const subGridSize = 10;

            const startX = Math.floor(viewX / gridSize) * gridSize;
            const startY = Math.floor(viewY / gridSize) * gridSize;
            const endX = viewX + viewW + gridSize;
            const endY = viewY + viewH + gridSize;

            const drawLines = (step: number, color: string) => {
              context.beginPath();
              context.strokeStyle = color;
              context.lineWidth = invScale;

              for (let x = startX; x <= endX; x += step) {
                context.moveTo(x, startY);
                context.lineTo(x, endY);
              }
              for (let y = startY; y <= endY; y += step) {
                context.moveTo(startX, y);
                context.lineTo(endX, y);
              }
              context.stroke();
            };

            // Minor grid lines
            const subOpacity = Math.min(1, Math.max(0, (scale - 0.4) * 2));
            if (subOpacity > 0) {
              const subColor = isDark
                ? isHC
                  ? `rgba(255, 255, 255, ${0.2 * subOpacity})`
                  : `rgba(255, 255, 255, ${0.08 * subOpacity})`
                : isHC
                  ? `rgba(0, 0, 0, ${0.15 * subOpacity})`
                  : `rgba(0, 0, 0, ${0.05 * subOpacity})`;
              drawLines(subGridSize, subColor);
            }

            // Major grid lines
            const mainOpacity = Math.min(1, Math.max(0.3, scale * 2));
            const mainColor = isDark
              ? isHC
                ? `rgba(255, 255, 255, ${0.5 * mainOpacity})`
                : `rgba(255, 255, 255, ${0.18 * mainOpacity})`
              : isHC
                ? `rgba(0, 0, 0, ${0.4 * mainOpacity})`
                : `rgba(0, 0, 0, ${0.12 * mainOpacity})`;
            drawLines(gridSize, mainColor);
          }

          // ── Origin crosshair ──────────────────────────────
          // Always visible — drawn in world coordinates at (0, 0)
          // Size is inversely scaled so it remains ~24px on screen
          const crossSize = 16 * invScale;
          const crossLineWidth = 1.5 * invScale;
          const crossColor = isDark
            ? 'rgba(99, 102, 241, 0.8)'
            : 'rgba(99, 102, 241, 0.9)';

          context.beginPath();
          context.strokeStyle = crossColor;
          context.lineWidth = crossLineWidth;
          context.lineCap = 'round';

          // Horizontal arm
          context.moveTo(-crossSize, 0);
          context.lineTo(crossSize, 0);
          // Vertical arm
          context.moveTo(0, -crossSize);
          context.lineTo(0, crossSize);
          context.stroke();

          // Center dot
          context.beginPath();
          context.fillStyle = crossColor;
          context.arc(0, 0, 2.5 * invScale, 0, Math.PI * 2);
          context.fill();
        }}
      />
    </Layer>
  );
}
