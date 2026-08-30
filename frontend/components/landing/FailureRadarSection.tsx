'use client';

import React from 'react';
import Link from 'next/link';
import {
  Radar,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  GitFork,
  Lightbulb,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { btnPrimary } from './chrome';

export const FailureRadarSection: React.FC = () => {
  return (
    <section className="w-full py-16 sm:py-24 bg-card/40 border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Visual Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-border/60 bg-surface-feed flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Radar className="w-3.5 h-3.5 text-primary" />
                  <span>Failure Radar Executive Forecast (Illustrative)</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-warning/15 text-warning font-mono text-[10px] font-bold">
                  ATTENTION REQUIRED
                </span>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-feed/70 border border-border/70">
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                      Predicted Next Failure Milestone
                    </p>
                    <p className="text-base sm:text-lg font-bold text-foreground mt-0.5">
                      Low Repeat Usage & 30-Day Churn Spike
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase">Prediction Confidence</p>
                    <p className="font-mono text-xl font-black text-warning">82%</p>
                  </div>
                </div>

                {/* Why explanation / causal reasoning chain */}
                <div className="space-y-3">
                  <p className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <GitFork className="w-3.5 h-3.5 text-primary" />
                    <span>Why did the Radar reach this conclusion?</span>
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-xl bg-surface-feed/50 border border-border/70 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 text-[10px] mt-0.5">
                        1
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          Activation Decline Detected in Customer Survey
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          76% of onboarding complaints cite manual token exchange, driving a -37% drop in 7-day active sessions.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-feed/50 border border-border/70 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 text-[10px] mt-0.5">
                        2
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          CI/CD Defect Build Escalation
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Build failure rate rose from 8% to 18%, delaying the bug fix deployment to staging by 6 business days.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-feed/50 border border-border/70 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono font-bold shrink-0 text-[10px] mt-0.5">
                        3
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">
                          87% Trajectory Match to Historical Project Atlas
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          Atlas experienced identical telemetry in month 2, resulting in failed public launch before playbook intervention.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                  <span className="text-foreground font-semibold flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-primary" />
                    <span>Recommended Playbook: 1-Click OAuth Onboarding</span>
                  </span>
                  <span className="font-mono text-primary font-bold">Priority #1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Text Description */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
              <Radar className="w-3.5 h-3.5" />
              <span>Predictive Early Warning</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Always Know What Comes Next
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Failure Radar combines real-time evidence signals, multidimensional Failure DNA, and historical trajectory graphs to forecast the exact point of upcoming failure before it manifests.
            </p>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every forecast is fully explainable — linking directly to verified documents, survey snippets, code commits, and precedent cases.
            </p>

            <div className="pt-2">
              <Link href="/register" className={btnPrimary('gap-2')}>
                <span>Build Radar on Your Project</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
