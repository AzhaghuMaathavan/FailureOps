'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, GitFork } from 'lucide-react';
import { RiskBadge } from '@/components/common/RiskBadge';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  ActionEmpty,
  ActionError,
  ActionLoading,
  InsightCard,
  KpiTile,
  asPercent,
  cardShadow,
  insightGridClass,
  kpiGridClass,
} from '@/components/causal/ActionChrome';
import { EvidenceModal } from '@/components/evidence/EvidenceModal';

interface CausalNodeGraphProps {
  projectId?: string;
  pinNonce?: number;
}

const SEVERITY_RANK: Record<string, number> = {
  CRITICAL: 5,
  HIGH: 4,
  AT_RISK: 4,
  WARNING: 2,
  MEDIUM: 2,
  LOW: 1,
  HEALTHY: 0,
  NEUTRAL: 1,
};

export const CausalNodeGraph: React.FC<CausalNodeGraphProps> = ({
  projectId = 'aurora',
  pinNonce = 0,
}) => {
  const [chainData, setChainData] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    apiClient
      .getFailureChain(projectId)
      .then((res) => {
        if (!mounted) return;
        setChainData(res);
        const rawNodes = res?.nodes || [];
        const rawEdges = res?.edges || [];
        setNodes(rawNodes);
        setEdges(rawEdges);
        if (rawNodes.length > 0) setSelectedNode(rawNodes[0]);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to load causal failure chain.');
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!pinNonce || nodes.length === 0) return;
    const ranked = [...nodes].sort(
      (a, b) => (SEVERITY_RANK[String(b.severity).toUpperCase()] || 0) - (SEVERITY_RANK[String(a.severity).toUpperCase()] || 0),
    );
    setSelectedNode(ranked[0]);
  }, [pinNonce, nodes]);

  if (isLoading) {
    return <ActionLoading label="Loading causal failure chain..." />;
  }

  if (error) {
    return <ActionError title="Unable to load causal failure chain." message={error} />;
  }

  if (nodes.length === 0 || !selectedNode) {
    return (
      <ActionEmpty
        icon={GitFork}
        title="No sufficiently supported failure chain detected."
        description="Upload project documents and run analysis to synthesize empirical causal DAG chains from grounded evidence citations."
        actionLabel="Run Project Analysis"
        actionHref={`/projects/${projectId}/analysis`}
      />
    );
  }

  const criticalPath = nodes.filter((n) => {
    const s = String(n.severity || '').toUpperCase();
    return s === 'CRITICAL' || s === 'HIGH';
  }).length;
  const confounders = nodes.filter((n) => {
    const t = String(n.type || '').toUpperCase();
    const s = String(n.severity || '').toUpperCase();
    return t.includes('CONFOUND') || s === 'NEUTRAL' || s === 'MEDIUM';
  }).length;
  const rootCluster = nodes.map((n) => n.label).filter(Boolean).join(' → ');
  const bottleneck =
    [...nodes].sort(
      (a, b) => (SEVERITY_RANK[String(b.severity).toUpperCase()] || 0) - (SEVERITY_RANK[String(a.severity).toUpperCase()] || 0),
    )[0];
  const prediction = chainData?.prediction;

  return (
    <div className="space-y-5">
      <div className={kpiGridClass}>
        <KpiTile label="Nodes" value={nodes.length} caption="Failure graph" tone="info" />
        <KpiTile label="Critical path" value={criticalPath} caption="High leverage" tone="destructive" />
        <KpiTile label="Confounders" value={confounders} caption="Controlled" tone="warning" />
        <KpiTile
          label="Lift if cut"
          value={prediction?.risk_score != null ? `${prediction.risk_score}%` : '—'}
          caption="At-stake risk"
          tone="success"
        />
      </div>

      <div className={insightGridClass}>
        <InsightCard title="Root cluster">
          {rootCluster || 'Insufficient chain labels to describe the cascade.'}
        </InsightCard>
        <InsightCard title="Leverage point">
          {chainData?.explanation ||
            (bottleneck
              ? `Protect ${bottleneck.label} before merge. Historical twins recovered when this bottleneck was gated.`
              : 'Insufficient evidence for a leverage recommendation.')}
        </InsightCard>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-4">
        <div className={cn('lg:col-span-7 rounded-[14px] border border-border bg-card p-4 sm:p-[18px]', cardShadow)}>
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <GitFork className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Grounded Causal DAG</h3>
            </div>
            <span className="font-mono text-[11px] text-muted-foreground">
              {nodes.length} Nodes • {edges.length} Causal Links
            </span>
          </div>

          <div className="flex flex-col items-center space-y-2" role="list">
            {nodes.map((node, index) => {
              const isSelected = selectedNode.id === node.id;
              const isLast = index === nodes.length - 1;
              const edge = edges.find(
                (e: any) =>
                  e.source === node.id ||
                  (index > 0 && e.source === nodes[index - 1]?.id && e.target === node.id),
              );

              return (
                <React.Fragment key={node.id}>
                  <button
                    type="button"
                    role="listitem"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedNode(node)}
                    className={cn(
                      'flex w-full min-h-11 cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left transition-colors duration-200 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected
                        ? 'border-primary bg-primary-muted ring-1 ring-primary'
                        : 'border-border bg-surface-feed/70 hover:border-primary/40 hover:bg-card-hover',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-[11px] font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-muted-foreground">
                            {node.type}
                          </span>
                          <h4 className="text-xs font-bold tracking-tight text-foreground">{node.label}</h4>
                        </div>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase text-muted-foreground">
                          Category: {node.category}
                        </span>
                      </div>
                    </div>
                    <RiskBadge level={node.severity} />
                  </button>

                  {!isLast && (
                    <div className="my-0.5 flex flex-col items-center text-primary/70" aria-hidden="true">
                      <span className="mb-0.5 rounded border border-border/60 bg-surface-feed px-2 py-0.5 font-mono text-[9px] uppercase text-primary">
                        {edge?.relationship_type || 'LEADS_TO'}
                      </span>
                      <div className="h-2 w-0.5 bg-primary/40" />
                      <ArrowDown className="h-3.5 w-3.5 -mt-0.5 text-primary motion-reduce:animate-none" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div
          className={cn(
            'lg:col-span-5 space-y-4 rounded-[14px] border border-border bg-card p-4 sm:p-[18px] lg:sticky lg:top-20',
            cardShadow,
          )}
        >
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Node Telemetry Inspector
            </span>
            <RiskBadge level={selectedNode.severity} />
          </div>

          <div>
            <span className="block font-mono text-[10px] font-bold uppercase text-primary">
              Type: {selectedNode.type}
            </span>
            <h3 className="mt-0.5 text-base font-bold text-foreground">{selectedNode.label}</h3>
            <span className="mt-0.5 block font-mono text-xs uppercase text-muted-foreground">
              Category: {selectedNode.category}
            </span>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-surface-feed/80 p-4">
            <span className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Supporting Evidence References ({selectedNode.evidence_ids?.length || 0})
            </span>
            {selectedNode.evidence_ids && selectedNode.evidence_ids.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedNode.evidence_ids.map((evId: string) => (
                  <button
                    key={evId}
                    type="button"
                    onClick={() => setActiveEvidenceId(evId)}
                    className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20 hover:border-primary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title={`Inspect evidence citation #${evId}`}
                  >
                    <span>#{evId}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Corroborated by project evidence citations and active signals.
              </p>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2.5">
              <span className="text-muted-foreground">Causal Link Confidence:</span>
              <span className="font-mono font-bold text-success">{asPercent(selectedNode.confidence)}%</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-card/60 p-2.5">
              <span className="text-muted-foreground">Node Identifier:</span>
              <span className="font-mono font-bold text-primary">{selectedNode.id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grounded Citation Modal */}
      <EvidenceModal
        evidenceId={activeEvidenceId}
        projectId={projectId}
        onClose={() => setActiveEvidenceId(null)}
      />
    </div>
  );
};
