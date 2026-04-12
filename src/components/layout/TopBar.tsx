import { useStore } from '@nanostores/react';
import {
  Sun,
  Moon,
  SunMedium,
  MoonStar,
  Search,
  Globe,
  Menu,
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
import Button from '@ui/Button';
import Tooltip from '@ui/Tooltip';

type TopBarProps = {
  title?: string;
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
  title,
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
      {/* Left: mobile menu + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover cursor-pointer"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>
        {title && (
          <h1 className="text-sm font-semibold text-text-primary truncate">
            {title}
          </h1>
        )}
      </div>

      {/* Right: search + theme + language */}
      <div className="flex items-center gap-1">
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
