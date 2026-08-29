'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Circle, AlertTriangle, Binary, ArrowRight } from 'lucide-react';

export interface RagPipelineStage {
  key: string;
  label: string;
  status: string;
  detail: string;
  count?: number;
  error?: string | null;
}

interface RagPipelinePanelProps {
  stages: RagPipelineStage[];
  reachable: boolean;
  database?: string;
  projectId: string;
  compact?: boolean;
}

function StageIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />;
  if (status === 'RUNNING') return <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" aria-hidden="true" />;
  if (status === 'FAILED') return <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />;
  if (status === 'BLOCKED') return <Circle className="w-4 h-4 text-muted-foreground/50 shrink-0" aria-hidden="true" />;
  return <Circle className="w-4 h-4 text-border shrink-0" aria-hidden="true" />;
}

export function RagPipelinePanel({
  stages,
  reachable,
  database,
  projectId,
  compact = false,
}: RagPipelinePanelProps) {
  const completed = stages.filter((s) => s.status === 'COMPLETED').length;

  return (
    <section className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Binary className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">RAG Pipeline</h2>
            <p className="text-xs text-muted-foreground">Live backend ingestion and agent state — not a preview animation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="status"
            aria-atomic="true"
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold border ${
              reachable
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {reachable ? 'RAG reachable' : 'RAG unavailable'}
          </span>
          {database && (
            <span className="text-[10px] font-mono text-muted-foreground">DB: {database}</span>
          )}
        </div>
      </div>

      {!reachable ? (
        <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
          RAG unavailable. Start the FastAPI backend on the configured RAG URL before expecting chunks, embeddings, or signals.
        </div>
      ) : (
        <>
          <p className="text-[11px] font-mono text-muted-foreground" role="status" aria-atomic="true">
            {completed} of {stages.length} pipeline stages complete
          </p>
          <div className={`grid grid-cols-1 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'} gap-3`}>
            {stages.map((stage) => (
              <div
                key={stage.key}
                className={`p-3 rounded-xl border ${
                  stage.status === 'COMPLETED'
                    ? 'bg-surface-feed/70 border-emerald-500/30'
                    : stage.status === 'RUNNING'
                      ? 'bg-primary/10 border-primary/50'
                      :                   stage.status === 'FAILED'
                        ? 'bg-rose-500/10 border-rose-500/30'
                        : stage.status === 'BLOCKED'
                          ? 'bg-card/40 border-border/40 opacity-70'
                          : 'bg-card/40 border-border/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StageIcon status={stage.status} />
                  <span className="text-xs font-semibold tracking-tight text-foreground">{stage.label}</span>
                </div>
                <p className="text-[11px] text-muted-foreground pl-6">{stage.detail}</p>
                {typeof stage.count === 'number' && (
                  <p className="text-[11px] font-mono text-foreground pl-6 mt-1">{stage.count}</p>
                )}
                {stage.error && (
                  <p role="alert" className="text-[11px] text-rose-400 pl-6 mt-1">
                    {stage.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!compact && (
        <div className="pt-2 flex justify-end">
          <Link
            href={`/projects/${projectId}/pipeline`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <span>Open full pipeline</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </section>
  );
}
