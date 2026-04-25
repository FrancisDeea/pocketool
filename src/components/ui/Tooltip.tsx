import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useState, type ReactNode } from 'react';

type TooltipProps = {
  content: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delayDuration?: number;
};

export default function Tooltip({
  content,
  children,
  side = 'top',
  delayDuration = 300,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        <TooltipPrimitive.Trigger asChild onClick={() => setOpen(false)}>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={[
              'z-[var(--z-dropdown)]',
              'px-3 py-1.5 text-xs font-medium rounded-lg',
              'bg-surface text-text-primary border border-border',
              'shadow-md',
              'animate-scale-in',
              'select-none',
            ].join(' ')}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-border" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
