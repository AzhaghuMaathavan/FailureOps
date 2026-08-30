'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Scale,
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { btnPrimary } from './chrome';

interface AssumptionExample {
  id: string;
  claim: string;
  verdict: 'CHALLENGED' | 'SUPPORTED';
  verdictDetail: string;
  evidenceStats: { label: string; value: string; isHot?: boolean }[];
  snippet: string;
  sourceDoc: string;
}

const ASSUMPTIONS: AssumptionExample[] = [
  {
    id: 'pricing',
    claim: 'Pricing friction is causing low post-trial activation.',
    verdict: 'CHALLENGED',
    verdictDetail: 'Current evidence indicates onboarding complexity and API key provisioning are the true churn drivers, while pricing mentions account for under 8% of complaints.',
    evidenceStats: [
      { label: 'Pricing Complaints', value: '8%' },
      { label: 'Setup Abandonment', value: '76%', isHot: true },
      { label: 'Step-2 Dropoff', value: '43%', isHot: true },
      { label: 'Activation Delta', value: '-37%' },
    ],
    snippet: '"Users frequently abandon during step 2 of initial setup when asked to copy raw webhook keys manually..."',
    sourceDoc: 'Customer Research & Churn Interviews Q3.pdf',
  },
  {
    id: 'infra',
    claim: 'API latency spikes are caused by external vector database cold starts.',
    verdict: 'CHALLENGED',
    verdictDetail: 'Evidence shows vector search latency averaged 18ms, while un-indexed tenant relationship queries in PostgreSQL accounted for 92% of request bottlenecks.',
    evidenceStats: [
      { label: 'Vector Query Time', value: '18ms' },
      { label: 'DB Join Latency', value: '840ms', isHot: true },
      { label: 'Postgres CPU Peak', value: '94%', isHot: true },
      { label: 'Index Coverage', value: '31%' },
    ],
    snippet: '"EXPLAIN ANALYZE on tenant audit query showed sequential table scans across 1.4M rows on each workspace refresh..."',
    sourceDoc: 'Engineering Incident Postmortem #104.md',
  },
  {
    id: 'delivery',
    claim: 'Sprint velocity slip is primarily driven by frontend scope creep.',
    verdict: 'CHALLENGED',
    verdictDetail: 'Evidence reveals PR review turnaround latency rose from 14h to 48h due to engineering context switching, causing 68% of sprint blockers.',
    evidenceStats: [
      { label: 'Scope Changes', value: '4 tickets' },
      { label: 'PR Review Delay', value: '+240%', isHot: true },
      { label: 'Engineer Overtime', value: '24h/wk', isHot: true },
      { label: 'Blocked PRs', value: '18 PRs' },
    ],
    snippet: '"Engineers reported high context switching between bug fixes and new features, delaying review feedback by over 2 days..."',
    sourceDoc: 'Sprint Retrospective & Team Operations Log.docx',
  },
];

export const TruthEngineWidget: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string>('pricing');
  const current = ASSUMPTIONS.find((a) => a.id === selectedId) || ASSUMPTIONS[0];

  return (
    <section className="w-full py-16 sm:py-24 bg-card/40 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Description */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5" />
              <span>Truth Engine / Assumption Validation</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Challenge Team Dogma with Grounded Evidence
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              When projects drift, teams often misdiagnose the cause — blaming pricing for bad onboarding, or blaming scope for review bottlenecks.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              The Truth Engine cross-examines subjective team assumptions against real telemetry, surveys, Jira records, and PRDs before wrong decisions harden.
            </p>

            <div className="space-y-2 pt-2">
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
                Select an example assumption:
              </p>
              <div className="flex flex-col gap-2">
                {ASSUMPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'text-left p-3 rounded-xl border text-xs font-medium transition-all duration-150 flex items-center justify-between',
                      selectedId === item.id
                        ? 'bg-card border-primary text-foreground font-semibold shadow-sm'
                        : 'bg-surface-feed/60 border-border/70 text-muted-foreground hover:text-foreground hover:bg-card'
                    )}
                  >
                    <span className="line-clamp-1 italic">&ldquo;{item.claim}&rdquo;</span>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded ml-2 shrink-0',
                        item.verdict === 'CHALLENGED'
                          ? 'bg-warning/15 text-warning'
                          : 'bg-emerald-500/15 text-emerald-400'
                      )}
                    >
                      {item.verdict}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Product Card Visualizer */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-border/80 bg-card shadow-xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/60 bg-surface-feed/80 flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Investigation Report (Illustrative)
                </span>
                <span className="px-2 py-0.5 rounded bg-background border border-border text-[10px] font-mono text-muted-foreground">
                  Cross-Source Synthesis
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                {/* Tested Claim */}
                <div className="space-y-1.5">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    Tested Assumption
                  </p>
                  <p className="text-base sm:text-lg font-bold text-foreground italic border-l-2 border-primary pl-3.5 py-0.5">
                    &ldquo;{current.claim}&rdquo;
                  </p>
                </div>

                {/* Evidence Stats Grid */}
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    Extracted Metric Evidence
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {current.evidenceStats.map((stat) => (
                      <div
                        key={stat.label}
                        className={cn(
                          'p-3 rounded-xl border text-center space-y-1',
                          stat.isHot
                            ? 'bg-warning/10 border-warning/30 text-warning'
                            : 'bg-surface-feed/70 border-border text-foreground'
                        )}
                      >
                        <p className="text-[11px] text-muted-foreground leading-tight font-medium">
                          {stat.label}
                        </p>
                        <p className="font-mono text-lg font-extrabold">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verdict Box */}
                <div className="p-4 rounded-xl bg-warning/10 border border-warning/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-warning">
                      Verdict: Assumption Challenged by Evidence
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground leading-relaxed font-medium">
                    {current.verdictDetail}
                  </p>
                </div>

                {/* Grounded Citation */}
                <div className="p-3.5 rounded-xl bg-surface-feed/60 border border-border/70 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground font-mono text-[11px]">
                    <span className="flex items-center gap-1.5 text-foreground font-semibold">
                      <FileSearch className="w-3.5 h-3.5 text-primary" />
                      {current.sourceDoc}
                    </span>
                    <span>Confidence: 94%</span>
                  </div>
                  <p className="text-muted-foreground italic pl-5">
                    {current.snippet}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
