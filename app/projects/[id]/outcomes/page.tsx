'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle2, TrendingUp, Sparkles, Database, ArrowRight, ShieldCheck, FileCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { SaveMemoryModal } from '@/components/memory/SaveMemoryModal';

export default function OutcomeVerificationPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [outcomeData, setOutcomeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOutcomes() {
      try {
        setLoading(true);
        const res = await apiClient.getOutcomes(projectId);
        if (res?.outcomes && res.outcomes.length > 0) {
          setOutcomeData(res);
        }
      } catch {
        // Fallback default
      } finally {
        setLoading(false);
      }
    }
    loadOutcomes();
  }, [projectId]);

  const outcomes = outcomeData?.outcomes || [];
  const primaryOutcome = outcomes[0];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Empirical Verification
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Deterministic Polarity Checked
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Outcome Verification & Metric Lift
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Compare pre-intervention baseline telemetry against post-intervention experiment results with epistemic attribution safety.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!primaryOutcome}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(255,122,0,0.4)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Save to Org Memory</span>
        </button>
      </div>

      {/* Dynamic Metric Comparison Cards */}
      {primaryOutcome?.metric_deltas ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-card border border-border flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-primary uppercase font-bold">Experiment Focus:</span>
              <h3 className="text-sm font-bold text-foreground mt-0.5">{primaryOutcome.intervention_title}</h3>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Status: {primaryOutcome.status}
              </span>
              <span className="block text-[11px] font-mono text-muted-foreground mt-1">
                Attribution: {primaryOutcome.attribution_confidence} Confidence
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {primaryOutcome.metric_deltas.map((delta: any) => (
              <div key={delta.metric_name} className="p-6 rounded-2xl bg-card border border-border/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-mono uppercase text-muted-foreground font-bold">{delta.metric_name.replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${delta.is_improved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {delta.is_improved ? 'IMPROVED' : 'REGRESSED'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 my-4 text-center">
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground block">BASELINE</span>
                      <span className="text-2xl font-bold font-mono text-rose-400">{delta.baseline_value}{delta.unit === 'percent' ? '%' : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-muted-foreground block">MEASURED</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400">{delta.measured_after_value}{delta.unit === 'percent' ? '%' : ''}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-primary block font-bold">DELTA</span>
                      <span className="text-2xl font-bold font-mono text-primary">{delta.percent_improvement > 0 ? '+' : ''}{delta.percent_improvement}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-mono text-muted-foreground">
                  Polarity: {delta.polarity === 'POSITIVE_WHEN_DECREASING' ? 'Lower is Better (Mitigated)' : 'Higher is Better (Growth)'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-2">
          <FileCheck className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <h3 className="text-base font-bold text-foreground">No Verified Outcomes Recorded Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Run an intervention experiment to verify post-mitigation telemetry against baseline metrics with attribution confidence.
          </p>
        </div>
      )}


      {/* Distinction: Observed Outcome vs AI Interpretation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-foreground">
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span>Observed Empirical Delta</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            {primaryOutcome?.summary || 'No empirical outcome recorded yet for this project.'}
          </p>

        </div>

        <div className="p-6 rounded-2xl bg-primary/5 border border-primary/30 shadow-md space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="w-4 h-4" />
            <span>Epistemic Attribution Safety</span>
          </div>
          <p className="text-xs text-foreground/90 leading-relaxed font-medium">
            {primaryOutcome?.epistemic_safety_note || 'No attribution note is available until a verified outcome is recorded.'} {primaryOutcome?.attribution_reasoning}
          </p>
        </div>
      </div>

      {/* Memory Commit Banner */}
      <div className="p-6 rounded-2xl bg-surface-feed border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-foreground">Commit Validated Knowledge to Institutional Memory</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store this verified pattern and recovery outcome into organizational memory for future team discovery.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          disabled={!primaryOutcome}
          className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold uppercase tracking-wide transition-all shadow-sm shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Commit Learning Now
        </button>
      </div>

      <SaveMemoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} outcome={primaryOutcome} />
    </div>
  );
}

