'use client';

import React, { useState } from 'react';
import { X, Database, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { apiClient } from '@/lib/api/client';

interface SaveMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveMemoryModal: React.FC<SaveMemoryModalProps> = ({ isOpen, onClose }) => {
  const { addMemoryEntry } = useApp();
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const entry = {
      id: `mem-${Date.now().toString().slice(-4)}`,
      pattern: 'Pre-Release Progressive Onboarding & Sandbox Validation',
      evidenceSummary: [
        'Mandatory bank KYC gate resulted in 69% trial abandonment',
        '3-step progressive onboarding recovered activation from 31% to 64%',
      ],
      intervention: 'Replaced upfront KYC gate with 3-step progressive onboarding and pre-seeded mock transactions sandbox.',
      experimentDesign: '50 control users (7-step flow) vs 50 treatment users (3-step sandbox) over 14 days.',
      outcome: '+33 percentage point activation lift (p < 0.001); 64% reduction in setup churn support tickets.',
      confidence: 94,
      context: {
        industry: 'FinTech',
        stage: 'Beta / Pre-Launch',
        targetMarket: 'SMB Finance Managers',
      },
      tags: ['Onboarding', 'Activation', 'A/B Test', 'FinTech'],
      verifiedAt: new Date().toISOString().slice(0, 10),
    };
    addMemoryEntry(entry);
    apiClient.saveOrganizationalMemory(entry).catch(() => {});
    setIsSaved(true);
    setTimeout(() => {
      onClose();
      setIsSaved(false);
    }, 1200);
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
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Committing this empirical experiment result creates an anonymized institutional memory entry. Future products facing similar onboarding failure patterns will discover this verified solution.
        </p>

        <div className="p-4 rounded-xl bg-card border border-border/80 text-xs space-y-2">
          <span className="font-mono text-primary uppercase text-[10px] font-bold block">
            Artifact to be committed:
          </span>
          <p className="font-semibold text-foreground">
            &ldquo;Pre-Release Progressive Onboarding & Sandbox Validation&rdquo;
          </p>
          <p className="text-muted-foreground">
            Outcome: <span className="text-emerald-400 font-semibold">+33 percentage points activation improvement</span>
          </p>
        </div>

        <div className="p-3 rounded-xl bg-surface-feed/70 border border-border/70 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px]">
            Zero customer identity or private company credentials will be published.
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaved}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
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
