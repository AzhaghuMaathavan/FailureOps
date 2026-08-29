'use client';

import React from 'react';
import { GitFork, ShieldCheck } from 'lucide-react';
import { CausalNodeGraph } from '@/components/causal/CausalNodeGraph';

export default function CausalAnalysisPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Causal Graph Engine
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
              7 Interconnected Nodes
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Causal Failure Cascade Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Interactive structural equation graph revealing how upstream operational load propagates to downstream delivery risk.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <GitFork className="w-4 h-4 text-primary" />
          <span>Multi-Source Root Cause Mapping</span>
        </div>
      </div>

      <CausalNodeGraph />
    </div>
  );
}
