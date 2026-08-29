'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, Search, PlusCircle, ShieldCheck, Tag, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemoryCard } from '@/components/memory/MemoryCard';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { apiClient } from '@/lib/api/client';
import { OrganizationalMemoryEntry } from '@/types';

export default function OrganizationalMemoryPage() {
  const { project, memoryEntries } = useApp();
  const [entries, setEntries] = useState<OrganizationalMemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient.getOrganizationalMemory(project.id)
      .then(res => {
        if (mounted) {
          const rawEntries = res?.entries || res?.memories || (Array.isArray(res) ? res : []);
          setEntries(rawEntries);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setEntries([]);
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, [project.id]);


  const mergedEntries = [...memoryEntries, ...entries].filter(
    (entry, index, list) => list.findIndex((item) => item.id === entry.id) === index
  );

  const filteredEntries = mergedEntries.filter(
    m =>
      !searchQuery ||
      (m.pattern || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.intervention || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );


  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-6xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
                  Institutional Vault
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {filteredEntries.length} Validated Learnings
                </span>

              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
                Organizational Memory
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Searchable repository of empirical failure patterns, verified interventions, and validated recovery playbooks.
              </p>
            </div>

            <Link
              href={`/projects/${project.id}/overview`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-feed hover:bg-card border border-border text-xs font-mono font-bold text-foreground transition-all shadow-sm"
            >
              <span>Open {project.name} Briefing</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search organizational learnings, failure patterns, tags, or interventions..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary shadow-sm font-medium"
            />
          </div>

          {/* Learnings Grid */}
          {isLoading ? (
            <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
              <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span>Loading institutional memory records...</span>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-2">
              <Database className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
              <h3 className="text-base font-bold text-foreground">No Organizational Learnings Found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                No matching verified failure patterns or interventions were found in organizational memory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEntries.map(entry => (
                <MemoryCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
