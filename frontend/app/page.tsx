'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  FileSearch,
  Dna,
  Scale,
  Database,
  Radar,
  Lightbulb,
  CheckCircle2,
  Lock,
  ArrowUpRight,
  Activity,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { HeroProductPreview } from '@/components/landing/HeroProductPreview';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { FailureDNASection } from '@/components/landing/FailureDNASection';
import { TruthEngineWidget } from '@/components/landing/TruthEngineWidget';
import { HistoricalSearchWidget } from '@/components/landing/HistoricalSearchWidget';
import { FailureRadarSection } from '@/components/landing/FailureRadarSection';
import { InterventionOutcomeSection } from '@/components/landing/InterventionOutcomeSection';
import { PrivacyModelSection } from '@/components/landing/PrivacyModelSection';
import { btnPrimary, btnSecondary, focusRing } from '@/components/landing/chrome';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      {/* SECTION 0: Public Enterprise Navbar */}
      <PublicNavbar />

      <main className="flex-1 flex flex-col">
        {/* SECTION 1: Hero */}
        <section className="relative w-full pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-border/40 bg-gradient-to-b from-background via-surface-feed/30 to-background">
          {/* Subtle Ambient Grid Background */}
          <div
            className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 sm:space-y-14">
            {/* Hero Copy */}
            <div className="text-center max-w-4xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold tracking-wide">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>ORGANIZATIONAL EARLY-WARNING INTELLIGENCE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                Know where your project is heading{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-orange-400 to-amber-300">
                  before it gets there.
                </span>
              </h1>

              <p className="text-base sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                FailureOps X turns fragmented project evidence into explainable risk intelligence — connecting signals, patterns, historical outcomes, and verified interventions.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
                <Link
                  href="/signup"
                  className={cn(btnPrimary('w-full sm:w-auto text-sm px-7 py-4 gap-2 font-bold shadow-md'))}
                >
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/how-it-works"
                  className={cn(btnSecondary('w-full sm:w-auto text-sm px-6 py-4 gap-2 font-semibold'))}
                >
                  <span>See how it works</span>
                </Link>
              </div>

              {/* Supporting Trust Line */}
              <div className="pt-2 flex items-center justify-center gap-4 sm:gap-6 text-xs text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Evidence-grounded</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Explainable</span>
                </span>
                <span className="text-border">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Privacy-controlled</span>
                </span>
              </div>
            </div>

            {/* Hero Product Preview Visualizer */}
            <div className="max-w-5xl mx-auto pt-4">
              <HeroProductPreview />
            </div>
          </div>
        </section>

        {/* SECTION 2: Evidence → Intelligence Workflow */}
        <WorkflowSection />

        {/* SECTION 3: Failure DNA */}
        <FailureDNASection />

        {/* SECTION 4: Truth Engine / Assumption Validation */}
        <TruthEngineWidget />

        {/* SECTION 5: Historical Intelligence */}
        <HistoricalSearchWidget />

        {/* SECTION 6: Failure Radar */}
        <FailureRadarSection />

        {/* SECTION 7: Intervention → Experiment → Verified Learning */}
        <InterventionOutcomeSection />

        {/* SECTION 8: Privacy / Controlled Knowledge Sharing */}
        <PrivacyModelSection />

        {/* SECTION 9: Final CTA */}
        <section className="w-full py-16 sm:py-24 bg-gradient-to-b from-card/80 to-background border-t border-border relative overflow-hidden">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <span>Deploy Early-Warning Intelligence</span>
            </div>

            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Turn project evidence into foresight.
            </h2>

            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Upload your PRDs, Jira backlog, and customer telemetry. Get immediate multidimensional Failure DNA, causal risk radars, and empirical playbooks in minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/signup"
                className={cn(btnPrimary('w-full sm:w-auto text-sm px-8 py-4 gap-2 font-bold shadow-lg'))}
              >
                <span>Get started</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/platform"
                className={cn(btnSecondary('w-full sm:w-auto text-sm px-6 py-4 font-semibold'))}
              >
                <span>Explore platform</span>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground pt-2">
              Evidence-grounded • Explainable • Privacy-controlled
            </p>
          </div>
        </section>
      </main>

      {/* SECTION 10: Professional Enterprise Footer */}
      <PublicFooter />
    </div>
  );
}
