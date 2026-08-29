'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { FileSearch, Filter, ShieldCheck, Database, Layers } from 'lucide-react';
import { mockEvidence, getEvidenceByProjectId } from '@/data/mockEvidence';
import { EvidenceItem, EvidenceSourceType } from '@/types';
import { EvidenceCard } from '@/components/evidence/EvidenceCard';
import { EvidenceDrawer } from '@/components/evidence/EvidenceDrawer';

export default function EvidenceIntelligencePage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const evidenceList = getEvidenceByProjectId(projectId);

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  const filteredList =
    selectedCategory === 'ALL'
      ? evidenceList
      : evidenceList.filter(e => e.sourceType === selectedCategory);

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
              7 Citations Indexed
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
            className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-all shrink-0 ${
              selectedCategory === cat
                ? 'bg-primary text-white font-bold shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-card-hover'
            }`}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Evidence Cards Grid */}
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

      {/* Side Context Drawer */}
      <EvidenceDrawer
        evidence={selectedEvidence}
        onClose={() => setSelectedEvidence(null)}
      />
    </div>
  );
}
