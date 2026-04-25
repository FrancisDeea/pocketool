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
 * ensuring pixel-perfect sharpness at any zoom level by compensating 
 * for the stage scale in real-time.
 */
export function GridLayer({ viewport, width, height, isVisible = true }: GridLayerProps) {
  const theme = useStore($theme);
  const isDark = theme.includes("dark");
  const isHC = theme.includes("-hc");

  // User requested to hide the grid if zoom is below 60%
  const isZoomedOut = viewport.scale < 0.6;

  if (!isVisible || isZoomedOut) return null;

  const gridSize = 40;
  const subGridSize = 10;

  return (
    <Layer listening={false}>
      <Shape
        sceneFunc={(context, shape) => {
          const scale = viewport.scale;
          const invScale = 1 / scale;
          
          // Calculate visible bounds in world coordinates
          const viewX = -viewport.x * invScale;
          const viewY = -viewport.y * invScale;
          const viewW = width * invScale;
          const viewH = height * invScale;

          // Snapping start/end to grid to ensure full coverage
          const startX = Math.floor(viewX / gridSize) * gridSize;
          const startY = Math.floor(viewY / gridSize) * gridSize;
          const endX = viewX + viewW + gridSize;
          const endY = viewY + viewH + gridSize;

          /**
           * Internal helper to draw a grid of lines.
           * By setting lineWidth to invScale, the resulting line on screen 
           * is always exactly 1 logical pixel thick, regardless of zoom.
           */
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

          // 1. Draw Subgrid (Minor lines)
          // Fades out when zooming out to prevent visual noise (moiré)
          const subOpacity = Math.min(1, Math.max(0, (scale - 0.4) * 2));
          if (subOpacity > 0) {
            const subColor = isDark
              ? isHC ? `rgba(255, 255, 255, ${0.2 * subOpacity})` : `rgba(255, 255, 255, ${0.08 * subOpacity})`
              : isHC ? `rgba(0, 0, 0, ${0.15 * subOpacity})` : `rgba(0, 0, 0, ${0.05 * subOpacity})`;
            drawLines(subGridSize, subColor);
          }

          // 2. Draw Main Grid (Major lines)
          // Stays visible but gets slightly softer at extreme zoom-out
          const mainOpacity = Math.min(1, Math.max(0.3, scale * 2));
          const mainColor = isDark
            ? isHC ? `rgba(255, 255, 255, ${0.5 * mainOpacity})` : `rgba(255, 255, 255, ${0.18 * mainOpacity})`
            : isHC ? `rgba(0, 0, 0, ${0.4 * mainOpacity})` : `rgba(0, 0, 0, ${0.12 * mainOpacity})`;
          drawLines(gridSize, mainColor);
        }}
      />
    </Layer>
  );
}
