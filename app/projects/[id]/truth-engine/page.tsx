'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Scale, Sparkles, Search, ArrowRight, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { AssumptionCard } from '@/components/truth/AssumptionCard';
import { AssumptionInvestigation } from '@/types';

const defaultPricingInvestigation: AssumptionInvestigation = {
  id: 'asm-pricing',
  projectId: 'aurora',
  assumptionText: 'Our adoption problem is mainly caused by pricing.',
  status: 'CHALLENGED',
  confidence: 94,
  teamBelief: 'Executive leadership assumes trial users abandon because subscription tiers are too expensive.',
  evidenceMetrics: [
    { label: 'Technical Setup Drop-off (Step 4)', value: '68%', percentage: 68, isContradiction: true },
    { label: 'Trial Abandonment at Compliance', value: '76%', percentage: 76, isContradiction: true },
    { label: 'Pricing Page Visitors', value: '14%', percentage: 14, isContradiction: false },
    { label: 'Pricing Feedback Complaints', value: '4%', percentage: 4, isContradiction: false },
  ],
  findingSummary: '76% of lost trials abandon during account provisioning (Step 4). Less than 14% of trial accounts ever visited the subscription pricing page.',
  alternativeExplanation: 'The true root cause is friction in the 7-step mandatory compliance setup, not pricing elasticity.',
  evidenceSources: ['customer_feedback.csv', 'product_metrics.csv', 'incident_reports.pdf'],
};

export default function TruthEnginePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [claimInput, setClaimInput] = useState('Our adoption problem is mainly caused by pricing.');
  const [investigation, setInvestigation] = useState<AssumptionInvestigation>(defaultPricingInvestigation);
  const [isSearching, setIsSearching] = useState(false);

  const runInvestigation = async (claimToTest: string) => {
    setIsSearching(true);
    try {
      const res: any = await apiClient.investigateAssumption(projectId, claimToTest);
      if (res) {
        const mapped: AssumptionInvestigation = {
          id: res.id || `asm-${Date.now()}`,
          projectId,
          assumptionText: claimToTest,
          status: res.verdict === 'REFUTED' ? 'CHALLENGED' : res.verdict === 'SUPPORTED' ? 'SUPPORTED' : 'INCONCLUSIVE',
          confidence: res.confidence || 90,
          teamBelief: `Team operating hypothesis: "${claimToTest}"`,
          evidenceMetrics: res.evidenceMetrics || [
            { label: 'Observed Telemetry Signal', value: 'Active', percentage: 76, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Empirical Evidence Weight', value: `${res.confidence || 88}%`, percentage: res.confidence || 88, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Contradiction Severity', value: res.severity || 'CRITICAL', percentage: 85, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Baseline Concordance', value: 'Low', percentage: 22, isContradiction: false },
          ],
          findingSummary: res.explanation || 'Empirical telemetry contradicts this operating assumption.',
          alternativeExplanation: res.evidenceSnippet || 'Root causes indicate operational bottlenecks rather than hypothesized drivers.',
          evidenceSources: ['customer_feedback.csv', 'product_metrics.csv', 'incident_reports.pdf'],
        };
        setInvestigation(mapped);
      }
    } catch (err: any) {
      setInvestigation({
        id: `asm-err-${Date.now()}`,
        projectId,
        assumptionText: claimToTest,
        status: 'INCONCLUSIVE',
        confidence: 50,
        teamBelief: `Investigating: "${claimToTest}"`,
        evidenceMetrics: [
          { label: 'Telemetry Records', value: '0 Verified', percentage: 10, isContradiction: false },
        ],
        findingSummary: err?.message || 'Unable to substantiate or refute claim against current project evidence.',
        alternativeExplanation: 'Ingest additional telemetry documents into project knowledge base to substantiate.',
        evidenceSources: ['project_telemetry'],
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvestigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runInvestigation(claimInput);
  };



  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Epistemic Verification Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Hero Capability
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Truth Engine: Challenge an Assumption
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test internal team dogma, executive assumptions, or consensus beliefs against cross-source empirical citations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Scale className="w-4 h-4 text-primary" />
          <span>Bayesian Contradiction Detector</span>
        </div>
      </div>

      {/* Interactive Input Form */}
      <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-lg space-y-4">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
          What does your team currently believe is causing the problem?
        </label>

        <form onSubmit={handleInvestigate} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={claimInput}
              onChange={e => setClaimInput(e.target.value)}
              placeholder="e.g. Our adoption problem is mainly caused by pricing."
              className="w-full px-4 py-3 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_20px_-4px_rgba(255,122,0,0.5)] flex items-center justify-center gap-2 shrink-0"
          >
            {isSearching ? (
              <span>Corroborating Telemetry...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Investigate Claim</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-muted-foreground text-[11px] font-mono">Suggested Claims:</span>
          <button
            onClick={() => {
              const text = 'Our adoption problem is mainly caused by pricing.';
              setClaimInput(text);
              runInvestigation(text);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors cursor-pointer"
          >
            Pricing is the main problem
          </button>

          <button
            onClick={() => {
              const text = 'We need to hire 3 more developers to increase feature velocity.';
              setClaimInput(text);
              runInvestigation(text);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors cursor-pointer"
          >
            Velocity is bottlenecked by headcount
          </button>

        </div>
      </div>

      {/* Investigation Results Card */}
      <AssumptionCard investigation={investigation} />
    </div>
  );
}
