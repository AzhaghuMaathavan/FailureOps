'use client';

import React from 'react';
import { UploadProgress } from '@/types';
import { CheckCircle2, Loader2, Circle, Cpu, Database, Binary, ShieldCheck } from 'lucide-react';

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
    <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md">
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Evidence Processing Pipeline</h3>
            <p className="text-xs text-muted-foreground">Autonomous ingestion, segmentation & indexing</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isComplete ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Evidence Base Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30 animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Processing Signals...
            </span>
          )}
        </div>
      </div>

      {/* Pipeline Progression Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {pipelineStages.map((stage, idx) => {
          const isFinished = isComplete || progressList.some(p => p.progress > ((idx + 1) / 6) * 100);
          const isCurrent = !isComplete && !isFinished && progressList.some(p => p.progress >= (idx / 6) * 100);

          return (
            <div
              key={stage.key}
              className={`p-3 rounded-xl border transition-all ${
                isFinished
                  ? 'bg-surface-feed/70 border-emerald-500/30 text-foreground'
                  : isCurrent
                  ? 'bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/30'
                  : 'bg-card/40 border-border/40 text-muted-foreground/60'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {isFinished ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-border shrink-0" />
                )}
                <span className="text-xs font-semibold tracking-tight">{stage.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground pl-6">{stage.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Notice */}
      <div className="mt-5 p-3 rounded-xl bg-surface-feed/60 border border-border/60 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-2 font-mono text-[11px]">
          <Binary className="w-3.5 h-3.5 text-primary" />
          Zero raw PII stored • Encrypted Vector Enclave
        </span>
        <span className="font-mono text-[11px]">Preview Pipeline Mode</span>
      </div>
    </div>
  );
};
