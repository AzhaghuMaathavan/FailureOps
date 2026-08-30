'use client';

import React from 'react';
import Link from 'next/link';
import { FxMark, focusRing } from './chrome';
import { ShieldCheck, Activity, Terminal, Lock, Globe, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="w-full border-t border-border bg-card/40 backdrop-blur-sm text-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Col 1: Brand & Philosophy */}
          <div className="lg:col-span-2 space-y-4">
            <Link
              href="/"
              className={cn('inline-flex items-center gap-2.5 rounded-lg p-1 -ml-1', focusRing)}
            >
              <FxMark />
              <span className="font-mono text-base font-bold tracking-tight">
                FAILUREOPS <span className="text-primary font-black">X</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
              Continuous project failure intelligence that turns fragmented engineering, product, and customer evidence into early-warning risk profiles, causal chains, and verified interventions.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Intelligence Network Online</span>
              </div>
            </div>
          </div>

          {/* Col 2: Platform */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Platform
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/platform"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Platform Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/how-it-works"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/intelligence"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  10-Stage Pipeline
                </Link>
              </li>
              <li>
                <Link
                  href="/security"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Enclaves
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-primary hover:text-primary-hover font-semibold transition-colors flex items-center gap-1"
                >
                  <span>Start Analyzing</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Intelligence Engines */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Intelligence
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/how-it-works#evidence" className="hover:text-foreground transition-colors">
                  Evidence Ingestion
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#dna" className="hover:text-foreground transition-colors">
                  Failure DNA (8 Dimensions)
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#truth-engine" className="hover:text-foreground transition-colors">
                  Truth Engine
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#radar" className="hover:text-foreground transition-colors">
                  Failure Radar Snapshot
                </Link>
              </li>
              <li>
                <Link href="/how-it-works#memory" className="hover:text-foreground transition-colors">
                  Organizational Memory
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Workspace & Security */}
          <div className="space-y-3">
            <p className="font-mono text-xs font-bold tracking-wider uppercase text-muted-foreground">
              Workspace & Security
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground transition-colors">
                  Workspace Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-foreground transition-colors">
                  Active Projects
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-foreground transition-colors">
                  Global Intelligence
                </Link>
              </li>
              <li>
                <Link href="/security" className="hover:text-foreground transition-colors flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  <span>3-Tier Privacy Model</span>
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-foreground transition-colors">
                  API & Enclave Settings
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} FailureOps X. Evidence-grounded project intelligence. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Multi-Tenant Isolated Enclaves</span>
            </span>
            <Link href="/security" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/security" className="hover:text-foreground transition-colors">
              Data Governance
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
