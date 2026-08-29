'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Scale, Sparkles, Search, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { investigateAssumption, mockAssumptions } from '@/data/mockAssumptions';
import { AssumptionCard } from '@/components/truth/AssumptionCard';
import { AssumptionInvestigation } from '@/types';

export default function TruthEnginePage() {
  const params = useParams();
  const [claimInput, setClaimInput] = useState('Our adoption problem is mainly caused by pricing.');
  const [investigation, setInvestigation] = useState<AssumptionInvestigation>(mockAssumptions.pricing);
  const [isSearching, setIsSearching] = useState(false);

  const handleInvestigate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSearching(true);
    setTimeout(() => {
      const res = investigateAssumption(claimInput);
      setInvestigation(res);
      setIsSearching(false);
    }, 600);
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
              setClaimInput('Our adoption problem is mainly caused by pricing.');
              setInvestigation(mockAssumptions.pricing);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors"
          >
            Pricing is the main problem
          </button>
          <button
            onClick={() => {
              setClaimInput('We need to hire 3 more developers to increase feature velocity.');
              setInvestigation(mockAssumptions.velocity);
            }}
            className="px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border/70 text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors"
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
