'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Database, FileSearch, FolderKanban, ArrowRight, Filter, Loader2 } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { apiClient, isRagUnavailable } from '@/lib/api/client';
import { useApp } from '@/context/AppContext';

export default function GlobalSearchPage() {
  const { project } = useApp();
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
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
      apiClient.search(query, selectedFilter, project.id)
        .then(res => {
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


  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                Enterprise Vector Search
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Cross-Case Intelligence
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
              Global Failure & Pattern Search
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Search across products, failure patterns, empirical evidence citations, experiments, and organizational memory.
            </p>
          </div>

          {/* Search Input */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-md space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search products, failure patterns, interventions (e.g., 'onboarding friction', 'CI failure')..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-feed border border-border text-foreground text-sm focus:outline-none focus:border-primary font-medium"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto text-xs font-mono text-muted-foreground">
              <Filter className="w-3.5 h-3.5 mr-1" />
              {FILTERS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setSelectedFilter(f.value)}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selectedFilter === f.value
                      ? 'bg-primary text-white font-bold'
                      : 'bg-surface-feed border border-border hover:bg-card-hover'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {searchError && (
            <div role="alert" className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
              {searchError}
            </div>
          )}

          {/* Search Results */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {query ? `Top Vector Matches for "${query}"` : 'Indexed Historical Cases & Learnings'}
            </h3>

            {isLoading ? (
              <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <span>Searching vector knowledge base...</span>
                </div>
              </div>
            ) : cases.length === 0 && evidenceHits.length === 0 && memoryMatches.length === 0 && projectMatches.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-2">
                <Database className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                <h3 className="text-base font-bold text-foreground">No Matching Records Found</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Upload project documents and run analysis, then search again for grounded evidence citations.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {evidenceHits.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <FileSearch className="w-3.5 h-3.5" />
                      Retrieved Evidence ({evidenceHits.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {evidenceHits.map((hit) => (
                        <Link
                          key={hit.id}
                          href={`/projects/${hit.projectId || project.id}/evidence${hit.id ? `#${hit.id}` : ''}`}
                          className="p-5 rounded-2xl bg-card border border-border/80 hover:border-cyan-500/40 transition-all block"
                        >
                          <div className="flex items-center justify-between gap-3 pb-2 border-b border-border/60">
                            <span className="text-xs font-bold text-foreground truncate">{hit.filename}</span>
                            {hit.location && (
                              <span className="text-[10px] font-mono text-muted-foreground shrink-0">{hit.location}</span>
                            )}
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-4">
                            {hit.snippet}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {projectMatches.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5" />
                      Active Projects ({projectMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projectMatches.map((p) => (
                        <Link
                          key={p.id}
                          href={`/projects/${p.id}/overview`}
                          className="p-5 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary">{p.name}</h4>
                            <span className="text-[10px] font-mono text-muted-foreground">{p.health || 'WATCH'}</span>
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {cases.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {cases.map(c => (
                      <Link
                        key={c.id}
                        href={`/historical/${c.id}`}
                        className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/50 transition-all group shadow-sm flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-3 border-b border-border/60">
                            <span className="text-xs font-mono font-bold text-muted-foreground">{c.name}</span>
                            <div className="flex items-center gap-2">
                              <PrivacyBadge level={c.privacyLevel} />
                              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                                {c.similarity}% Match
                              </span>
                            </div>
                          </div>

                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                            {c.companyAlias}
                          </h4>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {c.productDescription}
                          </p>

                          <div className="p-3 rounded-xl bg-surface-feed/70 border border-border/60 text-xs">
                            <span className="text-[10px] font-mono text-rose-400 uppercase font-bold block mb-0.5">
                              Failure Pattern:
                            </span>
                            <p className="font-semibold text-foreground">{c.primaryFailurePattern}</p>
                          </div>

                          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block mb-0.5">
                              Historical Outcome:
                            </span>
                            <p className="text-muted-foreground">{c.interventionOutcome}</p>
                          </div>
                        </div>

                        <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-primary font-semibold">
                          <span>Inspect Full Historical Case Study</span>
                          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {memoryMatches.length > 0 && (
                  <section className="space-y-3">
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                      Organizational Memory ({memoryMatches.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {memoryMatches.map((m: any, idx: number) => (
                        <Link key={m.id || idx} href="/memory" className="p-5 rounded-2xl bg-card border border-border/80 hover:border-emerald-500/40 transition-all block">
                          <h4 className="text-sm font-bold text-foreground">{m.pattern}</h4>
                          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{m.intervention || m.outcome}</p>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

