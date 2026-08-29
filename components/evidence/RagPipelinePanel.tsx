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
  rustfsReachable?: boolean;
  rustfsProvider?: string;
}

function StageIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />;
  if (status === 'RUNNING') return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />;
  if (status === 'FAILED') return <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />;
  if (status === 'BLOCKED') return <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />;
  return <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />;
}

export function RagPipelinePanel({
  stages,
  reachable,
  database,
  projectId,
  compact = false,
  rustfsReachable,
  rustfsProvider,
}: RagPipelinePanelProps) {
  const completed = stages.filter((s) => s.status === 'COMPLETED').length;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Binary className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Pipeline Health</h2>
            <p className="text-xs text-muted-foreground">Live backend ingestion and agent state — not a preview animation</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            role="status"
            aria-atomic="true"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
              reachable
                ? 'border-success/30 bg-surface-feed text-success'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            }`}
          >
            {reachable ? 'RAG reachable' : 'RAG unavailable'}
          </span>
          {database && (
            <span className="font-mono text-[10px] text-muted-foreground">DB: {database}</span>
          )}
          {typeof rustfsReachable === 'boolean' && (
            <span className={`font-mono text-[10px] ${rustfsReachable ? 'text-success' : 'text-destructive'}`}>
              {rustfsProvider || 'storage'}: {rustfsReachable ? 'connected' : 'unreachable'}
            </span>
          )}
        </div>
      </div>

      {!reachable ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          RAG unavailable. Start the FastAPI backend on the configured RAG URL before expecting chunks, embeddings, or signals.
        </div>
      ) : (
        <>
          <p className="font-mono text-[11px] text-muted-foreground" role="status" aria-atomic="true">
            {completed} of {stages.length} pipeline stages complete
          </p>
          <div className={`grid grid-cols-1 gap-3 ${compact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
            {stages.map((stage) => (
              <div
                key={stage.key}
                className={`rounded-xl border p-3 ${
                  stage.status === 'COMPLETED'
                    ? 'border-success/30 bg-surface-feed/70'
                    : stage.status === 'RUNNING'
                      ? 'border-primary/50 bg-primary/10'
                      : stage.status === 'FAILED'
                        ? 'border-destructive/30 bg-destructive/10'
                        : stage.status === 'BLOCKED'
                          ? 'border-border/40 bg-card/40 opacity-70'
                          : 'border-border/40 bg-card/40'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <StageIcon status={stage.status} />
                  <span className="text-xs font-semibold tracking-tight text-foreground">{stage.label}</span>
                </div>
                <p className="pl-6 text-[11px] text-muted-foreground">{stage.detail}</p>
                {typeof stage.count === 'number' && (
                  <p className="mt-1 pl-6 font-mono text-[11px] text-foreground">{stage.count}</p>
                )}
                {stage.error && (
                  <p role="alert" className="mt-1 pl-6 text-[11px] text-destructive">
                    {stage.error}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!compact && (
        <div className="flex justify-end pt-2">
          <Link
            href={`/projects/${projectId}/pipeline`}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            <span>Open full pipeline</span>
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
