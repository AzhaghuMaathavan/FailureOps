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
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const TopHeader: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { project, theme, toggleTheme } = useApp();
  const onSearchPage = pathname === '/search';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      event.preventDefault();
      if (onSearchPage) {
        document.getElementById('global-search-input')?.focus();
        return;
      }
      router.push('/search');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearchPage, router]);

  return (
    <header className={`sticky top-0 z-30 h-14 w-full min-w-0 bg-background/70 backdrop-blur-xl border-b border-border/60 px-4 lg:px-6 grid items-center gap-3 ${
      onSearchPage
        ? 'grid-cols-[minmax(0,1fr)_auto]'
        : 'grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)_auto]'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 min-w-0 max-w-full px-2.5 py-1.5 rounded-lg bg-surface-feed hover:bg-card border border-border/70 transition-colors text-xs font-medium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-foreground font-semibold truncate">{project.company}</span>
          <span className="text-muted-foreground/60 shrink-0">/</span>
          <span className="text-muted-foreground truncate">{project.name}</span>
          <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/30 shrink-0">
            {project.stage}
          </span>
        </Link>

        <div className="hidden xl:flex items-center gap-1.5 text-xs text-muted-foreground/80 px-2 py-1 rounded-md bg-card/50 border border-border/40 shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono whitespace-nowrap">Zero-Knowledge Reasoning Enclave</span>
        </div>
      </div>

      {!onSearchPage && (
        <button
          type="button"
          onClick={() => router.push('/search')}
          aria-label="Open global search"
          className="hidden lg:flex min-w-0 w-full items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-surface-feed border border-border/80 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span className="flex items-center gap-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Search patterns, evidence, historical failures...</span>
          </span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-muted-foreground shrink-0">
            ⌘K
          </kbd>
        </button>
      )}

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/projects/${project.id}/analysis`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold tracking-tight transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Run Analysis</span>
        </Link>

        <button
          type="button"
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-border/70">
          <div className="w-7 h-7 rounded-lg bg-card border border-border/80 p-0.5 flex items-center justify-center shadow-sm">
            <img src="/logo.png" alt="FailureOps X" className="w-full h-full object-contain" />
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-foreground">Staff Intelligence</span>
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 font-mono">Enclave Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};
