'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Building2,
  ShieldCheck,
  Sparkles,
  Menu,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { UserProfileDropdown } from '@/components/profile/UserProfileDropdown';
import { NotificationsDropdown } from '@/components/layout/NotificationsDropdown';
import { CommandPalette } from '@/components/common/CommandPalette';

const iconBtn =
  'inline-flex items-center justify-center size-8 rounded-lg bg-surface-feed border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export const TopHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { project, theme, toggleTheme, toggleMobileNav } = useApp();
  const onSearchPage = pathname === '/search';
  const [isCommandOpen, setIsCommandOpen] = React.useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      setIsCommandOpen(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 h-14 w-full min-w-0 bg-background border-b border-border px-3 sm:px-4 lg:px-6 grid items-center gap-2 sm:gap-3 ${
        onSearchPage
          ? 'grid-cols-[minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_auto]'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        <button
          type="button"
          onClick={toggleMobileNav}
          aria-label="Open mobile navigation"
          className="lg:hidden inline-flex items-center justify-center size-8 sm:size-9 rounded-lg bg-surface-feed hover:bg-card border border-border text-foreground hover:text-primary transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-full px-2 sm:px-2.5 py-1.5 rounded-lg bg-surface-feed hover:bg-card border border-border transition-colors duration-150 text-[11px] font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-foreground font-semibold truncate max-w-[90px] sm:max-w-[150px] md:max-w-none">{project.company}</span>
          <span className="text-subtle shrink-0">/</span>
          <span className="text-muted-foreground truncate max-w-[70px] sm:max-w-[120px] md:max-w-none">{project.name}</span>
          <span className="hidden xs:inline-block ml-1 px-1.5 py-0.5 rounded-md bg-surface-feed text-muted-foreground text-[10px] font-mono border border-border shrink-0 whitespace-nowrap">
            {project.stage}
          </span>
        </Link>

        <div
          className="hidden xl:inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-surface-feed border border-success text-success shrink-0"
          title="Zero-knowledge reasoning enclave"
        >
          <ShieldCheck className="w-3 h-3" aria-hidden="true" />
          <span className="text-[10px] font-mono font-medium whitespace-nowrap">Enclave OK</span>
        </div>
      </div>

      {!onSearchPage && (
        <button
          type="button"
          onClick={() => setIsCommandOpen(true)}
          aria-label="Open command palette"
          className="hidden lg:flex min-w-0 w-full items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-feed border border-border text-xs text-subtle hover:border-primary/50 hover:text-foreground transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="truncate">Search patterns, evidence, cases…</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-muted-foreground shrink-0">
            ⌘K
          </kbd>
        </button>
      )}

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/projects/${project.id}/analysis`}
          className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold tracking-tight transition-colors duration-150 shadow-primary-glow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Run Analysis</span>
        </Link>

        <NotificationsDropdown />

        <button
          type="button"
          onClick={toggleTheme}
          className={iconBtn}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Moon className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <UserProfileDropdown />
      </div>

      <CommandPalette isOpen={isCommandOpen} onClose={() => setIsCommandOpen(false)} />
    </header>
  );
};
