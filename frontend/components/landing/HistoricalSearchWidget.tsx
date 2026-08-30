'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Database,
  Search,
  ArrowRight,
  TrendingUp,
  Shield,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { focusRing, btnPrimary } from './chrome';

interface HistoricalCase {
  id: string;
  title: string;
  queryMatch: string;
  similarity: number;
  observedChallenge: string;
  failurePattern: string;
  intervention: string;
  outcome: string;
  confidence: number;
  category: string;
}

const HISTORICAL_EXAMPLES: HistoricalCase[] = [
  {
    id: 'expense-app',
    title: 'Expense Management & Corporate Card Suite',
    queryMatch: 'Expense management platform with receipt scanning, budget tracking and team expenses',
    similarity: 91,
    observedChallenge: 'Low 14-day trial activation despite high organic signup traffic',
    failurePattern: 'Complex multi-step corporate card provisioning caused 65% initial dropoff',
    intervention: 'Decoupled virtual card creation from KYC approval, enabling instant receipt testing',
    outcome: '+21 percentage points activation lift within 30 days',
    confidence: 93,
    category: 'FinTech / SaaS',
  },
  {
    id: 'developer-tool',
    title: 'Distributed Tracing & CI Observability Platform',
    queryMatch: 'Developer observability platform with OpenTelemetry integration and build analytics',
    similarity: 88,
    observedChallenge: 'High 60-day churn after initial deployment across large engineering teams',
    failurePattern: 'Overwhelming noise in alert feeds led engineers to mute notifications completely',
    intervention: 'Implemented automated signal clustering and reduced default alert volume by 70%',
    outcome: '+34% weekly active team retention and 4.8/5 CSAT recovery',
    confidence: 89,
    category: 'DevTools / Infrastructure',
  },
  {
    id: 'healthcare-portal',
    title: 'Patient Telehealth & Prescription Coordination',
    queryMatch: 'Telehealth platform with asynchronous doctor consults and pharmacy fulfillment',
    similarity: 85,
    observedChallenge: 'Critical drop in consult completion rates during peak evening hours',
    failurePattern: 'Database lock contention on un-sharded appointment availability tables',
    intervention: 'Migrated appointment reservation slotting to optimistic concurrency cache',
    outcome: 'Eliminated consult timeout errors and restored 99.9% booking success',
    confidence: 95,
    category: 'HealthTech / Operations',
  },
];

export const HistoricalSearchWidget: React.FC = () => {
  const [selectedCase, setSelectedCase] = useState<HistoricalCase>(HISTORICAL_EXAMPLES[0]);
  const [searchQuery, setSearchQuery] = useState<string>(HISTORICAL_EXAMPLES[0].queryMatch);

  const handleSelectCase = (c: HistoricalCase) => {
    setSelectedCase(c);
    setSearchQuery(c.queryMatch);
  };

  return (
    <section className="w-full py-16 sm:py-24 bg-surface-base border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            <span>Organizational Memory & Historical Intelligence</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Don&apos;t Repeat the Failures Others Already Solved
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Search sanitized institutional memory across thousands of historical projects. Discover what broke, why it broke, and the verified interventions that turned them around.
          </p>
        </div>

        {/* Interactive Query Simulator */}
        <div className="mt-10 max-w-4xl mx-auto space-y-6">
          <div className="p-3 sm:p-4 rounded-2xl bg-card border border-border shadow-lg space-y-3">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-muted-foreground absolute left-3.5" />
              <input
                type="text"
                readOnly
                value={searchQuery}
                className="w-full bg-surface-feed/80 border border-border rounded-xl pl-11 pr-4 py-3 text-xs sm:text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Describe a product, project, challenge, or failure pattern..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-mono font-bold text-muted-foreground uppercase">
                Example queries:
              </span>
              {HISTORICAL_EXAMPLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCase(c)}
                  className={cn(
                    'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                    selectedCase.id === c.id
                      ? 'bg-primary/15 text-primary border border-primary/30 font-semibold'
                      : 'bg-surface-feed border border-border/60 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          {/* Historical Case Match Result Card */}
          <div className="p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                    {selectedCase.category}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    Anonymized Case Study
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mt-1">
                  {selectedCase.title}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-surface-feed border border-border text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Historical Similarity</p>
                  <p className="font-mono text-base sm:text-lg font-black text-primary">
                    {selectedCase.similarity}%
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-surface-feed border border-border text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase">Confidence</p>
                  <p className="font-mono text-base sm:text-lg font-black text-foreground">
                    {selectedCase.confidence}%
                  </p>
                </div>
              </div>
            </div>

            {/* Case 4-Phase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Challenge */}
              <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-warning">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Observed Challenge</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  {selectedCase.observedChallenge}
                </p>
              </div>

              {/* Pattern */}
              <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-destructive">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Root Failure Pattern</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  {selectedCase.failurePattern}
                </p>
              </div>

              {/* Intervention */}
              <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-primary">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Prescribed Intervention</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-medium">
                  {selectedCase.intervention}
                </p>
              </div>

              {/* Verified Outcome */}
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified Outcome Lift</span>
                </div>
                <p className="text-xs sm:text-sm text-foreground font-semibold">
                  {selectedCase.outcome}
                </p>
              </div>
            </div>

            {/* Privacy Guarantee callout */}
            <div className="p-3.5 rounded-xl bg-surface-feed/50 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Global search retrieves only approved, sanitized intelligence. Raw proprietary documents remain strictly isolated.
                </span>
              </span>
              <Link
                href="/search"
                className="font-semibold text-primary hover:text-primary-hover transition-colors shrink-0 ml-3"
              >
                Search live intelligence →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
