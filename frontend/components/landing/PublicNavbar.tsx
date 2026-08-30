'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield, ChevronRight, Sparkles, LayoutDashboard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FxMark, btnPrimary, btnSecondary, focusRing } from './chrome';

interface NavItem {
  label: string;
  href: string;
  badge?: string;
}

const PUBLIC_NAV_ITEMS: NavItem[] = [
  { label: 'Platform', href: '/platform' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Intelligence Layer', href: '/intelligence' },
  { label: 'Security & Privacy', href: '/security' },
];

export const PublicNavbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-200 border-b',
        scrolled
          ? 'bg-background/90 backdrop-blur-md border-border/80 shadow-sm'
          : 'bg-background/80 backdrop-blur-sm border-border/40'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Brand Logo */}
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 rounded-lg group p-1 -ml-1',
              focusRing
            )}
            aria-label="FailureOps X Home"
          >
            <FxMark />
            <div className="flex flex-col">
              <span className="font-mono text-sm sm:text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                FAILUREOPS <span className="text-primary font-black">X</span>
              </span>
              <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase hidden sm:block">
                Project Failure Intelligence
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2" aria-label="Main Navigation">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-3.5 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150',
                    focusRing,
                    isActive
                      ? 'text-foreground bg-surface-feed font-semibold'
                      : 'text-muted-foreground hover:text-foreground hover:bg-card'
                  )}
                >
                  {item.label}
                  {item.badge && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary border border-primary/20">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className={cn(
                'px-4 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors rounded-lg',
                focusRing
              )}
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className={cn(
                btnSecondary('py-2 px-3.5 text-xs font-semibold gap-1.5 hidden lg:inline-flex')
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/register"
              className={cn(
                btnPrimary('py-2 px-4 text-xs font-semibold gap-1.5 shadow-sm')
              )}
            >
              <span>Start analyzing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/register"
              className={cn(btnPrimary('py-1.5 px-3 text-xs font-semibold min-h-9'))}
            >
              Analyze
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors',
                focusRing
              )}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[65px] bottom-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border p-6 flex flex-col justify-between overflow-y-auto md:hidden animate-in fade-in slide-in-from-top-4 duration-200"
        >
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                Platform Navigation
              </p>
              {PUBLIC_NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-3 rounded-xl text-base font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground hover:bg-surface-feed'
                    )}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground px-3 mb-2">
                Workspace
              </p>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-surface-feed"
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  <span>Open Intelligence Dashboard</span>
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-foreground hover:bg-surface-feed"
              >
                <span>Sign in to existing account</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </div>
          </div>

          <div className="pt-6 border-t border-border mt-auto space-y-3">
            <Link
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(btnPrimary('w-full py-3.5 text-sm font-bold justify-center'))}
            >
              <span>Start Analyzing Project Evidence</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              Evidence-grounded • Explainable • Privacy-controlled
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
