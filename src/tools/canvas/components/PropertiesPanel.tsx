import Button from '@/components/ui/Button';
import { 
  Bold, 
  Italic, 
  AlignCenter, 
  AlignLeft, 
  AlignRight,
  Minus,
  Plus
} from 'lucide-react';
import type { Shape } from '../types';

interface PropertiesPanelProps {
  selectedShapes: Shape[];
  onUpdate: (updates: Partial<Shape>) => void;
}

export function PropertiesPanel({ selectedShapes, onUpdate }: PropertiesPanelProps) {
  if (selectedShapes.length === 0) return null;

  const isSingle = selectedShapes.length === 1;
  const first = selectedShapes[0];

  const common = {
    fill: selectedShapes.every(s => s.fill === first.fill) ? first.fill : '',
    stroke: selectedShapes.every(s => s.stroke === first.stroke) ? first.stroke : '',
    strokeWidth: selectedShapes.every(s => s.strokeWidth === first.strokeWidth) ? first.strokeWidth : 1,
    opacity: selectedShapes.every(s => s.opacity === first.opacity) ? first.opacity : 1,
  };

  return (
    <div className="absolute top-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border bg-surface/95 p-3 shadow-2xl backdrop-blur-md">
      <div className="flex items-center gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Fill</label>
        <input 
          type="color" 
          className="h-8 w-8 cursor-pointer overflow-hidden rounded-lg border-0 bg-transparent p-0"
          value={common.fill || '#000000'}
          onChange={(e) => onUpdate({ fill: e.target.value })}
        />
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="flex items-center gap-3">
        <label className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Stroke</label>
        <input 
          type="color" 
          className="h-8 w-8 cursor-pointer overflow-hidden rounded-lg border-0 bg-transparent p-0"
          value={common.stroke || '#000000'}
          onChange={(e) => onUpdate({ stroke: e.target.value })}
        />
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="flex items-center gap-2">
        <label className="mr-2 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Width</label>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onUpdate({ strokeWidth: Math.max(0, common.strokeWidth - 1) })}>
          <Minus size={20} />
        </Button>
        <span className="min-w-[2rem] text-center text-sm font-bold text-text-primary">{common.strokeWidth}</span>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onUpdate({ strokeWidth: common.strokeWidth + 1 })}>
          <Plus size={20} />
        </Button>
      </div>

      {isSingle && first.type === 'arrow' && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <label className="mr-1 text-[11px] font-bold uppercase tracking-wider text-text-tertiary">Head</label>
            {(['small', 'medium', 'large'] as const).map(size => (
              <Button
                key={size}
                variant={(first as any).headSize === size ? 'primary' : 'ghost'}
                size="sm"
                className="px-2 text-xs h-8"
                onClick={() => onUpdate({ headSize: size } as any)}
              >
                {size[0].toUpperCase()}
              </Button>
            ))}
          </div>
        </>
      )}

      {isSingle && first.type === 'text' && (
        <>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button 
              variant={first.fontStyle.includes('bold') ? 'primary' : 'ghost'} 
              size="sm" 
              className="h-9 w-9 p-0"
              onClick={() => onUpdate({ fontStyle: first.fontStyle.includes('bold') ? first.fontStyle.replace('bold', '').trim() : `${first.fontStyle} bold`.trim() })}
            >
              <Bold size={20} />
            </Button>
            <Button 
              variant={first.fontStyle.includes('italic') ? 'primary' : 'ghost'} 
              size="sm" 
              className="h-9 w-9 p-0"
              onClick={() => onUpdate({ fontStyle: first.fontStyle.includes('italic') ? first.fontStyle.replace('italic', '').trim() : `${first.fontStyle} italic`.trim() })}
            >
              <Italic size={20} />
            </Button>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Button variant={first.align === 'left' ? 'primary' : 'ghost'} size="sm" className="h-9 w-9 p-0" onClick={() => onUpdate({ align: 'left' })}>
              <AlignLeft size={20} />
            </Button>
            <Button variant={first.align === 'center' ? 'primary' : 'ghost'} size="sm" className="h-9 w-9 p-0" onClick={() => onUpdate({ align: 'center' })}>
              <AlignCenter size={20} />
            </Button>
            <Button variant={first.align === 'right' ? 'primary' : 'ghost'} size="sm" className="h-9 w-9 p-0" onClick={() => onUpdate({ align: 'right' })}>
              <AlignRight size={20} />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
