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
          const seenIds = new Set<string>();
          const mapped: EvidenceItem[] = [];

          for (const item of rawItems) {
            const mName = item.metric_name || item.metricName || (item.normalized_value?.metric);
            const canonicalId = item.id || item.evidence_id || (mName ? `ev_${mName.toLowerCase().replace(/[\s-]+/g, '_')}` : `ev_${mapped.length + 1}`);
            
            if (seenIds.has(canonicalId)) continue;
            seenIds.add(canonicalId);

            const rawSourceType = (
              item.source_type ||
              item.source?.source_type ||
              item.document_type ||
              item.sourceType ||
              'PRODUCT_PLAN'
            ).toString().toUpperCase().replace(/[\s-]+/g, '_');

            const canonicalSourceType: EvidenceItem['sourceType'] = (
              [
                'PRODUCT_PLAN',
                'CUSTOMER_FEEDBACK',
                'PRODUCT_METRICS',
                'ENGINEERING_METRICS',
                'TEAM_OPERATIONS',
                'INCIDENT_REPORTS',
              ].includes(rawSourceType)
                ? rawSourceType
                : 'PRODUCT_PLAN'
            ) as EvidenceItem['sourceType'];

            const docName = item.source?.document_name || item.source_document_name || item.source_citation?.file_name || item.filename || 'Project Telemetry';
            const locType = item.source?.location_type || 'PAGE';
            const locVal = item.source?.location_value || item.source_citation?.page_or_sheet_or_line || item.location;
            const refStr = locVal ? `${locType}: ${locVal}` : (item.reference || canonicalId || 'Lineage Trace');

            const fType = item.fact_type || item.factType || (item.evidence_type === 'EVENT' ? 'EVENT' : (item.evidence_type === 'CLAIM' ? 'CLAIM' : (mName ? 'METRIC' : 'OBSERVATION')));

            mapped.push({
              id: canonicalId,
              projectId: item.project_id || projectId,
              sourceType: canonicalSourceType,
              sourceFile: docName,
              content: item.statement || item.content || item.rawSnippet || item.normalizedFact || '',
              statement: item.statement || item.content || '',
              factType: fType,
              metricName: mName,
              baselineValue: item.baseline_value ?? item.baselineValue ?? item.normalized_value?.before,
              previousValue: item.previous_value ?? item.previousValue,
              currentValue: item.current_value ?? item.currentValue ?? item.normalized_value?.after,
              unit: item.unit || item.normalized_value?.unit,
              direction: item.direction || item.normalized_value?.direction || 'UNKNOWN',
              baselineTimestamp: item.baseline_timestamp || item.baselineTimestamp,
              previousTimestamp: item.previous_timestamp || item.previousTimestamp,
              currentTimestamp: item.current_timestamp || item.currentTimestamp,
              baselineToCurrentChangePercent: item.baseline_to_current_change_percent ?? item.baselineToCurrentChangePercent,
              previousToCurrentChangePercent: item.previous_to_current_change_percent ?? item.previousToCurrentChangePercent,
              reference: refStr,
              confidence: Math.round((item.evidence_confidence ?? item.confidence ?? item.extraction_confidence ?? 0.9) * ((item.evidence_confidence ?? item.confidence ?? item.extraction_confidence ?? 0.9) <= 1 ? 100 : 1)),
              timestamp: item.time_period?.start || item.baseline_timestamp || item.current_timestamp || item.source_citation?.timestamp || item.timestamp || 'Recently',
              category: item.category || item.evidence_category || 'TECHNICAL',
              snippetContext: item.snippetContext || item.raw_snippet || item.snippet || item.statement || item.content || '',
              sourceDocumentId: item.source_document_id || item.source?.document_id || item.sourceDocumentId,
              sourceChunkId: item.source_chunk_id || item.sourceChunkId,
              supportingChunkIds: item.supporting_chunk_ids || item.supportingChunkIds || [],
              pageNumbers: item.page_numbers || item.pageNumbers || [],
              rowNumbers: item.row_numbers || item.source_metadata?.rows || item.rowNumbers || [],
              citation: item.citation,
              visibility: item.visibility || 'PRIVATE',
              supportingEvidence: item.supporting_evidence || item.supportingEvidence || []
            });
          }

          // Ingest events
          if (Array.isArray(res?.events)) {
            for (let i = 0; i < res.events.length; i++) {
              const ev = res.events[i];
              const evId = `ev_event_${i + 1}`;
              if (!seenIds.has(evId)) {
                seenIds.add(evId);
                mapped.push({
                  id: evId,
                  projectId,
                  sourceType: 'INCIDENT_REPORTS',
                  sourceFile: ev.source || 'Incident Timeline',
                  content: ev.description || '',
                  statement: ev.description || '',
                  factType: 'EVENT',
                  reference: ev.source || 'Event Log',
                  confidence: Math.round((ev.confidence || 0.9) * 100),
                  timestamp: ev.timestamp || 'Recently',
                  category: 'OPERATIONAL'
                });
              }
            }
          }

          // Ingest claims
          if (Array.isArray(res?.claims)) {
            for (let i = 0; i < res.claims.length; i++) {
              const cl = res.claims[i];
              const clId = `ev_claim_${i + 1}`;
              if (!seenIds.has(clId)) {
                seenIds.add(clId);
                mapped.push({
                  id: clId,
                  projectId,
                  sourceType: 'CUSTOMER_FEEDBACK',
                  sourceFile: cl.source || 'Customer Feedback',
                  content: cl.statement || '',
                  statement: cl.statement || '',
                  factType: 'CLAIM',
                  reference: cl.source || 'User Feedback',
                  confidence: Math.round((cl.confidence || 0.9) * 100),
                  timestamp: 'Recently',
                  category: 'CUSTOMER'
                });
              }
            }
          }

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

  const categories = [
    { id: 'ALL', label: 'ALL' },
    { id: 'TYPE_METRICS', label: 'METRICS' },
    { id: 'TYPE_EVENTS', label: 'EVENTS' },
    { id: 'TYPE_CLAIMS', label: 'CLAIMS' },
    { id: 'PRODUCT_PLAN', label: 'PRODUCT PLAN' },
    { id: 'CUSTOMER_FEEDBACK', label: 'CUSTOMER FEEDBACK' },
    { id: 'PRODUCT_METRICS', label: 'PRODUCT METRICS' },
    { id: 'ENGINEERING_METRICS', label: 'ENGINEERING METRICS' },
    { id: 'TEAM_OPERATIONS', label: 'TEAM OPERATIONS' },
    { id: 'INCIDENT_REPORTS', label: 'INCIDENT REPORTS' },
  ];

  const getCategoryCount = (catId: string) => {
    if (catId === 'ALL') return evidenceList.length;
    if (catId === 'TYPE_METRICS') return evidenceList.filter((e) => (e.factType || 'METRIC') === 'METRIC').length;
    if (catId === 'TYPE_EVENTS') return evidenceList.filter((e) => e.factType === 'EVENT').length;
    if (catId === 'TYPE_CLAIMS') return evidenceList.filter((e) => e.factType === 'CLAIM').length;
    return evidenceList.filter((e) => e.sourceType === catId).length;
  };

  const filteredList =
    selectedCategory === 'ALL'
      ? evidenceList
      : selectedCategory === 'TYPE_METRICS'
      ? evidenceList.filter((e) => (e.factType || 'METRIC') === 'METRIC')
      : selectedCategory === 'TYPE_EVENTS'
      ? evidenceList.filter((e) => e.factType === 'EVENT')
      : selectedCategory === 'TYPE_CLAIMS'
      ? evidenceList.filter((e) => e.factType === 'CLAIM')
      : evidenceList.filter((e) => e.sourceType === selectedCategory);

  const sourceCount = new Set(evidenceList.map((item) => item.sourceFile)).size;
  const staleCount = evidenceList.filter((item) => isEvidenceStale(item.timestamp)).length;

  return (
    <div className="space-y-6">
      {/* Top Header matching LangGraph Orchestrated banner */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.35)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Evidence Intelligence Service
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              LangGraph Orchestrated
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Deterministic Grounded Ingestion &rarr; Citation Extractor &rarr; Chronological Telemetry Engine
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${projectId}/upload`}
            className="inline-flex cursor-pointer items-center justify-center rounded-[10px] bg-primary px-4 py-2 text-xs font-bold font-mono text-primary-foreground shadow-[0_0_18px_-4px_rgba(255,122,0,0.35)] transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Upload Evidence
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
        {categories.map((cat) => {
          const count = getCategoryCount(cat.id);
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 cursor-pointer rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? 'bg-primary font-bold text-primary-foreground shadow-sm'
                  : 'border border-border bg-card text-muted-foreground hover:bg-card-hover hover:text-foreground'
              }`}
            >
              {cat.label} ({isLoading ? '…' : count})
            </button>
          );
        })}
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
              ? `No evidence found for ${selectedCategory.replace(/_/g, ' ')}.`
              : 'No completed analysis yet'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasCompletedAnalysis
              ? `The Evidence Agent found no citations from ${selectedCategory.replace(/_/g, ' ')} sources in this project.`
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
