'use client';

import React, { useState } from 'react';
import { mockCausalNodes } from '@/data/mockCausalGraph';
import { CausalNode } from '@/types';
import { ArrowDown, AlertTriangle, CheckCircle2, ShieldCheck, GitFork } from 'lucide-react';
import { RiskBadge } from '@/components/common/RiskBadge';

export const CausalNodeGraph: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<CausalNode>(mockCausalNodes[2]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Interactive Visual Causal Cascade Diagram */}
      <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Dynamic Causal Cascade Graph
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">Click node to inspect telemetry</span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          {mockCausalNodes.map((node, index) => {
            const isSelected = selectedNode.id === node.id;
            const isLast = index === mockCausalNodes.length - 1;

            return (
              <React.Fragment key={node.id}>
                <div
                  onClick={() => setSelectedNode(node)}
                  className={`w-full p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-primary/15 border-primary shadow-[0_0_15px_-3px_rgba(255,122,0,0.35)] ring-1 ring-primary/50'
                      : 'bg-surface-feed/70 border-border/80 hover:border-primary/40 hover:bg-card-hover'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-[11px] font-mono font-bold text-muted-foreground">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground tracking-tight">{node.label}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{node.category} axis</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RiskBadge level={node.severity} />
                  </div>
                </div>

                {!isLast && (
                  <div className="flex flex-col items-center my-0.5 text-primary/70">
                    <div className="w-0.5 h-3 bg-primary/40" />
                    <ArrowDown className="w-3.5 h-3.5 -mt-1 text-primary animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Node Inspection Panel */}
      <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-md sticky top-20">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Node Telemetry Inspector
          </span>
          <RiskBadge level={selectedNode.severity} />
        </div>

        <h3 className="text-base font-bold text-foreground">{selectedNode.label}</h3>
        <span className="text-xs font-mono text-primary font-semibold mt-0.5 block uppercase">
          Category: {selectedNode.category}
        </span>

        {/* Evidence Snippet */}
        <div className="mt-4 p-4 rounded-xl bg-surface-feed/80 border border-border/80">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
            Empirical Telemetry Citation
          </span>
          <p className="text-xs text-foreground font-medium leading-relaxed italic">
            &ldquo;{selectedNode.evidenceSnippet}&rdquo;
          </p>
        </div>

        {/* Verification Confidence */}
        <div className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/60">
            <span className="text-muted-foreground">Causal Link Confidence:</span>
            <span className="font-mono font-bold text-emerald-400">{selectedNode.confidence}% Validated</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/60">
            <span className="text-muted-foreground">Related Signal Vectors:</span>
            <span className="font-mono font-bold text-primary">{selectedNode.relatedSignals.join(', ')}</span>
          </div>
        </div>

        {/* Historical Insight */}
        <div className="mt-5 p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-200">
          <span className="font-semibold block mb-0.5">Historical Precedent:</span>
          <p className="text-[11px] leading-relaxed text-purple-300">
            When operational drag exceeds 3 days per PR, downstream release delays occur in 89% of observed product cases (cf. Project Nova).
          </p>
        </div>
      </div>
    </div>
  );
};
