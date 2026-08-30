'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Loader2, AlertTriangle, GitBranch } from 'lucide-react';

interface Phase {
  key: string;
  label: string;
  status: string;
  detail: string;
  latencyMs: number | null;
  count?: number;
}

interface DocumentRow {
  id: string;
  filename: string;
  title?: string;
  documentType?: string;
  status: string;
  pageCount: number;
  chunkCount: number;
  embeddedCount: number;
  storageProvider?: string;
}

export interface LangGraphRunView {
  runId: string;
  projectId: string;
  status: string;
  currentPhase: string | null;
  phases: Phase[];
  documents: DocumentRow[];
  analysisId: string | null;
  evidenceCount: number;
  signalCount: number;
  error: string | null;
  totalLatencyMs: number | null;
}

function PhaseIcon({ status }: { status: string }) {
  if (status === 'COMPLETED') return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />;
  if (status === 'RUNNING') return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />;
  if (status === 'FAILED') return <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />;
  return <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />;
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function LangGraphRunPanel({ run }: { run: LangGraphRunView }) {
  const current = run.phases.find((phase) => phase.key === run.currentPhase);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <GitBranch className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">LangGraph flow</h2>
            <p className="text-xs text-muted-foreground">
              Upload → RAG → Evidence agent → Signal agent. Loops are capped.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" aria-atomic="true" className="font-mono text-[10px] text-muted-foreground">
            {run.status === 'RUNNING' && current
              ? `Current phase: ${current.label}`
              : `Run ${run.status.toLowerCase()}`}
            {run.totalLatencyMs != null ? ` · total ${formatMs(run.totalLatencyMs)}` : ''}
          </span>
        </div>
      </div>

      {run.error && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 font-mono text-xs text-destructive">
          {run.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {run.phases.map((phase) => (
          <div
            key={phase.key}
            className={`rounded-xl border p-3 ${
              phase.status === 'COMPLETED'
                ? 'border-success/30 bg-surface-feed/70'
                : phase.status === 'RUNNING'
                  ? 'border-primary/50 bg-primary/10'
                  : phase.status === 'FAILED'
                    ? 'border-destructive/30 bg-destructive/10'
                    : 'border-border/40 bg-card/40'
            }`}
          >
            <div className="mb-1 flex items-center gap-2">
              <PhaseIcon status={phase.status} />
              <span className="text-xs font-semibold text-foreground">{phase.label}</span>
            </div>
            <p className="pl-6 text-[11px] text-muted-foreground">{phase.detail}</p>
            <p className="mt-1 pl-6 font-mono text-[10px] text-foreground">
              {formatMs(phase.latencyMs)}
              {typeof phase.count === 'number' ? ` · ${phase.count}` : ''}
            </p>
          </div>
        ))}
      </div>

      {run.documents.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-[11px]">
            <caption className="sr-only">Chunks and embeddings from RAG</caption>
            <thead className="bg-surface-feed font-mono text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Document</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Pages</th>
                <th className="px-3 py-2">Chunks</th>
                <th className="px-3 py-2">Embedded</th>
                <th className="px-3 py-2">Storage</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {run.documents.map((doc) => (
                <tr key={doc.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium text-foreground">{doc.title || doc.filename}</td>
                  <td className="px-3 py-2 font-mono text-muted-foreground">{doc.documentType || '—'}</td>
                  <td className="px-3 py-2 font-mono">{doc.pageCount}</td>
                  <td className="px-3 py-2 font-mono">{doc.chunkCount}</td>
                  <td className="px-3 py-2 font-mono">{doc.embeddedCount}</td>
                  <td className="px-3 py-2 font-mono">{doc.storageProvider || '—'}</td>
                  <td className="px-3 py-2 font-mono">{doc.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {run.status === 'COMPLETED' && run.analysisId && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${run.projectId}/evidence`}
            className="inline-flex cursor-pointer items-center rounded-[10px] border border-border bg-surface-feed px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open evidence ({run.evidenceCount})
          </Link>
          <Link
            href={`/projects/${run.projectId}/signals`}
            className="inline-flex cursor-pointer items-center rounded-[10px] bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open signals ({run.signalCount})
          </Link>
        </div>
      )}
    </section>
  );
}
