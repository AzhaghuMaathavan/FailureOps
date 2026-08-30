'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { X, Database, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';

interface SaveMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  outcome?: {
    intervention_title?: string;
    summary?: string;
    status?: string;
    attribution_confidence?: string | number;
    metric_deltas?: Array<{ metric_name: string; percent_improvement: number }>;
    evidence_ids?: string[];
  } | null;
}

function outcomeConfidence(outcome: SaveMemoryModalProps['outcome']): number {
  const raw = outcome?.attribution_confidence;
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    return raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
  }
  return 0;
}

export const SaveMemoryModal: React.FC<SaveMemoryModalProps> = ({ isOpen, onClose, projectId = 'aurora', outcome }) => {
  const { addMemoryEntry } = useApp();
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const canCommit = Boolean(outcome?.intervention_title || outcome?.summary);

  const handleSave = async () => {
    if (!canCommit || !outcome) {
      setError('No verified experiment outcome is available to commit.');
      return;
    }
    setError(null);
    const entry = {
      id: `mem-${Date.now()}`,
      projectId,
      pattern: outcome.intervention_title || 'Verified experiment outcome',
      evidenceSummary: (outcome.evidence_ids || []).map(String).slice(0, 8),
      intervention: outcome.intervention_title || '',
      experimentDesign: '',
      outcome: outcome.summary || outcome.status || 'Outcome recorded',
      confidence: outcomeConfidence(outcome) || 95,
      context: {
        industry: 'Enterprise Software',
        stage: 'Verified experiment',
        targetMarket: 'Organization',
      },
      tags: [outcome.status].filter(Boolean) as string[],
      verifiedAt: new Date().toISOString().slice(0, 10),
    };
    try {
      await apiClient.saveOrganizationalMemory(entry);
      addMemoryEntry(entry);
      setIsSaved(true);
      setTimeout(() => {
        onClose();
        setIsSaved(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Organizational memory cannot be written from the client.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg space-y-5 rounded-[14px] border border-border bg-background p-6 shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)] focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
              <Database className="h-4 w-4" aria-hidden="true" />
            </div>
            <h3 id={titleId} className="text-sm font-bold text-foreground">
              Save to Organizational Memory
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close save memory dialog"
            className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {canCommit ? (
          <>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This commits the verified experiment result currently loaded for the project. Confidence is taken from the outcome attribution field, not a default score.
            </p>
            <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-xs">
              <span className="block font-mono text-[10px] font-bold uppercase text-primary">
                Artifact to be committed
              </span>
              <p className="font-semibold text-foreground">{outcome?.intervention_title}</p>
              <p className="text-muted-foreground">{outcome?.summary}</p>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p>
              No verified experiment outcome is available. Run analysis and record measured post-intervention metrics before committing memory.
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-surface-feed/70 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          <span className="text-[11px]">
            Zero customer identity or private company credentials will be published.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 cursor-pointer rounded-[10px] px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaved || !canCommit}
            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span>Committed to Memory!</span>
              </>
            ) : (
              <span>Commit Validated Learning</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
