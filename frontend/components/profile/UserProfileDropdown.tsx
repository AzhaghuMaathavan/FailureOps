'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Settings,
  ShieldCheck,
  LogOut,
  Building2,
  ChevronDown,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  Lock,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { cn } from '@/lib/utils';

export const UserProfileDropdown: React.FC = () => {
  const router = useRouter();
  const { user, project, theme, toggleTheme, logout } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'FX';

  const handleSignOut = async () => {
    setIsOpen(false);
    await logout();
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User Profile and Account Menu"
        className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl bg-surface-feed hover:bg-card border border-border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* Avatar badge */}
        <div className="relative">
          <div className="size-7 sm:size-8 rounded-lg bg-primary text-primary-foreground font-mono text-xs font-bold flex items-center justify-center shadow-primary-glow select-none">
            {initials}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-success ring-2 ring-background" />
        </div>

        {/* User Info labels (desktop) */}
        <div className="hidden xl:flex flex-col text-left pr-1">
          <span className="text-[11px] font-semibold leading-none text-foreground truncate max-w-[130px]">
            {user?.name || 'Staff Intelligence'}
          </span>
          <span className="text-[9px] text-muted-foreground leading-tight mt-0.5 font-mono truncate max-w-[130px]">
            {user?.organizationName || 'Aurora Technologies'}
          </span>
        </div>

        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180 text-primary'
          )}
          aria-hidden="true"
        />
      </button>

      {/* Floating Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-card border border-border shadow-2xl z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Header section with User Profile & Role */}
          <div className="p-4 border-b border-border/80 bg-surface-feed/50 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-10 rounded-xl bg-primary text-primary-foreground font-mono text-sm font-bold flex items-center justify-center shadow-primary-glow shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground truncate">
                    {user?.name || 'Lead Intelligence Architect'}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-mono font-medium">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                {user?.role || 'ORGANIZATION_ADMIN'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success text-[10px] font-mono font-medium">
                <span className="size-1.5 rounded-full bg-success" />
                Verified
              </span>
            </div>
          </div>

          {/* Current Enclave Context */}
          <div className="px-4 py-2.5 bg-background/50 border-b border-border text-[11px] flex items-center justify-between text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium truncate">
              <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">{project.company}</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-feed border border-border">
              {project.codeName || 'ENCLAVE-01'}
            </span>
          </div>

          {/* Navigation Links */}
          <div className="p-2 space-y-1">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-surface-feed hover:text-primary transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-muted-foreground" />
              <span>Manage Profile & Identity</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-surface-feed hover:text-primary transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span>Workspace Settings & Privacy</span>
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-surface-feed transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                )}
                <span>Theme Mode</span>
              </span>
              <span className="text-[10px] font-mono uppercase text-muted-foreground">{theme}</span>
            </button>
          </div>

          {/* Sign out section */}
          <div className="p-2 border-t border-border/80 bg-surface-feed/30">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/15 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Workspace</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
