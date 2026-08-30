import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Sparkles,
  FileSearch,
  Activity,
  Dna,
  Scale,
  Database,
  Radar,
  Lightbulb,
  CheckCircle2,
  GitFork,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { btnPrimary, btnSecondary } from '@/components/landing/chrome';

export const metadata: Metadata = {
  title: '10-Stage Intelligence Layer — FailureOps X',
  description:
    'Deep architectural dive into the 10-stage intelligence pipeline of FailureOps X: from document ingestion to verified organizational learning.',
};

export default function IntelligencePage() {
  const stages = [
    {
      num: '01',
      name: 'Evidence Normalization',
      role: 'Parses heterogeneous documents into structured evidence items with page and sentence coordinates.',
      metric: 'Exact Lineage',
    },
    {
      num: '02',
      name: 'Weak Signal Extraction',
      role: 'Isolates metric deltas, directional shifts, and sentiment anomalies from raw text.',
      metric: 'Multi-Silo',
    },
    {
      num: '03',
      name: 'Pattern Clustering',
      role: 'Groups isolated signals into coherent risk themes (e.g. Onboarding friction + Build failure).',
      metric: 'Correlated',
    },
    {
      num: '04',
      name: 'Failure DNA Synthesis',
      role: 'Computes normalized 0–100 risk scores across 8 fundamental project health dimensions.',
      metric: '8 Dimensions',
    },
    {
      num: '05',
      name: 'Truth Engine Validation',
      role: 'Tests stated team assumptions against grounded evidence, highlighting blindspots.',
      metric: 'Objective Truth',
    },
    {
      num: '06',
      name: 'Historical Intelligence',
      role: 'Vector search across sanitized cross-industry case studies to find trajectory twins.',
      metric: 'Case Matching',
    },
    {
      num: '07',
      name: 'Failure Radar Snapshot',
      role: 'Produces the executive early-warning forecast with risk velocity and health states.',
      metric: 'Early Warning',
    },
    {
      num: '08',
      name: 'Predicted Next Failure',
      role: 'Builds explainable causal reasoning chains that forecast the upcoming milestone obstacle.',
      metric: 'Predictive RAG',
    },
    {
      num: '09',
      name: 'Intervention Synthesis',
      role: 'Generates prioritized playbooks ranked mathematically by impact-to-effort ratios.',
      metric: 'ROI Playbooks',
    },
    {
      num: '10',
      name: 'Outcome Memory Feedback',
      role: 'Measures verified lift from remediation experiments and permanently enriches Organizational Memory.',
      metric: 'Verified Lift',
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="py-16 sm:py-20 border-b border-border/40 bg-gradient-to-b from-background via-surface-feed/30 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <span>Continuous Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              The 10-Stage Intelligence Pipeline
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              FailureOps X replaces one-off AI chat prompts with a deterministic, multi-stage reasoning engine built specifically to predict and resolve organizational failure.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className={btnPrimary('gap-2 text-sm')}>
                <span>Start Analyzing Projects</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/security" className={btnSecondary('text-sm')}>
                <span>View Security Model</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 10 Pipeline Stages */}
        <section className="py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="space-y-4">
              {stages.map((st) => (
                <div
                  key={st.num}
                  className="p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-mono text-sm font-bold flex items-center justify-center shrink-0">
                      {st.num}
                    </span>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-foreground">
                        {st.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 max-w-2xl">
                        {st.role}
                      </p>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-lg bg-surface-feed text-foreground text-xs font-mono font-semibold border border-border shrink-0 self-start sm:self-auto">
                    {st.metric}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
