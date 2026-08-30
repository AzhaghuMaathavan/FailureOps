'use client';

import React from 'react';
import { UploadProgress } from '@/types';
import { CheckCircle2, Loader2, Circle, Cpu, Binary } from 'lucide-react';

interface ProcessingTimelineProps {
  progressList: UploadProgress[];
  isComplete: boolean;
}

export const ProcessingTimeline: React.FC<ProcessingTimelineProps> = ({ progressList, isComplete }) => {
  const pipelineStages = [
    { key: 'RECEIVED', label: 'File Received & Validated', desc: 'Integrity verified, MIME type checked' },
    { key: 'PARSED', label: 'Document Parsed & Extracted', desc: 'AST / Tabular schemas mapped' },
    { key: 'NORMALIZED', label: 'Content Normalized', desc: 'Timeline & metric scales harmonized' },
    { key: 'CHUNKED', label: 'Context Segmentation', desc: 'Semantic chunks & sliding windows generated' },
    { key: 'EMBEDDED', label: 'Vector Embeddings Generated', desc: 'High-dimensional embeddings created' },
    { key: 'INDEXED', label: 'Evidence Base Indexed', desc: 'Indexed for cross-source signal extraction' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <Cpu className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Evidence Processing Pipeline</h3>
            <p className="text-xs text-muted-foreground">Autonomous ingestion, segmentation & indexing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-surface-feed px-3 py-1 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              Evidence Base Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              Processing Signals...
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {pipelineStages.map((stage, idx) => {
          const isFinished = isComplete || progressList.some((p) => p.progress > ((idx + 1) / 6) * 100);
          const isCurrent = !isComplete && !isFinished && progressList.some((p) => p.progress >= (idx / 6) * 100);

          return (
            <div
              key={stage.key}
              className={`rounded-xl border p-3 transition-colors ${
                isFinished
                  ? 'border-success/30 bg-surface-feed/70 text-foreground'
                  : isCurrent
                    ? 'border-primary/50 bg-primary/10 text-foreground ring-1 ring-primary/30'
                    : 'border-border/40 bg-card/40 text-muted-foreground/60'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                {isFinished ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-border" aria-hidden="true" />
                )}
                <span className="text-xs font-semibold tracking-tight">{stage.label}</span>
              </div>
              <p className="pl-6 text-[11px] text-muted-foreground">{stage.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-surface-feed/60 p-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2 font-mono text-[11px]">
          <Binary className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Zero raw PII stored • Encrypted Vector Enclave
        </span>
        <span className="font-mono text-[11px]">Preview Pipeline Mode</span>
      </div>
    </div>
  );
};
