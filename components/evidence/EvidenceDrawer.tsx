'use client';

import React from 'react';
import { EvidenceItem } from '@/types';
import { X, FileText, Hash, Clock, CheckCircle2, ShieldCheck, CornerDownRight } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';

interface EvidenceDrawerProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ evidence, onClose }) => {
  if (!evidence) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-background border-l border-border p-6 shadow-2xl overflow-y-auto flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Evidence Citation Record</h3>
                <span className="text-xs font-mono text-muted-foreground">{evidence.id}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metadata badges */}
          <div className="flex flex-wrap items-center gap-2 mt-5">
            <PrivacyBadge level="PRIVATE" />
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
              {evidence.sourceType}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {evidence.confidence}% Verification Confidence
            </span>
          </div>

          {/* Primary Statement */}
          <div className="mt-6 p-4 rounded-xl bg-card border border-border/80 shadow-sm">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Extracted Signal Statement
            </h4>
            <p className="text-sm text-foreground font-medium leading-relaxed italic">
              &ldquo;{evidence.content}&rdquo;
            </p>
          </div>

          {/* Raw Citation Context */}
          {evidence.snippetContext && (
            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                <CornerDownRight className="w-3.5 h-3.5 text-primary" />
                <span>Raw Source Snippet & Telemetry Context</span>
              </div>
              <pre className="p-4 rounded-xl bg-[#030507] border border-border/90 text-xs font-mono text-emerald-400/90 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                {evidence.snippetContext}
              </pre>
            </div>
          )}

          {/* Provenance Details */}
          <div className="mt-6 space-y-3 p-4 rounded-xl bg-surface-feed/60 border border-border/60">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verification Provenance
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block text-[11px]">Source File</span>
                <span className="font-mono font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <FileText className="w-3 h-3 text-muted-foreground" />
                  {evidence.sourceFile}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Location Offset</span>
                <span className="font-mono font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <Hash className="w-3 h-3 text-muted-foreground" />
                  {evidence.reference}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Timestamp</span>
                <span className="font-mono font-medium text-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  {evidence.timestamp}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[11px]">Category</span>
                <span className="font-medium text-foreground mt-0.5 block">{evidence.category}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Security Notice */}
        <div className="mt-8 pt-4 border-t border-border flex items-center gap-2.5 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-[11px] leading-relaxed">
            Source documents remain encrypted in the project&apos;s private enclave. Only anonymized statistical weights are propagated to organizational memory.
          </p>
        </div>
      </div>
    </div>
  );
};
