'use client';

import React from 'react';
import { ShieldAlert, AlertTriangle, X, Check, ArrowLeft } from 'lucide-react';
import { SensitiveScanResult } from '@/types';

interface SensitiveDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmPublishAnyway: () => void;
  scanResult: SensitiveScanResult;
  isSubmitting?: boolean;
}

export const SensitiveDataModal: React.FC<SensitiveDataModalProps> = ({
  isOpen,
  onClose,
  onConfirmPublishAnyway,
  scanResult,
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-destructive/40 bg-card p-6 shadow-2xl shadow-destructive/10">
        <div className="flex items-start gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-foreground">
              Potential Sensitive Information Detected
            </h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Our automated zero-leakage security scanner detected suspicious tokens, credentials, or internal patterns in your draft:
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface-feed hover:text-foreground transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {/* Findings List */}
        <div className="mt-4 max-h-48 overflow-y-auto rounded-xl border border-border bg-surface-feed/50 p-3 divide-y divide-border/60">
          {scanResult.findings.map((f, idx) => (
            <div key={idx} className="py-2 first:pt-0 last:pb-0 text-xs">
              <div className="flex items-center justify-between font-mono font-semibold text-destructive">
                <span>{f.category}</span>
                <span className="text-[10px] text-muted-foreground font-mono">Sample: {f.sample}</span>
              </div>
              <p className="mt-0.5 text-muted-foreground text-[11px]">{f.description}</p>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground italic">
          Tip: Please remove raw API keys, private internal IP addresses, or customer PII before publishing to FailureOps Community.
        </p>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-surface-feed hover:bg-card text-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Edit Content & Fix</span>
          </button>

          <button
            type="button"
            onClick={onConfirmPublishAnyway}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Publishing...' : 'I Acknowledge & Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};
