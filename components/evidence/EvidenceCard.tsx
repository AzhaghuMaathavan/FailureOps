'use client';

import React from 'react';
import { EvidenceItem } from '@/types';
import { ChevronRight } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onSelect: (evidence: EvidenceItem) => void;
  isSelected?: boolean;
  isStale?: boolean;
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onSelect,
  isSelected = false,
  isStale = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(evidence)}
      aria-pressed={isSelected}
      className={`group flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 text-left shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? 'border-primary bg-card ring-1 ring-primary/40'
          : 'border-border bg-card hover:border-primary/40 hover:bg-card-hover'
      }`}
    >
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-primary">
          {evidence.sourceType.replace(/_/g, ' ')}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-foreground">
          {evidence.content || evidence.sourceFile}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
          {evidence.sourceFile}
          {evidence.reference ? `  ·  ${evidence.reference}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full border px-2 py-1 font-mono text-[10px] font-medium ${
            isStale
              ? 'border-destructive/40 bg-surface-feed text-destructive'
              : 'border-success/40 bg-surface-feed text-success'
          }`}
        >
          {isStale ? 'Stale' : 'Fresh'}
        </span>
        <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">
          {evidence.confidence}%
        </span>
        <ChevronRight
          className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </div>
    </button>
  );
};
