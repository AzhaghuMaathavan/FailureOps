'use client';

import React, { useEffect } from 'react';
import { EvidenceItem } from '@/types';
import { X, FileText, Hash, Clock, CheckCircle2, ShieldCheck, CornerDownRight } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';

interface EvidenceDrawerProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ evidence, onClose }) => {
  useEffect(() => {
    if (!evidence) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evidence, onClose]);

  if (!evidence) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 motion-reduce:transition-none"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-drawer-title"
        className="flex h-full w-full max-w-lg flex-col justify-between overflow-y-auto border-l border-border bg-background p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 id="evidence-drawer-title" className="text-sm font-bold text-foreground">
                  Evidence Citation Record
                </h3>
                <span className="font-mono text-xs text-muted-foreground">{evidence.id}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close evidence record"
              className="cursor-pointer rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-feed hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <PrivacyBadge level="PRIVATE" />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-primary">
              {evidence.sourceType}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-surface-feed px-2.5 py-0.5 font-mono text-xs font-semibold text-success">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              {evidence.confidence}% Verification Confidence
            </span>
          </div>

          <div className="mt-6 rounded-xl border border-border bg-card p-4 shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Extracted Signal Statement
            </h4>
            <p className="text-sm font-medium italic leading-relaxed text-foreground">
              &ldquo;{evidence.content}&rdquo;
            </p>
          </div>

          {evidence.snippetContext && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <CornerDownRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                <span>Raw Source Snippet & Telemetry Context</span>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-feed p-4 font-mono text-xs leading-relaxed text-info">
                {evidence.snippetContext}
              </pre>
            </div>
          )}

          <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface-feed/60 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verification Provenance
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-[11px] text-muted-foreground">Source File</span>
                <span className="mt-0.5 flex items-center gap-1 font-mono font-medium text-foreground">
                  <FileText className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {evidence.sourceFile}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Location Offset</span>
                <span className="mt-0.5 flex items-center gap-1 font-mono font-medium text-foreground">
                  <Hash className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {evidence.reference}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Timestamp</span>
                <span className="mt-0.5 flex items-center gap-1 font-mono font-medium text-foreground">
                  <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  {evidence.timestamp}
                </span>
              </div>
              <div>
                <span className="block text-[11px] text-muted-foreground">Category</span>
                <span className="mt-0.5 block font-medium text-foreground">{evidence.category}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2.5 border-t border-border pt-4 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <p className="text-[11px] leading-relaxed">
            Source documents remain encrypted in the project&apos;s private enclave. Only anonymized statistical weights are propagated to organizational memory.
          </p>
        </div>
      </div>
    </div>
  );
};
