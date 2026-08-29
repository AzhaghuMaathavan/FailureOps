'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Bell,
  Lock,
  Sun,
  Moon,
  Building2,
  ShieldCheck,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const TopHeader: React.FC = () => {
  const router = useRouter();
  const { project, theme, toggleTheme } = useApp();

  return (
    <header className="sticky top-0 z-30 h-14 w-full bg-background/80 backdrop-blur-md border-b border-border/80 px-4 lg:px-6 flex items-center justify-between">
      {/* Left: Organization & Project selector */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-feed hover:bg-card border border-border/70 transition-colors text-xs font-medium"
        >
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground font-semibold">{project.company}</span>
          <span className="text-muted-foreground/60">/</span>
          <span className="text-muted-foreground">{project.name}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono border border-amber-500/30">
            {project.stage}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground/80 px-2 py-1 rounded-md bg-card/50 border border-border/40">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono">Zero-Knowledge Reasoning Enclave</span>
        </div>
      </div>

      {/* Center/Search Quick Link */}
      <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
        <button
          onClick={() => router.push('/search')}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface-feed border border-border/80 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Search patterns, evidence, historical failures...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Demo Shortcut */}
        <Link
          href={`/projects/${project.id}/analysis`}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold tracking-tight transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Run Analysis</span>
        </Link>

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-border/70">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-amber-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
            FX
          </div>
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-semibold leading-none text-foreground">Staff Intelligence</span>
            <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">Aurora Enclave</span>
          </div>
        </div>
      </div>
    </header>
  );
};
