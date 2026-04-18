import { useStore } from '@nanostores/react';
import {
  Braces,
  FileText,
  ImageIcon,
  StickyNote,
  PanelLeftClose,
  PanelLeft,
  Wrench,
} from 'lucide-react';
import type { ToolConfig } from '@/types/tool';
import { $sidebarCollapsed, toggleSidebar } from '@/stores/preferences';
import Tooltip from '@ui/Tooltip';
import ScrollArea from '@ui/ScrollArea';

type SidebarProps = {
  tools: ToolConfig[];
  currentToolId?: string;
  locale: string;
};

const iconMap: Record<string, typeof Braces> = {
  Braces,
  FileText,
  Image: ImageIcon,
  StickyNote,
};

function getToolHref(toolId: string, locale: string): string {
  const base = locale === 'es' ? '' : `/${locale}`;
  return `${base}/tool/${toolId}`;
}

export default function Sidebar({ tools, currentToolId, locale }: SidebarProps) {
  const collapsed = useStore($sidebarCollapsed) === 'true';

  return (
    <aside
      className={[
        'fixed top-0 left-0 h-dvh z-[var(--z-sticky)]',
        'bg-surface border-r border-border',
        'flex flex-col',
        'transition-all duration-[var(--transition-base)]',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-width)]',
        'max-md:hidden',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[var(--topbar-height)] shrink-0 border-b border-border">
        {!collapsed && (
          <a href="/" data-astro-prefetch className="flex items-center gap-2 cursor-pointer">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center">
              <Wrench size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-text-primary">
              Pocketool
            </span>
          </a>
        )}
        <button
          onClick={() => toggleSidebar()}
          className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors cursor-pointer"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Tool list */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-0.5">
          {tools.map((tool) => {
            const Icon = iconMap[tool.icon] ?? Wrench;
            const isActive = tool.id === currentToolId;

            const link = (
              <a
                key={tool.id}
                href={getToolHref(tool.id, locale)}
                data-astro-prefetch
                className={[
                  'flex items-center gap-3 rounded-lg',
                  'text-sm transition-colors duration-[var(--transition-fast)]',
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                  isActive
                    ? 'bg-accent-muted text-accent font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                ].join(' ')}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{tool.title}</span>}
              </a>
            );

            return collapsed ? (
              <Tooltip key={tool.id} content={tool.title} side="right">
                {link}
              </Tooltip>
            ) : (
              link
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
