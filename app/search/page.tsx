'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Database, History, Lightbulb, Dna, ArrowRight, ShieldCheck, Filter, Loader2 } from 'lucide-react';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { apiClient } from '@/lib/api/client';

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [cases, setCases] = useState<any[]>([]);
  const [memoryMatches, setMemoryMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      apiClient.search(query, selectedFilter)
        .then(res => {
          if (mounted) {
            setCases(res?.historicalMatches || []);
            setMemoryMatches(res?.organizationalMemoryMatches || []);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (mounted) setIsLoading(false);
        });
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [query, selectedFilter]);


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
              {['ALL', 'HISTORICAL CASES', 'ORGANIZATIONAL MEMORY', 'ACTIVE PROJECTS'].map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    selectedFilter === f
                      ? 'bg-primary text-white font-bold'
                      : 'bg-surface-feed border border-border hover:bg-card-hover'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

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
            ) : cases.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-2">
                <Database className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                <h3 className="text-base font-bold text-foreground">No Matching Records Found</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Try adjusting search keywords or changing the category filter above.
                </p>
              </div>
            ) : (
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
          </div>
        </main>
      </div>
    </div>
  );
}

