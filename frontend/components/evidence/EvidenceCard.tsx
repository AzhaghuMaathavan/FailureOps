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
  const rawTitle = evidence.statement || evidence.content || '';
  const isRawTable = rawTitle.includes('|') && (rawTitle.includes('week_start:') || rawTitle.includes('team_size:') || rawTitle.includes('api_'));
  const cleanTitle = isRawTable
    ? (evidence.metricName || `Telemetry Series (${evidence.sourceFile})`)
    : (rawTitle || evidence.sourceFile);

  const factType = evidence.factType || (cleanTitle.toLowerCase().includes('incident') || cleanTitle.toLowerCase().includes('rollback') || cleanTitle.toLowerCase().includes('outage') ? 'EVENT' : (cleanTitle.toLowerCase().includes('claim') || cleanTitle.toLowerCase().includes('assert') ? 'CLAIM' : 'METRIC'));

  const metricMovement = evidence.currentValue !== undefined && evidence.currentValue !== null
    ? `${evidence.baselineValue ?? '—'} → ${evidence.currentValue}${evidence.unit ? ' ' + evidence.unit : ''}${evidence.baselineToCurrentChangePercent !== undefined && evidence.baselineToCurrentChangePercent !== null ? ` (${evidence.baselineToCurrentChangePercent >= 0 ? '+' : ''}${evidence.baselineToCurrentChangePercent}%)` : ''}`
    : null;

  return (
    <button
      type="button"
      id={evidence.id}
      onClick={() => onSelect(evidence)}
      aria-pressed={isSelected}
      className={`group flex w-full items-center justify-between gap-3 rounded-[10px] border px-3.5 py-3 text-left shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? 'border-primary bg-card ring-1 ring-primary/40'
          : 'border-border bg-card hover:border-primary/40 hover:bg-card-hover'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
            factType === 'EVENT'
              ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
              : factType === 'CLAIM'
              ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
              : 'border border-primary/30 bg-primary/10 text-primary'
          }`}>
            {factType}
          </span>
          <p className="font-mono text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {evidence.sourceType?.replace(/_/g, ' ') || 'PROJECT SOURCE'}
          </p>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-foreground">
          {cleanTitle}
        </p>
        {metricMovement && (
          <p className="mt-0.5 font-mono text-[11px] font-medium text-primary">
            {metricMovement}
          </p>
        )}
        <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
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
