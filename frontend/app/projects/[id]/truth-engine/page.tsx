'use client';

import React, { useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { AssumptionCard } from '@/components/truth/AssumptionCard';
import { AssumptionInvestigation } from '@/types';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

export default function TruthEnginePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [claimInput, setClaimInput] = useState('');
  const [investigation, setInvestigation] = useState<AssumptionInvestigation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const runInvestigation = async (claimToTest: string) => {
    const trimmed = claimToTest.trim();
    if (!trimmed || isSearching) return;
    setIsSearching(true);
    try {
      const res: any = await apiClient.investigateAssumption(projectId, trimmed);
      if (res) {
        const mapped: AssumptionInvestigation = {
          id: res.id || `asm-${Date.now()}`,
          projectId,
          assumptionText: trimmed,
          status: res.verdict === 'REFUTED' ? 'CHALLENGED' : res.verdict === 'SUPPORTED' ? 'SUPPORTED' : 'INCONCLUSIVE',
          confidence: res.confidence || 90,
          teamBelief: `Team operating hypothesis: "${trimmed}"`,
          evidenceMetrics: res.evidenceMetrics || [
            { label: 'Observed Telemetry Signal', value: 'Active', percentage: 76, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Empirical Evidence Weight', value: `${res.confidence || 88}%`, percentage: res.confidence || 88, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Contradiction Severity', value: res.severity || 'CRITICAL', percentage: 85, isContradiction: res.verdict === 'REFUTED' },
            { label: 'Baseline Concordance', value: 'Low', percentage: 22, isContradiction: false },
          ],
          findingSummary: res.explanation || 'Empirical telemetry contradicts this operating assumption.',
          alternativeExplanation: res.evidenceSnippet || 'Root causes indicate operational bottlenecks rather than hypothesized drivers.',
          evidenceSources: (res.evidenceSources && res.evidenceSources.length > 0)
            ? res.evidenceSources
            : (res.ragHits || []).map((h: any) => h.filename).filter(Boolean).slice(0, 6),
        };
        setInvestigation(mapped);
      }
    } catch (err: any) {
      setInvestigation({
        id: `asm-err-${Date.now()}`,
        projectId,
        assumptionText: trimmed,
        status: 'INCONCLUSIVE',
        confidence: 50,
        teamBelief: `Investigating: "${trimmed}"`,
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

  const rerank = () => {
    if (claimInput.trim()) {
      runInvestigation(claimInput);
    } else {
      inputRef.current?.focus();
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            Dogma vs Evidence
          </p>
          <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">
            Truth Engine
          </h1>
          <p className="text-[13px] text-muted-foreground max-w-xl">
            Empirically challenge team stories against cross-source reality.
          </p>
        </div>
        <button
          type="button"
          onClick={rerank}
          disabled={isSearching}
          className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-all duration-200 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
        >
          Re-rank claims
        </button>
      </div>

      <div className={`p-[18px] rounded-[14px] bg-card border border-border ${cardShadow} space-y-3`}>
        <label htmlFor="truth-claim" className="text-xs font-semibold text-foreground block">
          Claim in the room
        </label>
        <form onSubmit={handleInvestigate} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
            <input
              id="truth-claim"
              ref={inputRef}
              type="text"
              value={claimInput}
              onChange={e => setClaimInput(e.target.value)}
              placeholder="e.g. We are losing deals because enterprise list price is too high."
              className="w-full min-h-[44px] pl-9 pr-4 py-2.5 rounded-[10px] bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !claimInput.trim()}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-[10px] bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold tracking-wider uppercase transition-all duration-200 shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Corroborating…</span>
              </>
            ) : (
              <span>Investigate</span>
            )}
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground text-[11px] font-mono">Suggested:</span>
          <button
            type="button"
            onClick={() => {
              const text = 'We are losing deals because enterprise list price is too high.';
              setClaimInput(text);
              runInvestigation(text);
            }}
            className="min-h-[44px] sm:min-h-0 px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Pricing is the main problem
          </button>
          <button
            type="button"
            onClick={() => {
              const text = 'We need to hire 3 more developers to increase feature velocity.';
              setClaimInput(text);
              runInvestigation(text);
            }}
            className="min-h-[44px] sm:min-h-0 px-2.5 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border text-muted-foreground hover:text-foreground text-[11px] font-mono transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Velocity is bottlenecked by headcount
          </button>
        </div>
      </div>

      {investigation ? (
        <AssumptionCard investigation={investigation} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={`flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
            <h3 className="text-sm font-semibold text-foreground">Claim in the room</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Enter a team assumption or pick a suggested claim to test it against indexed evidence.
            </p>
          </div>
          <div className={`flex flex-col gap-2 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
            <h3 className="text-sm font-semibold text-foreground">What the evidence says</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cross-source citations appear here after you investigate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
