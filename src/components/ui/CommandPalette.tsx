import { Command } from 'cmdk';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';

type CommandPaletteProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export default function CommandPalette({
  children,
  open: controlledOpen,
  onOpenChange,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={[
            'fixed inset-0 z-[var(--z-command)]',
            'bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-fade-in',
          ].join(' ')}
        />
        <DialogPrimitive.Content
          className={[
            'fixed top-[20%] left-1/2 -translate-x-1/2',
            'z-[var(--z-command)]',
            'w-[90vw] max-w-lg',
            'bg-surface border border-border rounded-xl',
            'shadow-lg overflow-hidden',
            'data-[state=open]:animate-scale-in',
            'focus:outline-none',
          ].join(' ')}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>Command Palette</DialogPrimitive.Title>
          </VisuallyHidden.Root>
          <Command
            className="flex flex-col"
            loop
          >
            <div className="flex items-center gap-2 px-4 border-b border-border">
              <Search size={16} className="text-text-tertiary shrink-0" />
              <Command.Input
                placeholder="Buscar herramientas..."
                className={[
                  'flex-1 h-12 bg-transparent text-sm text-text-primary',
                  'placeholder:text-text-tertiary',
                  'outline-none',
                ].join(' ')}
              />
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary bg-surface-hover rounded border border-border">
                Esc
              </kbd>
            </div>

            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-text-tertiary">
                No se encontraron resultados.
              </Command.Empty>
              {children}
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function CommandPaletteItem({
  onSelect,
  children,
  keywords,
}: {
  onSelect: () => void;
  children: ReactNode;
  keywords?: string[];
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      keywords={keywords}
      className={[
        'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg',
        'text-text-secondary cursor-pointer select-none',
        'data-[selected=true]:bg-surface-hover data-[selected=true]:text-text-primary',
        'transition-colors duration-[var(--transition-fast)]',
      ].join(' ')}
    >
      {children}
    </Command.Item>
  );
}

export function CommandPaletteGroup({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <Command.Group
      heading={heading}
      className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary"
    >
      {children}
    </Command.Group>
  );
}
