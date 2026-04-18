import { useStore } from '@nanostores/react';
import { useEffect, useState, useCallback } from 'react';
import type { ToolConfig } from '@/types/tool';
import { $sidebarCollapsed } from '@/stores/preferences';
import { $theme, applyTheme } from '@/stores/theme';
import { ToastProvider } from '@ui/Toast';
import CommandPalette, {
  CommandPaletteItem,
  CommandPaletteGroup,
} from '@ui/CommandPalette';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import {
  Braces,
  FileText,
  ImageIcon,
  StickyNote,
  Monitor,
  Code,
  Wrench,
} from 'lucide-react';

type ShellProps = {
  tools: ToolConfig[];
  currentToolId?: string;
  currentTool?: ToolConfig;
  locale: string;
  children: React.ReactNode;
};

const iconMap: Record<string, typeof Braces> = {
  Braces,
  FileText,
  Image: ImageIcon,
  StickyNote,
  Monitor,
  Code,
};

export default function Shell({
  tools,
  currentToolId,
  currentTool,
  locale,
  children,
}: ShellProps) {
  const storeCollapsed = useStore($sidebarCollapsed) === 'true';
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  const collapsed = isMounted ? storeCollapsed : false;
  
  const theme = useStore($theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Apply theme on mount and changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Close mobile menu on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToolNavigate = useCallback(
    (toolId: string) => {
      const base = locale === 'es' ? '' : `/${locale}`;
      window.location.href = `${base}/tool/${toolId}`;
    },
    [locale],
  );

  const handleOpenSearch = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  return (
    <ToastProvider>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      >
        <CommandPaletteGroup heading="Herramientas">
          {tools.map((tool) => {
            const Icon = iconMap[tool.icon] ?? Wrench;
            return (
              <CommandPaletteItem
                key={tool.id}
                onSelect={() => {
                  handleToolNavigate(tool.id);
                  setCommandPaletteOpen(false);
                }}
                keywords={tool.tags}
              >
                <Icon size={16} className="shrink-0 text-text-tertiary" />
                <div className="flex flex-col">
                  <span className="text-text-primary">{tool.title}</span>
                  <span className="text-xs text-text-tertiary">
                    {tool.description}
                  </span>
                </div>
              </CommandPaletteItem>
            );
          })}
        </CommandPaletteGroup>
      </CommandPalette>

      {/* Desktop sidebar */}
      <Sidebar
        tools={tools}
        currentToolId={currentToolId}
        locale={locale}
      />

      {/* Mobile sidebar overlay + slide-in */}
      {mobileMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <Sidebar
            tools={tools}
            currentToolId={currentToolId}
            locale={locale}
            isMobile
            onClose={() => setMobileMenuOpen(false)}
          />
        </>
      )}

      <div
        className={[
          'min-h-dvh transition-all duration-[var(--transition-base)]',
          'max-md:ml-0',
          collapsed
            ? 'md:ml-[var(--sidebar-collapsed)]'
            : 'md:ml-[var(--sidebar-width)]',
        ].join(' ')}
      >
        <TopBar
          currentTool={currentTool}
          onOpenSearch={handleOpenSearch}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
