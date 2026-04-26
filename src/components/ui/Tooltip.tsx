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
  delayDuration = 400,
}: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} disableHoverableContent>
      <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
        {/*
         * asChild merges tooltip trigger props onto the <span>.
         * Using a <span style={{ display: 'contents' }}> as pivot:
         *   - avoids the default <button> that TooltipTrigger renders without asChild
         *     (which would nest <button> inside <button> when children is a Button)
         *   - display:contents makes the span invisible to layout and CSS
         *   - children (Button, DropdownMenuTrigger, etc.) are siblings in the DOM,
         *     not nested buttons, so there's no invalid HTML nesting
         */}
        <TooltipPrimitive.Trigger
          asChild
          onClick={() => setOpen(false)}
          onPointerDown={() => setOpen(false)}
        >
          <span
            style={{ display: 'contents' }}
            onPointerDown={() => setOpen(false)}
            onClick={() => setOpen(false)}
          >
            {children}
          </span>
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            onPointerDownOutside={() => setOpen(false)}
            className={[
              'z-[var(--z-dropdown)]',
              'px-3 py-1.5 text-xs font-medium rounded-lg',
              'bg-surface text-text-primary border border-border',
              'shadow-md',
              'animate-scale-in',
              'select-none pointer-events-none',
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
