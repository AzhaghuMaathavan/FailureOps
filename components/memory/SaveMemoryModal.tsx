'use client';

import React, { useState } from 'react';
import { X, Database, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';

interface SaveMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const SaveMemoryModal: React.FC<SaveMemoryModalProps> = ({ isOpen, onClose, outcome }) => {
  const { addMemoryEntry } = useApp();
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      pattern: outcome.intervention_title || 'Verified experiment outcome',
      evidenceSummary: (outcome.evidence_ids || []).map(String).slice(0, 8),
      intervention: outcome.intervention_title || '',
      experimentDesign: '',
      outcome: outcome.summary || outcome.status || 'Outcome recorded',
      confidence: outcomeConfidence(outcome),
      context: {
        industry: 'Unspecified',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Database className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-foreground">Save to Organizational Memory</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {canCommit ? (
          <>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This commits the verified experiment result currently loaded for the project. Confidence is taken from the outcome attribution field, not a default score.
            </p>
            <div className="p-4 rounded-xl bg-card border border-border/80 text-xs space-y-2">
              <span className="font-mono text-primary uppercase text-[10px] font-bold block">
                Artifact to be committed
              </span>
              <p className="font-semibold text-foreground">{outcome?.intervention_title}</p>
              <p className="text-muted-foreground">{outcome?.summary}</p>
            </div>
          </>
        ) : (
          <div className="p-4 rounded-xl bg-card border border-border/80 flex items-start gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p>
              No verified experiment outcome is available. Run analysis and record measured post-intervention metrics before committing memory.
            </p>
          </div>
        )}

        {error && (
          <p className="text-xs text-rose-400">{error}</p>
        )}

        <div className="p-3 rounded-xl bg-surface-feed/70 border border-border/70 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px]">
            Zero customer identity or private company credentials will be published.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved || !canCommit}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
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
