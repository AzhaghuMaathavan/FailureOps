'use client';

import React from 'react';
import { EvidenceItem } from '@/types';
import { ChevronRight, Bookmark } from 'lucide-react';

interface EvidenceCardProps {
  evidence: EvidenceItem;
  onSelect: (evidence: EvidenceItem) => void;
  isSelected?: boolean;
  isStale?: boolean;
}

export function extractSectionAndFinding(
  rawText: string,
  metricName?: string,
  sourceFile?: string,
  baselineVal?: number | null,
  currentVal?: number | null,
  unit?: string | null
): { section?: string; finding: string } {
  const text = (rawText || '').trim();
  
  // Check for raw table delimiter lines
  const isRawTable = text.includes('|') && (text.includes('week_start:') || text.includes('team_size:') || text.includes('api_') || text.includes('p95'));
  if (isRawTable) {
    const mLabel = metricName || 'Operational Telemetry';
    const valSuffix = currentVal !== undefined && currentVal !== null ? ` (Latest: ${currentVal}${unit ? ' ' + unit : ''})` : '';
    return {
      section: sourceFile ? `Data: ${sourceFile}` : undefined,
      finding: `${mLabel}${valSuffix}`,
    };
  }

  // Check for numbered section headers like "9. Current Product Assumptions"
  const sectionHeaderMatch = text.match(/^(\d+[\.\)]\s+[^\n:\.]{3,40})(?:\s*[:\n\.-]\s*|\s*\n+)([\s\S]+)$/i);
  if (sectionHeaderMatch) {
    const section = sectionHeaderMatch[1].trim();
    const rest = sectionHeaderMatch[2].trim();
    if (rest.length > 5) {
      return { section, finding: rest };
    }
  }

  // Check for bare section header without rest
  const bareSectionMatch = text.match(/^(\d+[\.\)]\s+[A-Za-z\s]{3,40})$/i);
  if (bareSectionMatch) {
    const section = bareSectionMatch[1].trim();
    if (metricName && currentVal !== undefined && currentVal !== null) {
      return {
        section,
        finding: `${metricName}: ${baselineVal !== undefined && baselineVal !== null ? baselineVal + ' → ' : ''}${currentVal}${unit ? ' ' + unit : ''}`,
      };
    }
    return {
      section,
      finding: `Assumptions and operational constraints documented in ${sourceFile || 'project source'}.`,
    };
  }

  return { finding: text || metricName || sourceFile || 'Operational Evidence' };
}

export const EvidenceCard: React.FC<EvidenceCardProps> = ({
  evidence,
  onSelect,
  isSelected = false,
  isStale = false,
}) => {
  const rawTitle = evidence.statement || evidence.content || '';
  const { section, finding } = extractSectionAndFinding(
    rawTitle,
    evidence.metricName,
    evidence.sourceFile,
    evidence.baselineValue,
    evidence.currentValue,
    evidence.unit
  );

  const factType =
    evidence.factType ||
    (finding.toLowerCase().includes('incident') || finding.toLowerCase().includes('rollback') || finding.toLowerCase().includes('outage')
      ? 'EVENT'
      : finding.toLowerCase().includes('claim') || finding.toLowerCase().includes('assert') || finding.toLowerCase().includes('sentiment')
      ? 'CLAIM'
      : 'METRIC');

  const metricMovement =
    evidence.currentValue !== undefined && evidence.currentValue !== null
      ? `${evidence.baselineValue ?? '—'} → ${evidence.currentValue}${evidence.unit ? ' ' + evidence.unit : ''}${
          evidence.baselineToCurrentChangePercent !== undefined && evidence.baselineToCurrentChangePercent !== null
            ? ` (${evidence.baselineToCurrentChangePercent >= 0 ? '+' : ''}${evidence.baselineToCurrentChangePercent.toFixed(1)}%)`
            : ''
        }`
      : null;

  return (
    <button
      type="button"
      id={evidence.id}
      onClick={() => onSelect(evidence)}
      aria-pressed={isSelected}
      className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/40 shadow-sm'
          : 'border-border bg-card hover:border-primary/40 hover:bg-card-hover shadow-sm'
      }`}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        {/* Badges and metadata header */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
              factType === 'EVENT'
                ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                : factType === 'CLAIM'
                ? 'border border-sky-500/30 bg-sky-500/10 text-sky-400'
                : 'border border-primary/30 bg-primary/10 text-primary'
            }`}
          >
            {factType}
          </span>

          <span className="font-mono text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {evidence.sourceType?.replace(/_/g, ' ') || 'PROJECT SOURCE'}
          </span>

          {section && (
            <span className="inline-flex items-center gap-1 rounded bg-surface-feed border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              <Bookmark className="h-2.5 w-2.5 text-primary" />
              <span className="truncate max-w-[150px]">{section}</span>
            </span>
          )}
        </div>

        {/* Core Finding Statement */}
        <p className="line-clamp-2 text-xs font-semibold text-foreground leading-snug">
          {finding}
        </p>

        {/* Metric Movement if available */}
        {metricMovement && (
          <p className="font-mono text-[11px] font-bold text-primary">
            {metricMovement}
          </p>
        )}

        {/* Source citation */}
        <p className="truncate font-mono text-[10px] text-muted-foreground">
          {evidence.sourceFile}
          {evidence.reference ? `  ·  ${evidence.reference}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <span
          className={`rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold ${
            isStale
              ? 'border-destructive/40 bg-destructive/10 text-destructive'
              : 'border-success/40 bg-success/10 text-success'
          }`}
        >
          {isStale ? 'Stale' : 'Fresh'}
        </span>
        <span className="hidden font-mono text-[10px] font-semibold text-muted-foreground sm:inline">
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
