import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

type TabsProps = {
  defaultValue: string;
  children: ReactNode;
  className?: string;
};

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
  return (
    <TabsPrimitive.Root defaultValue={defaultValue} className={className}>
      {children}
    </TabsPrimitive.Root>
  );
}

export function TabsList({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.List
      className={[
        'flex items-center gap-1 p-1',
        'bg-surface-hover rounded-lg',
        'border border-border',
        className,
      ].join(' ')}
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={[
        'flex-1 px-3 py-1.5 text-sm font-medium rounded-md',
        'text-text-secondary cursor-pointer select-none',
        'transition-all duration-[var(--transition-fast)]',
        'hover:text-text-primary',
        'data-[state=active]:bg-surface data-[state=active]:text-text-primary',
        'data-[state=active]:shadow-sm',
        'outline-none focus-visible:ring-2 focus-visible:ring-accent',
        className,
      ].join(' ')}
    >
      {children}
    </TabsPrimitive.Trigger>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <TabsPrimitive.Content
      value={value}
      className={[
        'outline-none mt-2',
        'data-[state=active]:animate-fade-in',
        className,
      ].join(' ')}
    >
      {children}
    </TabsPrimitive.Content>
  );
}
