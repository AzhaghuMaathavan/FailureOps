import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Layers,
  FileSearch,
  Dna,
  Scale,
  Database,
  Radar,
  Lightbulb,
  CheckCircle2,
  Lock,
  ArrowRight,
  Shield,
  Activity,
  Cpu,
  TrendingUp,
} from 'lucide-react';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { btnPrimary, btnSecondary } from '@/components/landing/chrome';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Platform Architecture — FailureOps X',
  description:
    'Explore the evidence-grounded intelligence platform architecture behind FailureOps X. From raw evidence ingestion to predictive failure radars.',
};

export default function PlatformPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
      <PublicNavbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="py-16 sm:py-20 border-b border-border/40 bg-gradient-to-b from-background via-surface-feed/30 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <span>Platform Architecture</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              The Enterprise Project Intelligence Layer
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              FailureOps X replaces subjective intuition with evidence-grounded risk synthesis. Learn how our multi-agent architecture turns fragmented documents into proactive organizational foresight.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/register" className={btnPrimary('gap-2 text-sm')}>
                <span>Start Analyzing Projects</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/how-it-works" className={btnSecondary('text-sm')}>
                <span>View How It Works</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 3 Core Architecture Pillars */}
        <section className="py-16 sm:py-20 border-b border-border/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Pillar 1: Evidence Ingestion */}
              <div className="p-8 rounded-2xl bg-card border border-border space-y-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary w-fit">
                  <FileSearch className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  1. Evidence Ingestion & Normalization
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ingests multi-source project data (PRDs, Jira backlog, CI/CD telemetry, incident postmortems, customer churn surveys) into isolated cryptographic tenant enclaves with exact document-page lineage.
                </p>
                <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Support for PDF, DOCX, XLSX, CSV, PPTX, TXT, MD</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Deterministic sentence-level citation tracking</span>
                  </li>
                </ul>
              </div>

              {/* Pillar 2: Intelligence & DNA */}
              <div className="p-8 rounded-2xl bg-card border border-border space-y-4">
                <div className="p-3 rounded-xl bg-warning/10 text-warning w-fit">
                  <Dna className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  2. Causal Reasoning & Failure DNA
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Extracts weak cross-source signals, clusters multi-metric patterns, and computes an 8-dimensional risk profile that balances positive counter-evidence against failure seeds.
                </p>
                <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>8 dimensions (Adoption, Tech, Ops, Execution, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Directed acyclic causal reasoning graphs</span>
                  </li>
                </ul>
              </div>

              {/* Pillar 3: Action & Memory */}
              <div className="p-8 rounded-2xl bg-card border border-border space-y-4">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 w-fit">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground">
                  3. Action, Experiment & Memory
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Formulates prioritized interventions, runs structured validation experiments, measures empirical lift, and stores verified learnings into Organizational Memory.
                </p>
                <ul className="space-y-2 text-xs text-foreground font-medium pt-2 border-t border-border/60">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Mathematical effort-to-impact ROI ranking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Institutional learning feedback loop</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Capabilities Table */}
        <section className="py-16 sm:py-20 bg-surface-base">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Enterprise Feature Comparison
              </h2>
              <p className="text-sm text-muted-foreground">
                How FailureOps X compares against conventional document search tools.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-surface-feed border-b border-border text-muted-foreground font-mono uppercase text-[11px]">
                    <tr>
                      <th className="p-4 sm:p-5">Capability</th>
                      <th className="p-4 sm:p-5">Standard Document RAG</th>
                      <th className="p-4 sm:p-5 text-primary font-bold">FailureOps X Platform</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-foreground">
                    <tr>
                      <td className="p-4 sm:p-5 font-bold">Scope of Operation</td>
                      <td className="p-4 sm:p-5 text-muted-foreground">Simple question-and-answer retrieval</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary">Continuous predictive risk intelligence</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-bold">Cross-Source Synthesis</td>
                      <td className="p-4 sm:p-5 text-muted-foreground">Single document context chunks</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary">Correlates Jira + CI/CD + PRDs + Surveys</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-bold">Assumption Testing</td>
                      <td className="p-4 sm:p-5 text-muted-foreground">None (relies on user prompt phrasing)</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary">Truth Engine validates beliefs vs evidence</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-bold">Failure Forecasting</td>
                      <td className="p-4 sm:p-5 text-muted-foreground">None</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary">Failure Radar with explainable causal links</td>
                    </tr>
                    <tr>
                      <td className="p-4 sm:p-5 font-bold">Outcome Memory</td>
                      <td className="p-4 sm:p-5 text-muted-foreground">Ephemeral chat history</td>
                      <td className="p-4 sm:p-5 font-semibold text-primary">Durable Organizational Memory & recovery deltas</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
