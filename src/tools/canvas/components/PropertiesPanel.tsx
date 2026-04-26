import Button from '@/components/ui/Button';
import {
  Bold,
  Italic,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import type { Shape } from '../types';

interface PropertiesPanelProps {
  selectedShapes: Shape[];
  onUpdate: (updates: Partial<Shape>) => void;
  onClose: () => void;
}

export function PropertiesPanel({ selectedShapes, onUpdate, onClose }: PropertiesPanelProps) {
  if (selectedShapes.length === 0) return null;

  const isSingle = selectedShapes.length === 1;
  const first = selectedShapes[0];

  const common = {
    fill: selectedShapes.every((s) => s.fill === first.fill) ? first.fill : '',
    stroke: selectedShapes.every((s) => s.stroke === first.stroke) ? first.stroke : '',
    strokeWidth: selectedShapes.every((s) => s.strokeWidth === first.strokeWidth)
      ? first.strokeWidth
      : 1,
    opacity: selectedShapes.every((s) => s.opacity === first.opacity) ? first.opacity : 1,
  };

  const opacityPct = Math.round((common.opacity ?? 1) * 100);

  return (
    <div className="absolute bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-surface/95 p-2 sm:p-2.5 shadow-2xl backdrop-blur-md max-w-[calc(100vw-2rem)] overflow-x-auto no-scrollbar transition-all animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Close */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 shrink-0 text-text-tertiary hover:text-text-primary"
        onClick={onClose}
      >
        <X size={14} />
      </Button>

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Fill */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Fill</label>
        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border cursor-pointer">
          <input
            type="color"
            className="absolute -inset-1 h-10 w-10 cursor-pointer border-0 bg-transparent p-0 opacity-0"
            value={common.fill || '#000000'}
            onChange={(e) => onUpdate({ fill: e.target.value })}
          />
          <div
            className="h-full w-full rounded-md"
            style={{ backgroundColor: common.fill || '#000000' }}
          />
        </div>
      </div>

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Stroke */}
      <div className="flex items-center gap-2 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Stroke</label>
        <div className="relative h-7 w-7 overflow-hidden rounded-md border border-border cursor-pointer">
          <input
            type="color"
            className="absolute -inset-1 h-10 w-10 cursor-pointer border-0 bg-transparent p-0 opacity-0"
            value={common.stroke || '#000000'}
            onChange={(e) => onUpdate({ stroke: e.target.value })}
          />
          <div
            className="h-full w-full rounded-md border-2 border-current"
            style={{ borderColor: common.stroke || '#000000', backgroundColor: 'transparent' }}
          />
        </div>
      </div>

      <div className="h-6 w-px bg-border/70 shrink-0" />

      {/* Stroke Width */}
      <div className="flex items-center gap-1.5 shrink-0">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">W</label>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onUpdate({ strokeWidth: Math.max(0, common.strokeWidth - 1) })}
        >
          <Minus size={14} />
        </Button>
        <span className="min-w-[1.5rem] text-center text-xs font-bold text-text-primary tabular-nums">
          {common.strokeWidth}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => onUpdate({ strokeWidth: common.strokeWidth + 1 })}
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
          min={0}
          max={100}
          value={opacityPct}
          onChange={(e) => onUpdate({ opacity: Number(e.target.value) / 100 })}
          className="w-20 accent-accent"
        />
        <span className="text-xs font-bold text-text-primary tabular-nums w-8 text-right">
          {opacityPct}%
        </span>
      </div>

      {/* Arrow head size */}
      {isSingle && first.type === 'arrow' && (
        <>
          <div className="h-6 w-px bg-border/70 shrink-0" />
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-tertiary">Head</label>
            {(['small', 'medium', 'large'] as const).map((sz) => (
              <Button
                key={sz}
                variant={(first as any).headSize === sz ? 'primary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0 text-[10px] font-bold"
                onClick={() => onUpdate({ headSize: sz } as any)}
              >
                {sz[0].toUpperCase()}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* Text options */}
      {isSingle && first.type === 'text' && (
        <>
          <div className="h-6 w-px bg-border/70 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={(first as any).fontStyle?.includes('bold') ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() =>
                onUpdate({
                  fontStyle: (first as any).fontStyle?.includes('bold')
                    ? (first as any).fontStyle.replace('bold', '').trim()
                    : `${(first as any).fontStyle} bold`.trim(),
                })
              }
            >
              <Bold size={14} />
            </Button>
            <Button
              variant={(first as any).fontStyle?.includes('italic') ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() =>
                onUpdate({
                  fontStyle: (first as any).fontStyle?.includes('italic')
                    ? (first as any).fontStyle.replace('italic', '').trim()
                    : `${(first as any).fontStyle} italic`.trim(),
                })
              }
            >
              <Italic size={14} />
            </Button>
          </div>
          <div className="h-6 w-px bg-border/70 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={(first as any).align === 'left' ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onUpdate({ align: 'left' } as any)}
            >
              <AlignLeft size={14} />
            </Button>
            <Button
              variant={(first as any).align === 'center' ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onUpdate({ align: 'center' } as any)}
            >
              <AlignCenter size={14} />
            </Button>
            <Button
              variant={(first as any).align === 'right' ? 'primary' : 'ghost'}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => onUpdate({ align: 'right' } as any)}
            >
              <AlignRight size={14} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
