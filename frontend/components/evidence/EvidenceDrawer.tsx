'use client';

import React, { useEffect, useState } from 'react';
import { EvidenceItem } from '@/types';
import {
  X,
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { extractSectionAndFinding } from '@/components/evidence/EvidenceCard';

interface EvidenceDrawerProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

interface ParsedMetric {
  name: string;
  baseline: string | number;
  previous?: string | number | null;
  current: string | number;
  change: string;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'UNKNOWN';
}

function parseTableRowsToMetrics(rawText: string): ParsedMetric[] {
  if (!rawText || !rawText.includes('|')) return [];
  const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const parsedRows: Record<string, number>[] = [];
  for (const line of lines) {
    const parts = line.split('|');
    const row: Record<string, number> = {};
    for (const part of parts) {
      const kv = part.split(':');
      if (kv.length === 2) {
        const k = kv[0].trim().toLowerCase().replace(/[\s-]+/g, '_');
        const numMatch = kv[1].replace(/%/g, '').trim().match(/[-+]?[0-9]*\.?[0-9]+/);
        if (numMatch && k !== 'week_start' && k !== 'date' && k !== 'timestamp') {
          row[k] = parseFloat(numMatch[0]);
        }
      }
    }
    if (Object.keys(row).length > 0) {
      parsedRows.push(row);
    }
  }

  if (parsedRows.length < 2) return [];

  const firstRow = parsedRows[0];
  const prevRow = parsedRows.length > 2 ? parsedRows[parsedRows.length - 2] : null;
  const lastRow = parsedRows[parsedRows.length - 1];

  const metrics: ParsedMetric[] = [];
  for (const key of Object.keys(firstRow)) {
    const base = firstRow[key];
    const curr = lastRow[key];
    if (base !== undefined && curr !== undefined && !Number.isNaN(base) && !Number.isNaN(curr)) {
      const diff = curr - base;
      const pct = base !== 0 ? (diff / Math.abs(base)) * 100 : 0;
      let trend: ParsedMetric['trend'] = 'STABLE';
      if (pct > 0.5) trend = 'INCREASING';
      else if (pct < -0.5) trend = 'DECREASING';

      const readableName = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      metrics.push({
        name: readableName,
        baseline: base,
        previous: prevRow ? prevRow[key] : null,
        current: curr,
        change: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`,
        trend,
      });
    }
  }

  return metrics.sort((a, b) => {
    const pA = Math.abs(parseFloat(a.change) || 0);
    const pB = Math.abs(parseFloat(b.change) || 0);
    return pB - pA;
  });
}

export const EvidenceDrawer: React.FC<EvidenceDrawerProps> = ({ evidence, onClose }) => {
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  useEffect(() => {
    if (!evidence) return;
    setShowExcerpt(false);
    setShowTechnicalDetails(false);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [evidence, onClose]);

  if (!evidence) return null;

  const rawTitle = evidence.statement || evidence.content || '';
  const { section, finding } = extractSectionAndFinding(
    rawTitle,
    evidence.metricName,
    evidence.sourceFile,
    evidence.baselineValue,
    evidence.currentValue,
    evidence.unit
  );

  const parsedMetrics = parseTableRowsToMetrics(evidence.snippetContext || evidence.content || '');

  // Build the list of key evidence items
  const keyEvidenceItems: ParsedMetric[] = [];

  if (evidence.metricName && evidence.currentValue !== undefined && evidence.currentValue !== null) {
    const changeStr =
      evidence.baselineToCurrentChangePercent !== undefined && evidence.baselineToCurrentChangePercent !== null
        ? `${evidence.baselineToCurrentChangePercent >= 0 ? '+' : ''}${evidence.baselineToCurrentChangePercent.toFixed(1)}%`
        : '0.0%';
    const unitStr = evidence.unit ? ` ${evidence.unit}` : '';
    keyEvidenceItems.push({
      name: evidence.metricName,
      baseline: evidence.baselineValue !== undefined && evidence.baselineValue !== null ? `${evidence.baselineValue}${unitStr}` : '—',
      previous: evidence.previousValue !== undefined && evidence.previousValue !== null ? `${evidence.previousValue}${unitStr}` : null,
      current: `${evidence.currentValue}${unitStr}`,
      change: changeStr,
      trend: (evidence.direction as ParsedMetric['trend']) || 'UNKNOWN',
    });
  }

  // Add supporting metrics or top parsed metrics
  if (evidence.supportingEvidence && evidence.supportingEvidence.length > 0) {
    for (const se of evidence.supportingEvidence) {
      if (se.metric && !keyEvidenceItems.some((k) => k.name.toLowerCase() === se.metric?.toLowerCase())) {
        keyEvidenceItems.push({
          name: se.metric,
          baseline: se.baseline ?? '—',
          current: se.current ?? '—',
          change: typeof se.change === 'number' ? `${se.change >= 0 ? '+' : ''}${se.change}%` : String(se.change || '0.0%'),
          trend: (se.trend as ParsedMetric['trend']) || 'STABLE',
        });
      }
    }
  } else if (parsedMetrics.length > 0) {
    for (const pm of parsedMetrics.slice(0, 3)) {
      if (!keyEvidenceItems.some((k) => k.name.toLowerCase() === pm.name.toLowerCase())) {
        keyEvidenceItems.push(pm);
      }
    }
  }

  // Location display
  let locationLabel = evidence.reference || '';
  if (evidence.pageNumbers && evidence.pageNumbers.length > 0) {
    locationLabel = `Pages: ${evidence.pageNumbers.join(', ')}`;
  } else if (evidence.rowNumbers && evidence.rowNumbers.length > 0) {
    locationLabel = `Rows: ${evidence.rowNumbers.join('–')}`;
  } else if (!locationLabel || locationLabel.startsWith('ev_') || locationLabel.startsWith('PAGE: null')) {
    locationLabel = 'Lineage Trace';
  }

  const factType = evidence.factType || 'METRIC';
  const problemTitle = factType === 'EVENT' ? 'CORE EVENT' : factType === 'CLAIM' ? 'CORE CLAIM' : 'CORE PROBLEM';

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
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 id="evidence-drawer-title" className="text-sm font-bold text-foreground">
                  Evidence Citation Record
                </h3>
                <span className="font-mono text-[11px] text-muted-foreground">
                  Verified Intelligence Provenance
                </span>
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

          {/* Status & Privacy Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PrivacyBadge level={(evidence.visibility as any) || 'PRIVATE'} />
              <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-primary">
                {evidence.sourceType.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confidence: {evidence.confidence}%
            </span>
          </div>

          {/* 1. CORE FINDING / PROBLEM */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" />
                <span>{problemTitle}</span>
              </div>
              {section && (
                <span className="inline-flex items-center gap-1 rounded bg-surface-feed border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  <Bookmark className="h-3 w-3 text-primary" />
                  <span>{section}</span>
                </span>
              )}
            </div>
            <p className="text-sm font-semibold leading-relaxed text-foreground">
              {finding}
            </p>
          </div>

          {/* 2. KEY EVIDENCE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Key Evidence
              </h4>
              <span className="font-mono text-[10px] text-muted-foreground">
                {keyEvidenceItems.length} Major Metric{keyEvidenceItems.length > 1 ? 's' : ''}
              </span>
            </div>

            {keyEvidenceItems.length > 0 ? (
              <div className="space-y-2">
                {keyEvidenceItems.map((metric, idx) => {
                  const isPositive = metric.change.startsWith('+');
                  const isNegative = metric.change.startsWith('-');

                  return (
                    <div
                      key={idx}
                      className="rounded-lg border border-border/80 bg-surface-feed p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground">
                          {metric.name}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            metric.trend === 'INCREASING'
                              ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                              : metric.trend === 'DECREASING'
                              ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                              : 'border border-slate-700 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {metric.trend === 'INCREASING' ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : metric.trend === 'DECREASING' ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : (
                            <Minus className="h-3 w-3" />
                          )}
                          {metric.trend}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{metric.baseline}</span>
                          <span className="text-primary font-bold">→</span>
                          <span className="font-bold text-foreground">{metric.current}</span>
                        </div>
                        <span
                          className={`font-bold ${
                            isPositive
                              ? 'text-amber-400'
                              : isNegative
                              ? 'text-rose-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {metric.change}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-border/80 bg-surface-feed p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                      factType === 'EVENT'
                        ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                        : factType === 'CLAIM'
                        ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300'
                        : 'border border-primary/30 bg-primary/10 text-primary'
                    }`}
                  >
                    {factType}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {evidence.timestamp || 'Recent Analysis'}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-foreground font-medium">
                  {finding}
                </p>
              </div>
            )}
          </div>

          {/* 3. SOURCE PROVENANCE */}
          <div className="space-y-2">
            <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Source Provenance
            </h4>
            <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-mono text-xs font-bold text-foreground">
                    {evidence.sourceFile}
                  </p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {locationLabel} · Confidence: {evidence.confidence}%
                  </p>
                </div>
              </div>

              <a
                href={`/api/documents/${encodeURIComponent(evidence.sourceDocumentId || evidence.sourceFile)}/download?projectId=${encodeURIComponent(evidence.projectId)}${evidence.pageNumbers && evidence.pageNumbers.length > 0 ? `#page=${evidence.pageNumbers[0]}` : ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface-feed px-2.5 py-1.5 font-mono text-[11px] font-semibold text-primary transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title={`Open ${evidence.sourceFile} in new tab`}
              >
                <span>Open Source</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* 4. Collapsible Supporting Excerpt */}
          <div className="border-t border-border/50 pt-3">
            <button
              type="button"
              onClick={() => setShowExcerpt(!showExcerpt)}
              className="flex w-full cursor-pointer items-center justify-between py-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                {showExcerpt ? 'Hide supporting excerpt' : 'View supporting excerpt'}
              </span>
              {showExcerpt ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showExcerpt && (
              <div className="mt-2 rounded-lg border border-border/70 bg-surface-feed p-3 font-mono text-xs text-muted-foreground leading-relaxed">
                <p className="line-clamp-4 whitespace-pre-wrap">
                  {(evidence.snippetContext || evidence.content || '').slice(0, 350)}...
                </p>
              </div>
            )}
          </div>

          {/* 5. Collapsible Technical Details */}
          <div className="border-t border-border/50 pt-2">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="flex w-full cursor-pointer items-center justify-between py-1 text-left font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>
                {showTechnicalDetails ? 'Hide technical details' : 'Technical details'}
              </span>
              {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            {showTechnicalDetails && (
              <div className="mt-2 space-y-2 rounded-lg border border-border/70 bg-surface-feed p-3 font-mono text-[11px] text-muted-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">Evidence ID:</span>
                  <span className="text-foreground">{evidence.id}</span>
                </div>
                {evidence.sourceChunkId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Chunk ID:</span>
                    <span className="text-foreground">{evidence.sourceChunkId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">Location Reference:</span>
                  <span className="text-foreground">{locationLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground/70">Enclave Visibility:</span>
                  <span className="text-foreground">{evidence.visibility || 'PRIVATE'}</span>
                </div>
                {evidence.supportingChunkIds && evidence.supportingChunkIds.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground/70">Supporting Chunks:</span>
                    <span className="text-foreground">{evidence.supportingChunkIds.length} chunks</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
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
