'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Filter, ShieldCheck, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EvidenceItem } from '@/types';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';
import { KpiStat } from '@/components/evidence/KpiStat';

function isEvidenceStale(timestamp: string): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed > 48 * 60 * 60 * 1000;
}

export default function EvidenceIntelligencePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasCompletedAnalysis, setHasCompletedAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictCount, setConflictCount] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    apiClient.getEvidence(projectId)
      .then(res => {
        if (mounted) {
          const rawItems = res?.evidence || (Array.isArray(res) ? res : []);
          const mapped: EvidenceItem[] = rawItems.map((item: any) => ({
            id: item.id || item.evidence_id || `ev_${Math.random().toString(36).substring(2, 7)}`,
            projectId: item.project_id || projectId,
            sourceType: (item.category || item.sourceType || 'PRODUCT_METRICS') as EvidenceItem['sourceType'],
            sourceFile: item.source?.document_name || item.source_citation?.file_name || item.filename || 'Project Telemetry',
            content: item.statement || item.content || item.rawSnippet || item.normalizedFact || '',
            reference: item.source?.location_value || item.source_citation?.page_or_sheet_or_line || item.location || item.id || 'Lineage Trace',
            confidence: Math.round((item.evidence_confidence ?? item.confidence ?? 0.9) * ((item.evidence_confidence ?? item.confidence ?? 0.9) <= 1 ? 100 : 1)),
            timestamp: item.time_period?.start || item.source_citation?.timestamp || item.timestamp || 'Recently',
            category: item.category || 'TECHNICAL',
            snippetContext: item.statement || item.normalizedFact || item.content || '',
          }));

          setEvidenceList(mapped);
          setConflictCount(Array.isArray(res?.conflicts) ? res.conflicts.length : 0);
          setHasCompletedAnalysis(Boolean(res?.analysis_id && res.analysis_id !== 'none'));
          const hashId = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
          if (hashId) {
            const matched = mapped.find((item) => item.id === hashId);
            if (matched) setSelectedEvidence(matched);
          }
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load evidence');
          setIsLoading(false);
        }
      });

    return () => { mounted = false; };
  }, [projectId]);

  const filteredList =
    selectedCategory === 'ALL'
      ? evidenceList
      : evidenceList.filter(e => e.sourceType === selectedCategory || e.category === selectedCategory);

  const categories = [
    'ALL',
    'PRODUCT_METRICS',
    'CUSTOMER_FEEDBACK',
    'ENGINEERING_METRICS',
    'TEAM_OPERATIONS',
    'PRODUCT_PLAN',
    'INCIDENT_REPORTS',
  ];

  const sourceCount = new Set(evidenceList.map((item) => item.sourceFile)).size;
  const staleCount = evidenceList.filter((item) => isEvidenceStale(item.timestamp)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-[11px] font-mono font-bold uppercase tracking-[0.66px] text-primary">
            INGEST  ·  ENCLAVE
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground lg:text-[28px]">
            Evidence Intelligence
          </h1>
          <p className="max-w-xl text-[13px] text-muted-foreground">
            PRDs, tickets, telemetry, and feedback — conflict-ranked, citation-backed.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Zero PII outside enclave
          </span>
          <Link
            href={`/projects/${projectId}/upload`}
            className="inline-flex cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Upload source
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiStat label="Sources" value={isLoading ? '—' : sourceCount} hint="All encrypted" valueClassName="text-info" />
        <KpiStat label="Conflicts" value={isLoading ? '—' : conflictCount} hint="Needs truth" valueClassName="text-warning" />
        <KpiStat label="Citations" value={isLoading ? '—' : evidenceList.length} hint="Grounded" valueClassName="text-success" />
        <KpiStat
          label="Stale"
          value={isLoading ? '—' : staleCount}
          hint={staleCount > 0 ? 'Older than 48h' : 'Within 48h'}
          valueClassName="text-destructive"
        />
      </div>

      <div
        role="group"
        aria-label="Evidence categories"
        className="flex flex-wrap items-center gap-1.5 text-xs"
      >
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 font-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              selectedCategory === cat
                ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                : 'border border-border bg-card text-muted-foreground hover:bg-card-hover hover:text-foreground'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-[10px] border border-border bg-card" />
          ))}
          <p className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            Loading verified Evidence Packet from backend...
          </p>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          <p className="font-bold">Failed to load evidence</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-12 text-center shadow-[0_1px_0_0_rgba(13,20,36,0.8),0_8px_24px_-8px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-bold text-foreground">
            {hasCompletedAnalysis
              ? 'No sufficiently supported evidence found.'
              : 'No completed analysis yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasCompletedAnalysis
              ? 'The Evidence Agent found no grounded citations in the retrieved chunks for this filter.'
              : 'Upload documents, wait until chunk and embedding counts are non-zero, then run project analysis.'}
          </p>
          <Link
            href={hasCompletedAnalysis ? `/projects/${projectId}/upload` : `/projects/${projectId}/analysis`}
            className="mt-2 inline-block cursor-pointer rounded-[10px] bg-primary px-4 py-2 text-xs font-bold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {hasCompletedAnalysis ? 'Upload Evidence' : 'Run Analysis'}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredList.map((ev) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              onSelect={(item) => setSelectedEvidence(item)}
              isSelected={selectedEvidence?.id === ev.id}
              isStale={isEvidenceStale(ev.timestamp)}
            />
          ))}
        </div>
      )}

      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
