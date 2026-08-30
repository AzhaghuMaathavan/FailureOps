'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, FileSearch, FolderKanban, ArrowRight, Filter, Loader2, Database } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

export default function GlobalSearchPage() {
  const { project } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [memoryMatches, setMemoryMatches] = useState<any[]>([]);
  const [evidenceHits, setEvidenceHits] = useState<any[]>([]);
  const [projectMatches, setProjectMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const FILTERS = [
    { value: 'ALL', label: 'ALL' },
    { value: 'EVIDENCE', label: 'EVIDENCE' },
    { value: 'HISTORICAL_CASES', label: 'HISTORICAL CASES' },
    { value: 'ORGANIZATIONAL_MEMORY', label: 'ORGANIZATIONAL MEMORY' },
    { value: 'ACTIVE_PROJECTS', label: 'ACTIVE PROJECTS' },
  ];

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setSearchError(null);
    const timeout = setTimeout(() => {
      apiClient
        .search(query, selectedFilter, project.id)
        .then((res) => {
          if (mounted) {
            setCases(res?.historicalMatches || []);
            setMemoryMatches(res?.organizationalMemoryMatches || []);
            setEvidenceHits(res?.evidenceHits || []);
            setProjectMatches(res?.projectMatches || []);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (mounted) {
            setCases([]);
            setMemoryMatches([]);
            setEvidenceHits([]);
            setProjectMatches([]);
            setSearchError(isRagUnavailable(err) ? 'RAG unavailable' : err?.message || 'Search failed');
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [query, selectedFilter, project.id]);

  const totalHits = cases.length + evidenceHits.length + memoryMatches.length + projectMatches.length;
  const hasResults = totalHits > 0;

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Global index"
        title="Search"
        description="Jump to patterns, evidence, DNA archetypes, and historical twins."
        action={
          <button
            type="button"
            className={orgSecondaryBtnClass}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <Filter className="h-3.5 w-3.5" aria-hidden="true" />
            {filtersOpen ? 'Hide filters' : 'Open filters'}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-2 md:hidden">
        <OrgMetricCard label="Hits" value={isLoading ? '…' : String(totalHits)} hint="All matches" valueClassName="text-info" />
        <OrgMetricCard label="Twins" value={isLoading ? '…' : String(cases.length)} hint="Historical" valueClassName="text-success" />
        <OrgMetricCard label="PRD" value={isLoading ? '…' : String(evidenceHits.length)} hint="Evidence" valueClassName="text-primary" />
        <OrgMetricCard label="DNA" value={isLoading ? '…' : String(memoryMatches.length)} hint="Learnings" valueClassName="text-magic" />
      </div>

      <div className="space-y-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="global-search-input" className="sr-only">
            Search patterns, evidence, and cases
          </label>
          <input
            id="global-search-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="activation collapse  ·  checkout  ·  onboarding"
            className="w-full rounded-xl border border-primary bg-surface-feed py-3.5 pl-11 pr-16 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </div>

        {filtersOpen && (
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono text-muted-foreground">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                aria-pressed={selectedFilter === f.value}
                onClick={() => setSelectedFilter(f.value)}
                className={`cursor-pointer rounded-lg px-3 py-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${
                  selectedFilter === f.value
                    ? 'bg-primary font-bold text-primary-foreground'
                    : 'border border-border bg-surface-feed hover:bg-card-hover'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {searchError && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 font-mono text-xs text-destructive">
          {searchError}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {query ? `Top vector matches for “${query}”` : 'Indexed historical cases & learnings'}
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center gap-3 rounded-[14px] border border-border bg-card p-16 font-mono text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
            <span>Searching vector knowledge base...</span>
          </div>
        ) : !hasResults ? (
          <div className="space-y-2 rounded-[14px] border border-border bg-card p-12 text-center">
            <Database className="mx-auto h-8 w-8 text-muted-foreground opacity-60" aria-hidden="true" />
            <h3 className="text-base font-bold text-foreground">No matching records found</h3>
            <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
              Upload project documents and run analysis, then search again. Try “onboarding friction”, “checkout drop”, or “CI failure”.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {evidenceHits.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-info">
                  <FileSearch className="h-3.5 w-3.5" aria-hidden="true" />
                  Evidence hit ({evidenceHits.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {evidenceHits.map((hit) => (
                    <OrgInsightCard
                      key={hit.id}
                      href={`/projects/${hit.projectId || project.id}/evidence${hit.id ? `#${hit.id}` : ''}`}
                      title={hit.filename || 'Evidence hit'}
                      body={hit.snippet || hit.location || 'Cited in live signals.'}
                    />
                  ))}
                </div>
              </section>
            )}

            {projectMatches.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                  <FolderKanban className="h-3.5 w-3.5" aria-hidden="true" />
                  Active projects ({projectMatches.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {projectMatches.map((p) => (
                    <OrgInsightCard
                      key={p.id}
                      href={`/projects/${p.id}/overview`}
                      title={p.name}
                      body={p.description || p.health || 'Active enclave project.'}
                    />
                  ))}
                </div>
              </section>
            )}

            {cases.length > 0 && (
              <section className="space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-magic">
                  Pattern hit ({cases.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {cases.map((c) => (
                    <Link
                      key={c.id}
                      href={`/historical/${c.id}`}
                      className="group flex cursor-pointer flex-col justify-between rounded-[14px] border border-border bg-card p-[18px] shadow-[0_1px_0_0_rgba(13,20,36,0.45),0_8px_24px_-8px_rgba(0,0,0,0.35)] transition-colors duration-200 hover:border-primary/50 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <span className="font-mono text-xs font-bold text-muted-foreground">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <PrivacyBadge level={c.privacyLevel} />
                            <span className="rounded border border-magic/30 bg-magic/10 px-2 py-0.5 font-mono text-xs font-bold text-magic">
                              {c.similarity}% Match
                            </span>
                          </div>
                        </div>
                        <h4 className="text-sm font-semibold text-foreground">{c.companyAlias}</h4>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {c.primaryFailurePattern || c.productDescription}
                        </p>
                      </div>
                      <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-3 text-xs font-semibold text-primary">
                        <span>Inspect full historical case</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none" aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {memoryMatches.length > 0 && (
              <section className="space-y-3">
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-success">
                  Organizational memory ({memoryMatches.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {memoryMatches.map((m: any, idx: number) => (
                    <OrgInsightCard
                      key={m.id || idx}
                      href="/memory"
                      title={m.pattern || 'Learning'}
                      body={m.intervention || m.outcome || 'Verified organizational learning.'}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </OrgShell>
  );
}
