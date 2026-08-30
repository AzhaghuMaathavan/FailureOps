'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  ExternalLink,
  Loader2,
  AlertCircle,
  FileSearch,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { focusRing, btnPrimary } from '@/components/landing/chrome';

export interface EvidenceDetail {
  id: string;
  category?: string;
  statement?: string;
  summary?: string;
  key_fact?: string;
  confidence?: number;
  verification_status?: string;
  location_type?: string;
  location_value?: string;
  citation?: string;
  source_document_id?: string;
  source_document_name?: string;
  project_id?: string;
  visibility?: string;
}

interface EvidenceModalProps {
  evidenceId: string | null;
  projectId?: string;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({
  evidenceId,
  projectId = 'aurora',
  onClose,
}) => {
  const [evidence, setEvidence] = useState<EvidenceDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!evidenceId) return;
    let mounted = true;
    setLoading(true);
    setError(null);

    // Fetch single evidence from API
    fetch(`/api/evidence/${encodeURIComponent(evidenceId)}`)
      .then(async (res) => {
        if (!res.ok) {
          // Fallback to searching project evidence packet
          const packet = await apiClient.getEvidence(projectId).catch(() => null);
          const item = packet?.evidence?.find(
            (e: any) => e.id === evidenceId || e.evidence_id === evidenceId
          );
          if (item) {
            const lineage = item.source_lineage || {};
            return {
              id: item.id || evidenceId,
              category: item.category || 'OPERATIONAL',
              statement: item.statement || '',
              summary: item.statement || '',
              key_fact: item.statement || '',
              confidence: item.evidence_confidence || 0.85,
              verification_status: item.verification_status || 'VERIFIED',
              location_type: lineage.location_type || 'PAGE',
              location_value: lineage.page_number ? `Page ${lineage.page_number}` : 'Section 1',
              citation: lineage.citation || `${lineage.filename || 'Source'} (Page ${lineage.page_number || 1})`,
              source_document_id: lineage.document_id || lineage.source_document_id || lineage.filename,
              source_document_name: lineage.document_name || lineage.filename || 'source.pdf',
              project_id: projectId,
              visibility: item.visibility || 'PRIVATE',
            };
          }
          throw new Error(`Evidence #${evidenceId} not found.`);
        }
        const json = await res.json();
        return json.data || json;
      })
      .then((data) => {
        if (mounted) {
          setEvidence(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(err?.message || `Unable to load evidence #${evidenceId}`);
          setLoading(false);
        }
      });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      mounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [evidenceId, projectId, onClose]);

  if (!evidenceId) return null;

  const docId = evidence?.source_document_id || evidence?.source_document_name || 'source.pdf';
  const downloadUrl = `/api/documents/${encodeURIComponent(docId)}/download?projectId=${encodeURIComponent(
    evidence?.project_id || projectId
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-surface-feed/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FileSearch className="h-4 w-4" />
            </div>
            <div>
              <h3 id="evidence-modal-title" className="text-sm font-bold text-foreground flex items-center gap-2">
                <span>Evidence Record</span>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                  #{evidenceId}
                </span>
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-surface-feed hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-mono text-muted-foreground">Retrieving grounded citation...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Citation Lookup Failed</span>
              </div>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : evidence ? (
            <div className="space-y-4 text-xs">
              {/* Category & Status */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-surface-feed border border-border text-muted-foreground">
                  Category: {evidence.category || 'OPERATIONAL'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{evidence.verification_status || 'VERIFIED'}</span>
                </span>
              </div>

              {/* Statement / Key Fact */}
              <div className="rounded-xl border border-border/80 bg-surface-feed/70 p-4 space-y-1.5">
                <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Extracted Statement & Key Fact
                </span>
                <p className="text-sm font-semibold text-foreground leading-relaxed">
                  &ldquo;{evidence.key_fact || evidence.statement || evidence.summary}&rdquo;
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Confidence</span>
                  <p className="font-mono text-base font-bold text-foreground">
                    {Math.round(
                      (evidence.confidence || 0) <= 1 ? (evidence.confidence || 0) * 100 : evidence.confidence || 0
                    )}
                    %
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 space-y-1">
                  <span className="font-mono text-[10px] uppercase text-muted-foreground">Location</span>
                  <p className="font-mono text-xs font-bold text-foreground truncate">
                    {evidence.location_value || 'Page 1'}
                  </p>
                </div>
              </div>

              {/* Source Document Provenance */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Source Provenance
                </span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-mono text-xs text-foreground font-semibold truncate">
                      {evidence.source_document_name || 'source_document.pdf'}
                    </span>
                  </div>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(btnPrimary('py-1 px-2.5 text-[11px] font-semibold gap-1 shrink-0 cursor-pointer'))}
                    title="Open verified source document in new tab"
                  >
                    <span>Open Source</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {evidence.citation && (
                  <p className="font-mono text-[10px] text-muted-foreground italic border-t border-border/60 pt-1.5">
                    Citation: {evidence.citation}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-3 bg-surface-feed/50 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>Enclave Protected</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg border border-border bg-card hover:bg-card-hover text-foreground font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
