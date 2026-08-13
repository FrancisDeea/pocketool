import { useStore } from '@nanostores/react';
import { useEffect, useState, useCallback } from 'react';
import { initI18n } from '@/utils/i18n';
import type { ToolConfig } from '@/types/tool';
import { $sidebarCollapsed, $zenMode, $isFullscreen, toggleFullscreen } from '@/stores/preferences';
import { $theme, applyTheme } from '@/stores/theme';
import { ToastProvider } from '@ui/Toast';
import CommandPalette, { CommandPaletteItem, CommandPaletteGroup } from '@ui/CommandPalette';
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
  Brush,
  KeyRound,
  Regex,
  MonitorSmartphone,
  X,
  Expand,
  Shrink,
} from 'lucide-react';
import Button from '@ui/Button';
import Tooltip from '@ui/Tooltip';

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
  Brush,
  KeyRound,
  Regex,
  MonitorSmartphone,
};

export default function Shell({ tools, currentToolId, currentTool, locale, children }: ShellProps) {
  const storeCollapsed = useStore($sidebarCollapsed) === 'true';
  const [isMounted, setIsMounted] = useState(false);
  const [, setI18nReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setI18nReady(true));
    setIsMounted(true);
  }, []);

  const collapsed = isMounted ? storeCollapsed : false;
  const zenMode = useStore($zenMode);
  const isFullscreen = useStore($isFullscreen);
  const theme = useStore($theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Sync zen mode attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-zen-mode', zenMode.toString());
  }, [zenMode]);

  // Sync fullscreen state + handle Esc for Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if ($zenMode.get()) {
          $zenMode.set(false);
        }
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const fsHandler = () => {
      const isFS = !!document.fullscreenElement;
      $isFullscreen.set(isFS);
      // If we exit fullscreen (e.g. browser Escape), also exit Zen Mode as requested
      if (!isFS && $zenMode.get()) {
        $zenMode.set(false);
      }
    };
    document.addEventListener('fullscreenchange', fsHandler);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', fsHandler);
    };
  }, []);

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
    [locale]
  );

  const handleOpenSearch = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  return (
    <ToastProvider>
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
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
                  <span className="text-xs text-text-tertiary">{tool.description}</span>
                </div>
              </CommandPaletteItem>
            );
          })}
        </CommandPaletteGroup>
      </CommandPalette>

      {/* Desktop sidebar */}
      {!zenMode && <Sidebar tools={tools} currentToolId={currentToolId} locale={locale} />}

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
          currentToolId === 'canvas' ? 'h-dvh overflow-hidden' : 'min-h-dvh',
          'transition-all duration-[var(--transition-base)] flex flex-col',
          'max-md:ml-0',
          zenMode
            ? 'ml-0'
            : collapsed
              ? 'md:ml-[var(--sidebar-collapsed)]'
              : 'md:ml-[var(--sidebar-width)]',
        ].join(' ')}
      >
        {!zenMode && (
          <TopBar
            currentTool={currentTool}
            onOpenSearch={handleOpenSearch}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
          />
        )}
        <main
          className={
            zenMode
              ? 'p-3 h-full overflow-hidden flex flex-col items-stretch justify-center'
              : [
                  'flex-1 p-4 md:p-6 min-h-0',
                  currentToolId === 'canvas' ? 'overflow-hidden' : 'overflow-visible',
                ].join(' ')
          }
        >
          {children}
        </main>
      </div>

      {/* Floating Zen Mode controls - Bottom Right */}
      {zenMode && (
        <div
          key={`zen-controls-${currentToolId}`}
          className="fixed bottom-4 right-4 z-[var(--z-sticky)] flex items-center gap-1.5 p-1.5 bg-surface/80 backdrop-blur-xl border border-border rounded-xl shadow-2xl animate-zen-alert group opacity-40 hover:opacity-100 transition-opacity duration-300"
        >
          <Tooltip content={isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}>
            <Button variant="icon" size="sm" onClick={toggleFullscreen}>
              {isFullscreen ? <Shrink size={16} /> : <Expand size={16} />}
            </Button>
          </Tooltip>
          <div className="w-px h-6 bg-border mx-0.5" />
          <Tooltip content="Salir Modo Zen">
            <Button
              variant="danger"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => {
                $zenMode.set(false);
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              }}
            >
              <X size={16} />
            </Button>
          </Tooltip>
        </div>
      )}
    </ToastProvider>
  );
}
