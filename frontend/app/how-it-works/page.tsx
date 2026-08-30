import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  FileSearch,
  Activity,
  Dna,
  Scale,
  Database,
  Radar,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  Shield,
  UploadCloud,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { PublicNavbar } from '@/components/landing/PublicNavbar';
import { PublicFooter } from '@/components/landing/PublicFooter';
import { btnPrimary, btnSecondary } from '@/components/landing/chrome';

export const metadata: Metadata = {
  title: 'How It Works — FailureOps X',
  description:
    'Detailed walkthrough of how FailureOps X turns raw project documents into proactive early-warning failure intelligence.',
};

export default function HowItWorksPage() {
  const steps = [
    {
      id: 'evidence',
      num: '01',
      title: 'Evidence Ingestion & Granular Extraction',
      desc: 'You upload project documents (PRDs, roadmaps, customer surveys, incident postmortems, CI/CD telemetry). FailureOps parses tables, text, and logs, isolating exact statements with sentence-level coordinates and document IDs.',
      details: [
        'Multi-format support: PDF, DOCX, XLSX, CSV, PPTX, TXT, Markdown',
        'Deterministic citation tracking: document ID, page number, section heading',
        'Cryptographically isolated tenant storage with zero cross-tenant leakage',
      ],
      icon: UploadCloud,
    },
    {
      id: 'signals',
      num: '02',
      title: 'Weak Signal & Pattern Detection',
      desc: 'Our signal agent analyzes extracted statements across multiple departments. It connects disparate weak signals — like a 41% spike in developer overtime alongside a 125% increase in CI build failures.',
      details: [
        'Detects hidden correlations across engineering, product, and customer silos',
        'Calculates metric before/after changes with baseline comparisons',
        'Labels signals by polarity, severity, and historical prevalence',
      ],
      icon: Activity,
    },
    {
      id: 'dna',
      num: '03',
      title: 'Failure DNA Multi-Dimensional Synthesis',
      desc: 'Instead of assuming every project is in crisis, FailureOps calculates an 8-dimensional Failure DNA profile. It balances positive accomplishments against risk seeds to deliver an objective health score.',
      details: [
        'Evaluates Technical, Operational, Adoption, Execution, Financial, Market, Team, and Quality',
        'Identifies dominant risk dimensions without generating false panic',
        'Highlights corroborating and contradicting evidence clusters',
      ],
      icon: Dna,
    },
    {
      id: 'truth-engine',
      num: '04',
      title: 'Truth Engine Assumption Cross-Examination',
      desc: 'Teams can query their hypotheses directly. When leadership assumes "Users are churning because of pricing," the Truth Engine checks the claim against raw evidence and highlights the reality.',
      details: [
        'Evidence-backed verdict: SUPPORTED, CHALLENGED, or INCONCLUSIVE',
        'Metric breakdown of conflicting customer complaints and logs',
        'Direct links to raw survey quotes and system telemetry',
      ],
      icon: Scale,
    },
    {
      id: 'radar',
      num: '05',
      title: 'Failure Radar & Trajectory Forecasting',
      desc: 'The platform builds a directed causal graph connecting weak signals to probable upcoming milestone failures, answering the vital question: "Why did the radar reach this conclusion?"',
      details: [
        'Forecasts specific upcoming failure milestones (e.g. 30-day retention collapse)',
        'Calibrated prediction confidence score based on evidence density',
        'Historical precedent matching against anonymized prior trajectories',
      ],
      icon: Radar,
    },
    {
      id: 'memory',
      num: '06',
      title: 'Intervention, Experiment & Organizational Memory',
      desc: 'FailureOps generates prioritized playbooks to remediate the root causes. Once an experiment verifies measurable recovery, the playbook is stored in Organizational Memory.',
      details: [
        'Mathematical playbook ranking: (Severity × Confidence × Impact) ÷ Effort',
        'Hypothesis tracking with pre-defined success metrics and time horizons',
        'Permanent institutional memory so future teams avoid repeated mistakes',
      ],
      icon: CheckCircle2,
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
              <span>Step-by-Step Intelligence Workflow</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
              How FailureOps X Works
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A comprehensive walkthrough of the evidence-to-outcome pipeline that protects engineering and product teams from avoidable failure.
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

        {/* 6 Step Interactive Deep-Dive Cards */}
        <section className="py-16 sm:py-24">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  id={step.id}
                  className="p-6 sm:p-10 rounded-2xl bg-card border border-border shadow-lg space-y-6 scroll-mt-24"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs font-mono font-bold text-primary uppercase">
                          STEP {step.num}
                        </span>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                          {step.title}
                        </h2>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                    {step.desc}
                  </p>

                  <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-2">
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      Technical Guarantees:
                    </p>
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
                      {step.details.map((d, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
