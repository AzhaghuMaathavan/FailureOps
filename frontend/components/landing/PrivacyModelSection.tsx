'use client';

import React from 'react';
import {
  Lock,
  Building2,
  Globe2,
  ShieldCheck,
  FileKey,
  Filter,
  Layers,
  ArrowRight,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const PrivacyModelSection: React.FC = () => {
  return (
    <section className="w-full py-16 sm:py-24 bg-card/30 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Controlled Knowledge Governance</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Strict Multi-Tier Privacy Architecture
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Your proprietary project roadmaps, code telemetry, and internal retrospectives remain completely under your control. Learn collectively without exposing company IP.
          </p>
        </div>

        {/* 3 Knowledge-Sharing Tiers */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1: Private */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4 relative overflow-hidden">
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive w-fit">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">PRIVATE</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-feed text-muted-foreground">
                  Default Tier
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Isolated Project Enclave</p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Only authorized members assigned to this specific project can access raw source documents, extracted evidence, and causal reasoning trees.
            </p>
            <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                <span>Zero cross-project leakage</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                <span>Raw documents never leave project enclave</span>
              </li>
            </ul>
          </div>

          {/* Tier 2: Organization */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4 relative overflow-hidden">
            <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">ORGANIZATION</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary">
                  Team Sharing
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Company-Wide Learning</p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Approved intelligence, pattern summaries, and verified playbooks are shareable across teams within the verified company organization.
            </p>
            <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Internal playbooks & postmortem sharing</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Cross-team failure radar benchmarking</span>
              </li>
            </ul>
          </div>

          {/* Tier 3: Global Sanitized */}
          <div className="p-6 sm:p-7 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4 relative overflow-hidden">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
              <Globe2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">GLOBAL SANITIZED</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                  Ecosystem Intelligence
                </span>
              </div>
              <p className="text-xs font-mono text-muted-foreground uppercase">Anonymized Insights</p>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Only scrubbed, fully anonymized structural patterns and verified lift outcomes can contribute to global intelligence benchmarking.
            </p>
            <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>All PII and company identities stripped</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Raw source documents never indexed</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Sanitization Pipeline Flow Diagram */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-surface-feed border border-border shadow-md">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center space-y-1">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                The Sanitization & Isolation Pipeline
              </p>
              <h4 className="text-base sm:text-lg font-bold text-foreground">
                How Private Documents Transform into Safe Collective Intelligence
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center text-center">
              <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                <FileKey className="w-5 h-5 text-destructive mx-auto" />
                <p className="text-xs font-bold text-foreground">Private Docs</p>
                <p className="text-[10px] text-muted-foreground">PRDs, logs, Jira</p>
              </div>

              <div className="hidden sm:flex justify-center text-muted-foreground">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                <Filter className="w-5 h-5 text-warning mx-auto" />
                <p className="text-xs font-bold text-foreground">Evidence & Rules</p>
                <p className="text-[10px] text-muted-foreground">Entity redaction</p>
              </div>

              <div className="hidden sm:flex justify-center text-muted-foreground">
                <ArrowRight className="w-4 h-4" />
              </div>

              <div className="p-3 rounded-xl bg-card border border-border space-y-1">
                <Globe2 className="w-5 h-5 text-emerald-400 mx-auto" />
                <p className="text-xs font-bold text-foreground">Global Memory</p>
                <p className="text-[10px] text-muted-foreground">Safe benchmark</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
