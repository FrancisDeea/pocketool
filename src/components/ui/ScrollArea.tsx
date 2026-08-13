import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type { ReactNode } from 'react';

type ScrollAreaProps = {
  children: ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
};

export default function ScrollArea({
  children,
  className = '',
  orientation = 'vertical',
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={['overflow-hidden', className].join(' ')}>
      <ScrollAreaPrimitive.Viewport className="w-full h-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>

      {(orientation === 'vertical' || orientation === 'both') && (
        <ScrollAreaPrimitive.Scrollbar
          orientation="vertical"
          className={[
            'flex touch-none select-none',
            'w-1.5 p-0.5',
            'transition-colors duration-[var(--transition-fast)]',
            'hover:w-2',
          ].join(' ')}
        >
          <ScrollAreaPrimitive.Thumb
            className={[
              'relative flex-1 rounded-full',
              'bg-border hover:bg-border-hover',
              'transition-colors duration-[var(--transition-fast)]',
            ].join(' ')}
          />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      {(orientation === 'horizontal' || orientation === 'both') && (
        <ScrollAreaPrimitive.Scrollbar
          orientation="horizontal"
          className={[
            'flex touch-none select-none flex-col',
            'h-1.5 p-0.5',
            'transition-colors duration-[var(--transition-fast)]',
            'hover:h-2',
          ].join(' ')}
        >
          <ScrollAreaPrimitive.Thumb
            className={[
              'relative flex-1 rounded-full',
              'bg-border hover:bg-border-hover',
              'transition-colors duration-[var(--transition-fast)]',
            ].join(' ')}
          />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}
