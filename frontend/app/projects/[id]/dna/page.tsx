'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Dna, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { FailureDNARadar } from '@/components/dna/FailureDNARadar';
import { DimensionExplainer } from '@/components/dna/DimensionExplainer';
import { FailureDNA, FailureDNADimension } from '@/types';

const cardShadow = 'shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)]';

const DIMENSION_VALUE_CLASS: Record<string, string> = {
  Technical: 'text-info',
  Operational: 'text-warning',
  Adoption: 'text-destructive',
  Execution: 'text-warning',
  Customer: 'text-magic',
  Financial: 'text-primary',
};

function scoreTone(score: number) {
  if (score >= 80) return 'text-destructive';
  if (score >= 60) return 'text-warning';
  return 'text-info';
}

export default function FailureDNAPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [dna, setDna] = useState<FailureDNA | null>(null);
  const [selectedDim, setSelectedDim] = useState<FailureDNADimension | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    apiClient.getFailureDNA(projectId)
      .then(res => {
        if (mounted) {
          const overall = res?.overall || {};
          const rawDims = res?.dimensions || [];

          const mappedDimensions: FailureDNADimension[] = rawDims.map((d: any) => ({
            dimension: d.dimension,
            score: d.risk_score ?? d.score ?? 0,
            severity: (d.severity || (d.risk_score > 70 ? 'CRITICAL' : d.risk_score > 40 ? 'HIGH' : 'NORMAL')) as any,
            primaryDrivers: Array.isArray(d.primary_drivers) ? d.primary_drivers : d.key_driver ? [d.key_driver] : [],
            evidenceConfidence: Math.round((typeof d.confidence === 'number' ? d.confidence : 0) * ((typeof d.confidence === 'number' && d.confidence <= 1) ? 100 : 1)),
            historicalCorrelation: d.historical_correlation || 'No historical correlation recorded.',
            whyExplanation: d.why_explainer || d.whyExplanation || `No engine rationale was returned for the ${d.dimension} dimension.`,
          }));

          const profile: FailureDNA = {
            projectId,
            dominantArchetype: overall.dominant_archetype || res?.dominantArchetype || 'Unknown',
            overallRisk: overall.risk_score ?? res?.overallRisk ?? 0,
            dimensions: mappedDimensions,
            generatedAt: res?.generated_at || new Date().toISOString().slice(0, 10),
          };

          setDna(profile);
          if (mappedDimensions.length > 0) {
            setSelectedDim(mappedDimensions.find(d => d.dimension === 'Adoption') || mappedDimensions[0]);
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load Failure DNA');
          setIsLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [projectId]);

  const scrollToExplainer = () => {
    document.getElementById('dimension-explainer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="space-y-1.5 min-w-0">
        <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
          Archetype Fingerprint
        </p>
        <h1 className="text-[28px] font-extrabold text-foreground tracking-tight">
          Failure DNA
        </h1>
        <p className="text-[13px] text-muted-foreground max-w-xl">
          Technical, Operational, Adoption, Execution, Customer — scored from corroborating evidence.
        </p>
      </div>
      <button
        type="button"
        onClick={scrollToExplainer}
        disabled={!selectedDim}
        className="inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-[10px] bg-surface-feed hover:bg-card border border-border text-xs font-bold text-foreground transition-all duration-200 cursor-pointer disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
      >
        Explain dimension
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-5">
        {header}
        <div className={`p-12 rounded-xl bg-card border border-border flex items-center justify-center ${cardShadow}`}>
          <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
            <Loader2 className="w-5 h-5 text-primary animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <span>Calculating 6-axis Failure DNA risk vector from backend evidence...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-5">
        {header}
        <div role="alert" className="p-8 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <p className="font-bold">Failed to load Failure DNA</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!dna || dna.dimensions.length === 0 || !selectedDim) {
    return (
      <div className="space-y-5">
        {header}
        <div className={`p-12 rounded-xl bg-card border border-border text-center space-y-3 ${cardShadow}`}>
          <Dna className="w-8 h-8 text-muted-foreground mx-auto opacity-60" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">Failure DNA Not Available Yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload project documents and complete analysis to synthesize a 6-axis Failure DNA risk decomposition.
          </p>
        </div>
      </div>
    );
  }

  const avgConfidence = Math.round(
    dna.dimensions.reduce((sum, d) => sum + (d.evidenceConfidence || 0), 0) / Math.max(dna.dimensions.length, 1)
  );
  const generatedLabel = dna.generatedAt
    ? (dna.generatedAt.slice(0, 10) === new Date().toISOString().slice(0, 10) ? 'Today' : dna.generatedAt.slice(0, 10))
    : 'Live packet';
  const pressureHint = dna.overallRisk >= 70 ? 'High pressure' : dna.overallRisk >= 40 ? 'Elevated' : 'Contained';
  const dominantDim = dna.dimensions.find(d => d.dimension === dna.dominantArchetype) || selectedDim;

  return (
    <div className="space-y-5">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Overall</p>
          <p className="font-mono text-[26px] font-bold leading-none text-destructive">{dna.overallRisk}</p>
          <p className="text-[11px] text-muted-foreground">{pressureHint}</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Dominant</p>
          <p className="font-mono text-[26px] font-bold leading-none text-magic truncate">{dna.dominantArchetype}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {dominantDim?.primaryDrivers?.[0] || 'Dominant archetype'}
          </p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Confidence</p>
          <p className="font-mono text-[26px] font-bold leading-none text-success">{avgConfidence}%</p>
          <p className="text-[11px] text-muted-foreground">{dna.dimensions.length} sources</p>
        </div>
        <div className={`flex flex-col gap-1.5 p-4 rounded-xl bg-card border border-border ${cardShadow}`}>
          <p className="font-mono text-[10px] font-medium text-muted-foreground">Generated</p>
          <p className="font-mono text-[26px] font-bold leading-none text-info">{generatedLabel}</p>
          <p className="text-[11px] text-muted-foreground">Live packet</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {dna.dimensions.map(dim => {
          const selected = selectedDim.dimension === dim.dimension;
          return (
            <button
              key={dim.dimension}
              type="button"
              onClick={() => setSelectedDim(dim)}
              className={`text-left flex flex-col gap-1.5 p-4 min-h-[44px] rounded-xl bg-card border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${cardShadow} ${
                selected ? 'border-primary ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
              }`}
            >
              <p className="font-mono text-[10px] font-medium text-muted-foreground">{dim.dimension}</p>
              <p className={`font-mono text-[26px] font-bold leading-none ${DIMENSION_VALUE_CLASS[dim.dimension] || scoreTone(dim.score)}`}>
                {dim.score}
              </p>
              <p className="text-[11px] text-muted-foreground">risk score</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className={`lg:col-span-6 p-[18px] rounded-[14px] bg-card border border-border ${cardShadow}`}>
          <div className="flex items-center justify-between pb-3 mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-foreground">
              6-Axis Risk Topology
            </span>
            <span className="text-xs font-mono text-muted-foreground">Click axis to inspect</span>
          </div>
          <FailureDNARadar
            dimensions={dna.dimensions}
            selectedDimension={selectedDim.dimension}
            onSelectDimension={dim => setSelectedDim(dim)}
          />
        </div>
        <div className="lg:col-span-6">
          <DimensionExplainer dimension={selectedDim} />
        </div>
      </div>
    </div>
  );
}
