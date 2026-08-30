'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Database,
  Dna,
  FileSearch,
  FileText,
  Info,
  Layers,
  Radar,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { focusRing, btnPrimary, btnGhost } from './chrome';

export const HeroProductPreview: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'radar' | 'dna' | 'truth'>('radar');
  const [activeEvidenceModal, setActiveEvidenceModal] = useState(false);

  return (
    <div className="relative w-full rounded-2xl border border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl overflow-hidden text-foreground">
      {/* Chrome Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-surface-feed/70">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="w-3 h-3 rounded-full bg-destructive/60 border border-destructive/80" />
            <span className="w-3 h-3 rounded-full bg-warning/60 border border-warning/80" />
            <span className="w-3 h-3 rounded-full bg-success/60 border border-success/80" />
          </div>
          <div className="ml-3 hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-background/80 border border-border text-[11px] font-mono text-muted-foreground">
            <Shield className="w-3 h-3 text-primary" />
            <span>ENCLAVE: Project Launch Enclave</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
          <span className="px-2.5 py-0.5 rounded-full bg-surface-base border border-border/80 text-muted-foreground font-mono text-[10px]">
            Illustrative product view
          </span>
        </div>
      </div>

      {/* Preview Header / Project Health Summary */}
      <div className="p-5 sm:p-6 border-b border-border/50 bg-gradient-to-r from-card to-surface-feed/50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-mono text-base sm:text-lg font-bold tracking-tight text-foreground">
                PROJECT INTELLIGENCE
              </h3>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-warning/15 text-warning border border-warning/30">
                PROJECT LAUNCH
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Multi-source synthesis across engineering PRDs, sprint backlogs, and customer feedback surveys
            </p>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 bg-background/60 p-2.5 sm:p-3 rounded-xl border border-border/60">
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Project Risk</p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-mono text-xl sm:text-2xl font-black text-warning">68</span>
                <span className="text-[11px] font-mono text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border/80" />
            <div>
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Risk Trend</p>
              <div className="flex items-center gap-1 text-warning mt-1 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Increasing</span>
              </div>
            </div>
            <div className="h-8 w-px bg-border/80 hidden sm:block" />
            <div className="hidden sm:block">
              <p className="text-[10px] font-mono uppercase text-muted-foreground">Historical Similarity</p>
              <span className="font-mono text-base font-bold text-foreground mt-0.5 block">87% match</span>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 mt-4 pt-4 border-t border-border/40 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedTab('radar')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap',
              focusRing,
              selectedTab === 'radar'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-feed'
            )}
          >
            <Radar className="w-3.5 h-3.5" />
            <span>Failure Radar & Pattern</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('dna')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap',
              focusRing,
              selectedTab === 'dna'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-feed'
            )}
          >
            <Dna className="w-3.5 h-3.5" />
            <span>Failure DNA (Dimensions)</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab('truth')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap',
              focusRing,
              selectedTab === 'truth'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-feed'
            )}
          >
            <FileSearch className="w-3.5 h-3.5" />
            <span>Assumption vs Reality</span>
          </button>
        </div>
      </div>

      {/* Tab Content 1: Radar & Emerging Pattern */}
      {selectedTab === 'radar' && (
        <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-surface-feed/70 border border-border/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-warning flex items-center gap-1.5 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Emerging Failure Pattern Detected
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">Confidence 84%</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                Onboarding friction → Steep activation drop-off → Repeat usage failure
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Telemetry shows signup volume remains high, but complex permissions setup creates a 43% step-2 abandonment cluster correlated with CI/CD delay on workspace sync.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveEvidenceModal(true)}
                  className="px-2.5 py-1 rounded bg-card hover:bg-card-hover border border-border text-[11px] font-semibold text-primary flex items-center gap-1 transition-colors"
                >
                  <FileText className="w-3 h-3" />
                  <span>Inspect evidence (3 citations)</span>
                </button>
                <span className="text-[11px] text-muted-foreground font-mono">
                  Matched historical playbook: Atlas (2025)
                </span>
              </div>
            </div>

            {/* Potential Next Failure */}
            <div className="p-3.5 rounded-xl bg-background/50 border border-border/50 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Forecasted Next Failure Horizon</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Low 30-day retention after beta launch unless onboarding wizard is simplified.
                </p>
              </div>
            </div>
          </div>

          {/* DNA Mini Bars */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground">
              Risk Dimension Scores
            </p>
            <div className="space-y-2.5">
              {[
                { name: 'Adoption Risk', score: 81, color: 'bg-destructive' },
                { name: 'Operational Friction', score: 71, color: 'bg-warning' },
                { name: 'Execution Velocity', score: 63, color: 'bg-warning' },
                { name: 'Technical Stability', score: 42, color: 'bg-emerald-500' },
              ].map((dim) => (
                <div key={dim.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">{dim.name}</span>
                    <span className="font-mono font-semibold text-foreground">{dim.score}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-feed overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', dim.color)}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <Link
                href="/register"
                className="w-full py-2 px-3 rounded-lg bg-surface-feed hover:bg-card border border-border text-xs font-semibold text-foreground flex items-center justify-between transition-colors"
              >
                <span>Run full analysis on your project</span>
                <ChevronRight className="w-3.5 h-3.5 text-primary" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Failure DNA Dimensions */}
      {selectedTab === 'dna' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { title: 'Technical', score: 42, status: 'STABLE', desc: 'Low crash rate, database queries healthy' },
              { title: 'Operational', score: 71, status: 'ELEVATED', desc: 'Support load increasing due to sync issues' },
              { title: 'Adoption', score: 81, status: 'CRITICAL', desc: 'First-week activation falling below target' },
              { title: 'Execution', score: 63, status: 'MODERATE', desc: 'Sprint slip detected on core auth migration' },
            ].map((card) => (
              <div key={card.title} className="p-3.5 rounded-xl bg-surface-feed/70 border border-border/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{card.title}</span>
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded',
                      card.score > 75
                        ? 'bg-destructive/20 text-destructive'
                        : card.score > 50
                        ? 'bg-warning/20 text-warning'
                        : 'bg-emerald-500/20 text-emerald-400'
                    )}
                  >
                    {card.score}/100
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{card.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            * Failure DNA continuously balances positive counter-evidence against failure indicators to avoid manufactured alerts.
          </p>
        </div>
      )}

      {/* Tab Content 3: Truth Engine */}
      {selectedTab === 'truth' && (
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-4 rounded-xl bg-surface-feed/90 border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Tested Team Assumption</span>
            </div>
            <blockquote className="text-sm font-semibold text-foreground italic border-l-2 border-primary pl-3">
              &ldquo;Our high churn during onboarding is caused by enterprise pricing resistance.&rdquo;
            </blockquote>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="p-2 rounded-lg bg-background/80 border border-border text-center">
                <p className="text-[10px] text-muted-foreground">Pricing Complaints</p>
                <p className="font-mono text-base font-bold text-foreground">8%</p>
              </div>
              <div className="p-2 rounded-lg bg-background/80 border border-border text-center">
                <p className="text-[10px] text-muted-foreground">Setup Complaints</p>
                <p className="font-mono text-base font-bold text-destructive">76%</p>
              </div>
              <div className="p-2 rounded-lg bg-background/80 border border-border text-center">
                <p className="text-[10px] text-muted-foreground">Step-2 Abandonment</p>
                <p className="font-mono text-base font-bold text-destructive">43%</p>
              </div>
              <div className="p-2 rounded-lg bg-background/80 border border-border text-center">
                <p className="text-[10px] text-muted-foreground">Activation Drop</p>
                <p className="font-mono text-base font-bold text-warning">37%</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-warning uppercase">Assumption Challenged</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Current evidence strongly refutes pricing as the root driver. Friction is concentrated in manual API token generation during onboarding.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Illustrative Evidence Modal Drawer */}
      {activeEvidenceModal && (
        <div className="p-4 sm:p-5 border-t border-border/80 bg-background/95 backdrop-blur-md animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">Illustrative Evidence Traceability</h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveEvidenceModal(false)}
              className="text-xs text-muted-foreground hover:text-foreground font-mono"
            >
              [Close]
            </button>
          </div>
          <div className="mt-3 space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-surface-feed border border-border space-y-1">
              <div className="flex justify-between text-muted-foreground font-mono text-[10px]">
                <span>Source: Customer Onboarding Survey Q3.csv</span>
                <span>Confidence: 94%</span>
              </div>
              <p className="text-foreground italic">
                &ldquo;Users are dropping off at step 2 of setup when asked to copy webhook secret keys manually.&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
