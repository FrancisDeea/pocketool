import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type DialogProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
};

type DialogContentProps = {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {children}
    </DialogPrimitive.Root>
  );
}

export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({
  children,
  title,
  description,
  className = '',
}: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={[
          'fixed inset-0 z-[var(--z-overlay)]',
          'bg-black/50 backdrop-blur-sm',
          'data-[state=open]:animate-fade-in',
        ].join(' ')}
      />
      <DialogPrimitive.Content
        className={[
          'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'z-[var(--z-modal)]',
          'w-[90vw] max-w-lg max-h-[85vh]',
          'bg-surface border border-border rounded-xl',
          'shadow-lg p-6',
          'data-[state=open]:animate-scale-in',
          'focus:outline-none',
          className,
        ].join(' ')}
      >
        <div className="flex items-center justify-between mb-4">
          <DialogPrimitive.Title className="text-lg font-semibold text-text-primary">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className={[
              'h-8 w-8 inline-flex items-center justify-center rounded-lg',
              'text-text-tertiary hover:text-text-primary hover:bg-surface-hover',
              'transition-colors duration-[var(--transition-fast)]',
              'cursor-pointer',
            ].join(' ')}
          >
            <X size={16} />
          </DialogPrimitive.Close>
        </div>
        {description && (
          <DialogPrimitive.Description className="text-sm text-text-secondary mb-4">
            {description}
          </DialogPrimitive.Description>
        )}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
