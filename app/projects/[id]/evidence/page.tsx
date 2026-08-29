'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileSearch, Filter, ShieldCheck, Database, Layers, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { EvidenceItem } from '@/types';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';

export default function EvidenceIntelligencePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [evidenceList, setEvidenceList] = useState<EvidenceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
            sourceType: item.category || item.sourceType || 'PRODUCT_METRICS',
            filename: item.source?.document_name || item.source_citation?.file_name || item.filename || 'Project Telemetry',
            location: item.source?.location_value || item.source_citation?.page_or_sheet_or_line || item.location || 'Lineage Trace',
            timestamp: item.time_period?.start || item.source_citation?.timestamp || item.timestamp || '2026-08-01',
            rawSnippet: item.statement || item.rawSnippet || '',
            normalizedFact: item.statement || item.normalizedFact || '',
            category: item.category || 'TECHNICAL',
            confidence: Math.round((item.evidence_confidence ?? item.confidence ?? 0.9) * ((item.evidence_confidence ?? item.confidence ?? 0.9) <= 1 ? 100 : 1)),
            extractedAt: item.created_at || 'Recently',
            metadata: item.normalized_value || {},
          }));

          setEvidenceList(mapped);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Evidence Intelligence Enclave
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {evidenceList.length} Citations Indexed
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight mt-1">
            Empirical Evidence Base
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Granular citations and raw observations extracted from normalized artifacts. Click any record to inspect telemetry context.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero PII Stored Outside Enclave</span>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar text-xs">
        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1 shrink-0" />
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-primary text-white font-bold shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Loading / Error / Grid */}
      {isLoading ? (
        <div className="p-12 rounded-2xl bg-card border border-border flex items-center justify-center">
          <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <span>Loading verified Evidence Packet from backend...</span>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          <p className="font-bold">Failed to load evidence</p>
          <p className="text-xs mt-1 text-rose-400">{error}</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center">
          <p className="text-sm font-bold text-foreground">No evidence items in this category</p>
          <p className="text-xs text-muted-foreground mt-1">Upload additional project documents to populate citations</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map(ev => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              onSelect={item => setSelectedEvidence(item)}
              isSelected={selectedEvidence?.id === ev.id}
            />
          ))}
        </div>
      )}

      {/* Side Context Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}

