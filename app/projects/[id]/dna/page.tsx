'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Dna, ShieldAlert, Sparkles, Layers, Info, Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { FailureDNARadar } from '@/components/dna/FailureDNARadar';
import { DimensionExplainer } from '@/components/dna/DimensionExplainer';
import { FailureDNA, FailureDNADimension } from '@/types';

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
          // Map backend FailureDNAPacket format to UI FailureDNA format
          const overall = res?.overall || {};
          const rawDims = res?.dimensions || [];

          const mappedDimensions: FailureDNADimension[] = rawDims.map((d: any) => ({
            dimension: d.dimension,
            score: d.risk_score || d.score || 0,
            status: d.status || 'NORMAL',
            severity: d.severity || 'LOW',
            keyDriver: d.key_driver || d.keyDriver || '',
            whyExplainer: d.why_explainer || d.whyExplainer || '',
            supportingEvidenceIds: d.evidence_ids || d.supportingEvidenceIds || [],
            recommendedFocus: d.why_explainer ? `Targeted mitigation for ${d.dimension.toLowerCase()} risk drivers.` : 'Maintain regular telemetry monitoring.',
          }));

          const profile: FailureDNA = {
            projectId,
            dominantArchetype: overall.dominant_archetype || res?.dominantArchetype || 'Scope & Velocity Trap',
            overallRisk: overall.risk_score || res?.overallRisk || 78,
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


  if (isLoading) {
    return (
      <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>Calculating 6-axis Failure DNA risk vector from backend evidence...</span>
        </div>
      </div>
    );
  }

  if (error || !dna || !selectedDim) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Failed to load Failure DNA</p>
        <p className="text-xs mt-1 text-rose-400">{error || 'No Failure DNA calculated yet.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Multidimensional Risk Profile
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              Archetype: {dna.dominantArchetype}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Failure DNA Vector
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            Failure DNA describes the multidimensional characteristics of the current failure pattern. It decomposes operational vulnerabilities into 6 correlated axes.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Dna className="w-4 h-4 text-primary" />
          <span>Composite Risk Vector: {dna.overallRisk}%</span>
        </div>
      </div>

      {/* Main Layout: Radar on Left, Deep Explainer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Radar Chart Container */}
        <div className="lg:col-span-6 p-6 rounded-2xl bg-card border border-border/80 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-border">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
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

          <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              Axis normalization across historical cases
            </span>
            <span className="text-primary font-bold">Selected: {selectedDim.dimension}</span>
          </div>
        </div>

        {/* Right Explainer Component (The "WHY?") */}
        <div className="lg:col-span-6">
          <DimensionExplainer dimension={selectedDim} />
        </div>
      </div>
    </div>
  );
}

