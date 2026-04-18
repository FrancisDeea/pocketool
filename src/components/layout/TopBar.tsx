import { useStore } from '@nanostores/react';
import {
  Sun,
  Moon,
  SunMedium,
  MoonStar,
  Search,
  Globe,
  Menu,
  Info,
} from 'lucide-react';
import type { ThemeMode } from '@/types/tool';
import { $theme, applyTheme } from '@/stores/theme';
import { $locale } from '@/stores/preferences';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@ui/DropdownMenu';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
} from '@ui/Dialog';
import Button from '@ui/Button';
import Tooltip from '@ui/Tooltip';
import type { ToolConfig } from '@/types/tool';

/** GitHub icon (brand icons were removed from lucide-react v1.x) */
function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

type TopBarProps = {
  currentTool?: ToolConfig;
  onOpenSearch?: () => void;
  onMobileMenuToggle?: () => void;
};

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'light-hc', label: 'Claro (HC)', icon: SunMedium },
  { value: 'dark', label: 'Oscuro', icon: Moon },
  { value: 'dark-hc', label: 'Oscuro (HC)', icon: MoonStar },
];

export default function TopBar({
  currentTool,
  onOpenSearch,
  onMobileMenuToggle,
}: TopBarProps) {
  const theme = useStore($theme);
  const locale = useStore($locale);

  const handleThemeChange = (newTheme: ThemeMode) => {
    $theme.set(newTheme);
    applyTheme(newTheme);
  };

  const handleLocaleChange = (newLocale: 'es' | 'en') => {
    $locale.set(newLocale);
    // Navigate to the same tool in the new locale
    const path = window.location.pathname;
    let newPath: string;
    if (newLocale === 'es') {
      // Remove /en prefix
      newPath = path.replace(/^\/en/, '') || '/';
    } else {
      // Add /en prefix if not already there
      newPath = path.startsWith('/en') ? path : `/en${path}`;
    }
    window.location.href = newPath;
  };

  return (
    <header
      className={[
        'sticky top-0 z-[var(--z-sticky)]',
        'h-[var(--topbar-height)] px-4',
        'flex items-center justify-between gap-4',
        'bg-bg/80 backdrop-blur-xl',
        'border-b border-border',
      ].join(' ')}
    >
      {/* Left: mobile menu + title + info + author */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        {currentTool && (
          <>
            <h1 className="text-sm font-semibold text-text-primary truncate">
              {currentTool.title}
            </h1>

            {/* Info button */}
            <Dialog>
              <DialogTrigger asChild>
                <button
                  className="p-1 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-hover transition-colors shrink-0 cursor-pointer"
                  title="Información de la herramienta"
                >
                  <Info size={16} />
                </button>
              </DialogTrigger>
              <DialogContent title={currentTool.title} description={currentTool.description}>
                <div className="py-2 space-y-4">
                  <div>
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">Versión</span>
                    <span className="text-sm text-text-primary">{currentTool.version || '1.0.0'}</span>
                  </div>
                  {currentTool.tags && currentTool.tags.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">Tags</span>
                      <div className="flex flex-wrap gap-1">
                        {currentTool.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-surface-hover text-text-secondary text-xs rounded-md border border-border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {currentTool.author && (
                    <div>
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">Autor</span>
                      <a 
                        href={`https://github.com/${currentTool.author}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-sm text-accent hover:underline flex items-center gap-1"
                      >
                        <GitHubIcon size={14} /> @{currentTool.author}
                      </a>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Author attribution (desktop only) */}
            {currentTool.author && (
              <a
                href={`https://github.com/${currentTool.author}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-secondary px-2 py-1 rounded-md hover:bg-surface-hover transition-colors shrink-0"
                title={`Creado por @${currentTool.author}`}
              >
                <GitHubIcon size={12} />
                {currentTool.author}
              </a>
            )}
          </>
        )}
      </div>

      {/* Right: search + theme + language */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Search button */}
        <Tooltip content="Buscar (⌘K)">
          <Button variant="icon" size="sm" onClick={onOpenSearch}>
            <Search size={18} />
          </Button>
        </Tooltip>

        {/* Theme selector */}
        <DropdownMenu>
          <Tooltip content="Tema">
            <DropdownMenuTrigger asChild>
              <Button variant="icon" size="sm">
                {theme.startsWith('dark') ? (
                  <Moon size={18} />
                ) : (
                  <Sun size={18} />
                )}
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <DropdownMenuItem
                  key={opt.value}
                  onSelect={() => handleThemeChange(opt.value)}
                >
                  <Icon size={14} />
                  <span>{opt.label}</span>
                  {theme === opt.value && (
                    <span className="ml-auto text-accent text-xs">✓</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Language selector */}
        <DropdownMenu>
          <Tooltip content="Idioma">
            <DropdownMenuTrigger asChild>
              <Button variant="icon" size="sm">
                <Globe size={18} />
              </Button>
            </DropdownMenuTrigger>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Idioma</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => handleLocaleChange('es')}>
              🇪🇸 Español
              {locale === 'es' && (
                <span className="ml-auto text-accent text-xs">✓</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleLocaleChange('en')}>
              🇬🇧 English
              {locale === 'en' && (
                <span className="ml-auto text-accent text-xs">✓</span>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
