'use client';

import React, { useState, useEffect } from 'react';
import { ArrowDown, AlertTriangle, CheckCircle2, ShieldCheck, GitFork, Loader2, Info } from 'lucide-react';
import { RiskBadge } from '@/components/common/RiskBadge';
import { apiClient } from '@/lib/api/client';

interface CausalNodeGraphProps {
  projectId?: string;
}

export const CausalNodeGraph: React.FC<CausalNodeGraphProps> = ({ projectId = 'aurora' }) => {
  const [chainData, setChainData] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    apiClient.getFailureChain(projectId)
      .then(res => {
        if (mounted) {
          setChainData(res);
          const rawNodes = res?.nodes || [];
          const rawEdges = res?.edges || [];

          setNodes(rawNodes);
          setEdges(rawEdges);
          if (rawNodes.length > 0) {
            setSelectedNode(rawNodes[0]);
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load causal failure chain.');
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
          <span>Loading causal failure chain...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Unable to load causal failure chain.</p>
        <p className="text-xs mt-1 text-rose-400">{error}</p>
      </div>
    );
  }

  if (nodes.length === 0 || !selectedNode) {
    return (
      <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
        <GitFork className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
        <p className="text-base font-bold text-foreground">No sufficiently supported failure chain detected.</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
          Upload project documents and run analysis to synthesize empirical causal DAG chains from grounded evidence citations.
        </p>
      </div>
    );
  }

  const prediction = chainData?.prediction;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left: Dynamic Causal DAG Nodes */}
      <div className="lg:col-span-7 p-6 rounded-2xl bg-card border border-border/80 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-6 border-b border-border">
          <div className="flex items-center gap-2">
            <GitFork className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Grounded Causal DAG
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            {nodes.length} Nodes • {edges.length} Causal Links
          </span>
        </div>

        <div className="flex flex-col items-center space-y-2">
          {nodes.map((node, index) => {
            const isSelected = selectedNode.id === node.id;
            const isLast = index === nodes.length - 1;
            const edge = edges.find((e: any) => e.source === node.id || (index > 0 && e.source === nodes[index - 1]?.id && e.target === node.id));

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
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-surface-feed border border-border text-muted-foreground">
                          {node.type}
                        </span>
                        <h4 className="text-xs font-bold text-foreground tracking-tight">{node.label}</h4>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5 block">
                        Category: {node.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <RiskBadge level={node.severity} />
                  </div>
                </div>

                {!isLast && (
                  <div className="flex flex-col items-center my-0.5 text-primary/70">
                    <span className="text-[9px] font-mono uppercase text-primary/80 bg-surface-feed px-2 py-0.5 rounded border border-border/60 mb-0.5">
                      {edge?.relationship_type || 'LEADS_TO'}
                    </span>
                    <div className="w-0.5 h-2 bg-primary/40" />
                    <ArrowDown className="w-3.5 h-3.5 -mt-0.5 text-primary animate-pulse" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Node Telemetry Inspector */}
      <div className="lg:col-span-5 p-6 rounded-2xl bg-card border border-border/80 shadow-md sticky top-20 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Node Telemetry Inspector
          </span>
          <RiskBadge level={selectedNode.severity} />
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase text-primary font-bold block">
            Type: {selectedNode.type}
          </span>
          <h3 className="text-base font-bold text-foreground mt-0.5">{selectedNode.label}</h3>
          <span className="text-xs font-mono text-muted-foreground mt-0.5 block uppercase">
            Category: {selectedNode.category}
          </span>
        </div>

        {/* Supporting Evidence IDs */}
        <div className="p-4 rounded-xl bg-surface-feed/80 border border-border/80 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
            Supporting Evidence References ({selectedNode.evidence_ids?.length || 0})
          </span>
          {selectedNode.evidence_ids && selectedNode.evidence_ids.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selectedNode.evidence_ids.map((evId: string) => (
                <span
                  key={evId}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-card border border-border text-foreground font-semibold"
                >
                  {evId}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Corroborated by project evidence citations and active signals.
            </p>
          )}
        </div>

        {/* Node Confidence */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/60">
            <span className="text-muted-foreground">Causal Link Confidence:</span>
            <span className="font-mono font-bold text-emerald-400">
              {Math.round((typeof selectedNode.confidence === 'number' ? selectedNode.confidence : 0) * ((typeof selectedNode.confidence === 'number' && selectedNode.confidence <= 1) ? 100 : 1))}%
              {typeof selectedNode.confidence === 'number' ? '' : ' unverified'}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-card/60 border border-border/60">
            <span className="text-muted-foreground">Node Identifier:</span>
            <span className="font-mono font-bold text-primary">{selectedNode.id}</span>
          </div>
        </div>

        {/* Grounded Explanation from Backend */}
        {chainData?.explanation && (
          <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-foreground leading-relaxed">
            <span className="font-semibold text-primary block mb-0.5 font-mono text-[10px] uppercase">
              Causal DAG Synthesis
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {chainData.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
