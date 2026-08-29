'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Dna, ShieldAlert, Sparkles, Layers, Info } from 'lucide-react';
import { getFailureDNA } from '@/data/mockFailureDNA';
import { FailureDNARadar } from '@/components/dna/FailureDNARadar';
import { DimensionExplainer } from '@/components/dna/DimensionExplainer';
import { FailureDNADimension } from '@/types';

export default function FailureDNAPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const dna = getFailureDNA(projectId);

  const [selectedDim, setSelectedDim] = useState<FailureDNADimension>(
    dna.dimensions.find(d => d.dimension === 'Adoption') || dna.dimensions[0]
  );

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
              Axis normalization across 1,240 historical cases
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
