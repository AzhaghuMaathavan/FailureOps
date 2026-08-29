'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  FileSearch,
  Dna,
  Scale,
  Database,
  Radar,
  GitFork,
  Lightbulb,
  CheckCircle2,
  Lock,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { IntelligencePipeline } from '@/components/common/IntelligencePipeline';
import { BrandLogo } from '@/components/common/BrandLogo';

export default function LandingPage() {
  const capabilities = [
    {
      title: 'Evidence Intelligence',
      description: 'Ingests fragmented PRDs, customer feedback, CI/CD telemetry, and Jira metrics into an encrypted reasoning enclave.',
      icon: FileSearch,
      href: '/projects/aurora/evidence',
    },
    {
      title: 'Failure DNA',
      description: 'Generates a multidimensional vector fingerprint (Technical, Operational, Adoption, Execution, Customer) describing the failure archetype.',
      icon: Dna,
      href: '/projects/aurora/dna',
    },
    {
      title: 'Truth Engine',
      description: 'Empirically challenges team dogma and assumptions against cross-source reality (e.g. pricing vs onboarding friction).',
      icon: Scale,
      href: '/projects/aurora/truth-engine',
    },
    {
      title: 'Historical Memory',
      description: 'Cross-references current failure trajectories against verified past cases to uncover identical failure precedents.',
      icon: Database,
      href: '/historical/atlas',
    },
    {
      title: 'Failure Radar',
      description: 'Continuously monitors weak signal escalation and forecasts the most probable future failure milestones.',
      icon: Radar,
      href: '/projects/aurora/radar',
    },
    {
      title: 'Causal Reasoning',
      description: 'Constructs causal failure cascade graphs linking team overload and flaky CI directly to missed delivery horizons.',
      icon: GitFork,
      href: '/projects/aurora/causal',
    },
    {
      title: 'Evidence-Backed Interventions',
      description: 'Synthesizes targeted operational recovery playbooks backed by empirical success rates in similar historical products.',
      icon: Lightbulb,
      href: '/projects/aurora/interventions',
    },
    {
      title: 'Outcome Verification',
      description: 'Tracks A/B cohort experiments to measure real metric lift and stores validated learnings into institutional memory.',
      icon: CheckCircle2,
      href: '/projects/aurora/outcomes',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/30 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_420px_at_70%_-10%,rgba(255,122,0,0.14),transparent_55%)]" />
      {/* Top Bar */}
      <header className="h-16 w-full border-b border-border/80 px-6 lg:px-12 flex items-center justify-between backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <BrandLogo size="md" href="/" />

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/projects/aurora/overview"
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wide transition-all shadow-[0_0_20px_-5px_rgba(255,122,0,0.4)] flex items-center gap-1.5"
          >
            <span>Live Aurora Demo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 space-y-20">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center mb-2">
            <div className="relative p-3.5 rounded-3xl bg-card/60 border border-border/80 shadow-[0_0_50px_-10px_rgba(255,122,0,0.5)] backdrop-blur-md hover:scale-105 transition-transform">
              <img src="/logo.png" alt="FailureOps X" className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(255,122,0,0.6)]" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous Failure Prediction & Organizational Memory</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            See the failure signals <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-amber-400 to-rose-400">
              before they become failure.
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Connect fragmented organizational evidence, detect hidden failure patterns, predict what could go wrong next, and learn from interventions that actually worked.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold tracking-wide transition-all shadow-[0_0_25px_-5px_rgba(255,122,0,0.5)] flex items-center gap-2 group"
            >
              <span>Analyze a Product</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/memory"
              className="px-6 py-3.5 rounded-xl bg-card hover:bg-card-hover border border-border text-foreground text-sm font-semibold tracking-wide transition-colors flex items-center gap-2"
            >
              <Database className="w-4 h-4 text-primary" />
              <span>Explore Organizational Memory</span>
            </Link>
          </div>
        </div>

        {/* Core Product Loop Pipeline Visualizer */}
        <div className="space-y-3">
          <IntelligencePipeline currentStage="evidence" projectId="aurora" />
        </div>

        {/* Capability Matrix */}
        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
              Core Intelligence Engines
            </h2>
            <p className="text-2xl font-bold text-foreground">
              From Weak Telemetry to Validated Institutional Memory
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {capabilities.map(cap => {
              const Icon = cap.icon;
              return (
                <Link
                  key={cap.title}
                  href={cap.href}
                  className="group p-5 rounded-2xl bg-card border border-border/70 hover:border-primary/40 hover:bg-card-hover transition-all duration-200 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)] flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-surface-feed border border-border flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors mb-4">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                      {cap.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border/40 flex items-center text-xs font-semibold text-primary">
                    <span>Inspect Engine</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Hackathon Demo Banner */}
        <div className="p-8 rounded-3xl bg-gradient-to-r from-card via-surface-feed to-card border border-primary/30 text-center space-y-4 shadow-xl">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Interactive Hackathon Walkthrough
          </span>
          <h3 className="text-2xl font-bold text-foreground">
            Experience Project Aurora: From 82% Risk to +33pp Recovery
          </h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Test the complete early-warning loop with pre-loaded mock telemetry from 5 distinct sources. Discover why pricing was challenged and how a 3-step onboarding experiment prevented a missed release.
          </p>
          <div className="pt-2">
            <Link
              href="/projects/aurora/overview"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-all"
            >
              <span>Launch Full Aurora Briefing</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/80 py-8 px-6 lg:px-12 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>FailureOps X • Autonomous Early-Warning Intelligence Platform</span>
        </div>
        <div className="flex items-center gap-6 font-mono text-[11px]">
          <span>Enclave Encryption: AES-256</span>
          <span>Zero-Knowledge Proofs Active</span>
        </div>
      </footer>
    </div>
  );
}
