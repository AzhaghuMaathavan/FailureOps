import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Building2,
  Globe2,
  FileKey,
  Filter,
  CheckCircle2,
  ArrowRight,
  Database,
  KeyRound,
  EyeOff,
} from 'lucide-react';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { btnPrimary, btnSecondary } from '@/components/landing/chrome';

export const metadata: Metadata = {
  title: 'Security & Privacy Architecture — FailureOps X',
  description:
    'Explore the multi-tier privacy model, tenant isolation enclaves, and sanitization governance protecting your project evidence.',
};

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="py-16 sm:py-20 border-b border-border/40 bg-gradient-to-b from-background via-surface-feed/30 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Security & Privacy Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              Enterprise Governance by Design
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We believe project failure intelligence is only valuable when your company’s trade secrets, internal postmortems, and customer feedback are cryptographically protected.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/signup" className={btnPrimary('gap-2 text-sm')}>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/platform" className={btnSecondary('text-sm')}>
                <span>Platform Architecture</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Privacy Tiers */}
        <section className="py-16 sm:py-20 border-b border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Three Explicit Knowledge-Sharing Levels
              </h2>
              <p className="text-sm text-muted-foreground">
                You configure data boundaries on a per-project basis. Defaults are always set to maximum isolation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Private */}
              <div className="p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4">
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive w-fit">
                  <Lock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surface-feed text-muted-foreground uppercase">
                    Tier 1 (Default)
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-1">PRIVATE</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Only explicitly authorized members assigned to this project can access raw source files, extracted snippets, and reasoning logs.
                </p>
                <ul className="space-y-1.5 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Isolated PostgreSQL tenant partition</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Isolated vector index namespaces</span>
                  </li>
                </ul>
              </div>

              {/* Organization */}
              <div className="p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-primary/15 text-primary uppercase">
                    Tier 2
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-1">ORGANIZATION</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Approved intelligence summaries, risk benchmarks, and verified postmortem playbooks can be shared across teams in your company.
                </p>
                <ul className="space-y-1.5 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Company-wide Organizational Memory</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cross-product radar benchmarking</span>
                  </li>
                </ul>
              </div>

              {/* Global Sanitized */}
              <div className="p-7 rounded-2xl bg-card border border-border shadow-lg space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                  <Globe2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase">
                    Tier 3
                  </span>
                  <h3 className="text-lg font-bold text-foreground mt-1">GLOBAL SANITIZED</h3>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Only scrubbed, fully anonymized structural failure patterns and verified recovery lifts can contribute to global intelligence.
                </p>
                <ul className="space-y-1.5 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>All PII & proprietary entities stripped</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Raw documents never accessible</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Engineering Controls Grid */}
        <section className="py-16 sm:py-20 bg-surface-base">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Concrete Engineering Security Controls
              </h2>
              <p className="text-sm text-muted-foreground">
                Technical safeguards built into every query, ingestion pipeline, and database table.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
                <Database className="w-6 h-6 text-primary" />
                <h4 className="text-base font-bold text-foreground">Multi-Tenant Tenant Isolation</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every query at both the BFF and FastAPI layers enforces organization ID constraints. Cross-tenant IDOR access returns explicit 404/403 rejections.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
                <FileKey className="w-6 h-6 text-primary" />
                <h4 className="text-base font-bold text-foreground">Deterministic Citation Proofs</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every generated signal and DNA dimension retains immutable sentence and page references back to the original source file for complete auditing.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-card border border-border space-y-3">
                <KeyRound className="w-6 h-6 text-primary" />
                <h4 className="text-base font-bold text-foreground">Strict Rate-Limiting & CSRF</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Built-in sliding-window rate limiters protect expensive LLM reasoning endpoints, paired with origin validation on state-changing methods.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
