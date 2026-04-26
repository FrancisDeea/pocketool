import Button from '@/components/ui/Button';
import { Minus, Plus } from 'lucide-react';
import type { PendingToolProperties } from '../hooks/useTools';
import type { ShapeType } from '../types';

interface PenPropertiesPanelProps {
  activeTool: ShapeType;
  properties: PendingToolProperties;
  onUpdate: (updates: PendingToolProperties) => void;
}

const TOOL_LABEL: Partial<Record<ShapeType, string>> = {
  pen: 'Pen',
  line: 'Line',
  arrow: 'Arrow',
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
};

/**
 * Floating properties panel shown before drawing — lets the user choose
 * stroke color, fill, stroke width, and opacity before placing a shape.
 */
export function PenPropertiesPanel({ activeTool, properties, onUpdate }: PenPropertiesPanelProps) {
  const label = TOOL_LABEL[activeTool] ?? activeTool;
  const isStrokeOnly = activeTool === 'pen' || activeTool === 'line' || activeTool === 'arrow';
  const strokeWidth = properties.strokeWidth ?? 2;
  const opacityPct = Math.round((properties.opacity ?? 1) * 100);

  return (
    <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 sm:gap-3 rounded-2xl border border-accent/30 bg-surface/95 p-2 sm:p-2.5 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Tool label */}
      <span className="text-[10px] font-bold uppercase tracking-wider text-accent px-1 shrink-0">
        {label}
      </span>

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Stroke color */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          {isStrokeOnly ? 'Color' : 'Stroke'}
        </label>
        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border cursor-pointer">
          <input
            type="color"
            className="absolute -inset-1 h-10 w-10 cursor-pointer border-0 bg-transparent p-0 opacity-0"
            value={properties.stroke ?? '#8b5cf6'}
            onChange={(e) => onUpdate({ stroke: e.target.value })}
          />
          <div
            className="h-full w-full rounded-md border-2"
            style={{ borderColor: properties.stroke ?? '#8b5cf6', backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      {/* Fill color — not shown for stroke-only tools */}
      {!isStrokeOnly && (
        <>
          <div className="h-6 w-px bg-border/70 shrink-0" />
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Fill</label>
            <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border cursor-pointer">
              <input
                type="color"
                className="absolute -inset-1 h-10 w-10 cursor-pointer border-0 bg-transparent p-0 opacity-0"
                value={properties.fill ?? '#3b82f6'}
                onChange={(e) => onUpdate({ fill: e.target.value })}
              />
              <div
                className="h-full w-full rounded-md"
                style={{ backgroundColor: properties.fill ?? '#3b82f6' }}
              />
            </div>
          </div>
        </>
      )}

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Stroke width */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">W</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onUpdate({ strokeWidth: Math.max(1, strokeWidth - 1) })}
        >
          <Minus size={14} />
        </Button>
        <span className="min-w-[1.5rem] text-center text-xs font-bold text-text-primary tabular-nums">
          {strokeWidth}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onUpdate({ strokeWidth: Math.min(50, strokeWidth + 1) })}
        >
          <Plus size={14} />
        </Button>
      </div>

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Opacity */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Opacity</label>
        <input
          type="range"
          min={10}
          max={100}
          value={opacityPct}
          onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
          className="w-16 accent-accent"
        />
        <span className="text-xs font-bold text-text-primary tabular-nums w-8 text-right">
          {opacityPct}%
        </span>
      </div>
    </div>
  );
}
