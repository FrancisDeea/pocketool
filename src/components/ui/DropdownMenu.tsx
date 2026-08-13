import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

type DropdownMenuProps = {
  children: ReactNode;
};

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <DropdownMenuPrimitive.Root>{children}</DropdownMenuPrimitive.Root>;
}

export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({
  children,
  className = '',
  ...props
}: DropdownMenuPrimitive.DropdownMenuContentProps & { className?: string }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={6}
        className={[
          'z-[var(--z-dropdown)]',
          'min-w-[180px] p-1',
          'bg-surface border border-border rounded-xl',
          'shadow-lg',
          'animate-scale-in',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({
  children,
  className = '',
  ...props
}: DropdownMenuPrimitive.DropdownMenuItemProps & { className?: string }) {
  return (
    <DropdownMenuPrimitive.Item
      className={[
        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
        'text-text-secondary cursor-pointer select-none',
        'outline-none',
        'data-[highlighted]:bg-surface-hover data-[highlighted]:text-text-primary',
        'transition-colors duration-[var(--transition-fast)]',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuCheckboxItem({
  children,
  checked,
  className = '',
  ...props
}: DropdownMenuPrimitive.DropdownMenuCheckboxItemProps & { className?: string }) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      checked={checked}
      className={[
        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg',
        'text-text-secondary cursor-pointer select-none',
        'outline-none',
        'data-[highlighted]:bg-surface-hover data-[highlighted]:text-text-primary',
        'transition-colors duration-[var(--transition-fast)]',
        className,
      ].join(' ')}
      {...props}
    >
      <DropdownMenuPrimitive.ItemIndicator>
        <Check size={14} />
      </DropdownMenuPrimitive.ItemIndicator>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="h-px my-1 bg-border" />;
}

export function DropdownMenuLabel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <DropdownMenuPrimitive.Label
      className={['px-3 py-1.5 text-xs font-semibold text-text-tertiary', className].join(' ')}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  );
}
