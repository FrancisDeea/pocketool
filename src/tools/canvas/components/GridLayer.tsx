import { Layer, Shape } from "react-konva";
import { useStore } from "@nanostores/react";
import { $theme } from "@/stores/theme";
import type { ViewportState } from "../types";

interface GridLayerProps {
  viewport: ViewportState;
  width: number;
  height: number;
  isVisible?: boolean;
  showOrigin?: boolean;
}

/**
 * GridLayer provides an infinite background grid for the canvas.
 * It uses a Shape with a custom sceneFunc to draw vector lines manually,
 * ensuring pixel-perfect sharpness at any zoom level.
 * Also renders a crosshair at world origin (0,0) as a permanent reference.
 */
export function GridLayer({ viewport, width, height, isVisible = true, showOrigin = true }: GridLayerProps) {
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
          if (showOrigin) {
            // Infinite light green cross at world (0, 0)
            const crossColor = isDark
              ? "rgba(74, 222, 128, 0.45)" // Light green (green-400 equivalent)
              : "rgba(34, 197, 94, 0.45)"; // Slightly darker green for light mode

            context.beginPath();
            context.strokeStyle = crossColor;
            context.lineWidth = 1.5 * invScale;

            // Horizontal infinite line at world y=0
            context.moveTo(viewX, 0);
            context.lineTo(viewX + viewW, 0);

            // Vertical infinite line at world x=0
            context.moveTo(0, viewY);
            context.lineTo(0, viewY + viewH);
            context.stroke();

            // Origin point marker
            context.beginPath();
            context.fillStyle = crossColor;
            context.arc(0, 0, 4 * invScale, 0, Math.PI * 2);
            context.fill();
          }
        }}
      />
    </Layer>
  );
}

