'use client';

import React, { useEffect, useState } from 'react';
import { Database, Search, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemoryCard } from '@/components/memory/MemoryCard';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  orgSecondaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { OrganizationalMemoryEntry } from '@/types';

function exportBrief(entries: OrganizationalMemoryEntry[]) {
  const body = entries
    .map((entry) =>
      [
        `# ${entry.pattern}`,
        `Verified: ${entry.verifiedAt}`,
        `Intervention: ${entry.intervention}`,
        `Outcome: ${entry.outcome}`,
        `Confidence: ${entry.confidence}%`,
      ].join('\n')
    )
    .join('\n\n');
  const blob = new Blob([body || 'No validated learnings to export.'], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'validated-learnings.txt';
  link.click();
  URL.revokeObjectURL(url);
}

export default function OrganizationalMemoryPage() {
  const { project, memoryEntries } = useApp();
  const [entries, setEntries] = useState<OrganizationalMemoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getOrganizationalMemory(project.id)
      .then((res) => {
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
    return () => {
      mounted = false;
    };
  }, [project.id]);

  const mergedEntries = [...memoryEntries, ...entries].filter(
    (entry, index, list) => list.findIndex((item) => item.id === entry.id) === index
  );

  const filteredEntries = mergedEntries.filter(
    (m) =>
      !searchQuery ||
      (m.pattern || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.intervention || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const committed = filteredEntries.filter((e) => Number(e.confidence || 0) >= 50).length;
  const rejected = filteredEntries.filter((e) => Number(e.confidence || 0) < 50).length;
  const reuseRate =
    filteredEntries.length > 0
      ? Math.round((filteredEntries.filter((e) => (e.tags || []).length > 0).length / filteredEntries.length) * 100)
      : 0;
  const latest = [...filteredEntries].sort((a, b) => String(b.verifiedAt || '').localeCompare(String(a.verifiedAt || '')))[0];
  const keepEntry = [...filteredEntries].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0];
  const neverAgain = [...filteredEntries].sort((a, b) => Number(a.confidence || 0) - Number(b.confidence || 0))[0];

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Institutional memory"
        title="Validated Learnings"
        description="Only interventions that survived outcome verification are stored here."
        action={
          <button type="button" className={orgSecondaryBtnClass} onClick={() => exportBrief(filteredEntries)}>
            Export brief
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrgMetricCard
          label="Committed"
          value={isLoading ? '…' : String(committed)}
          hint="Verified"
          valueClassName="text-success"
        />
        <OrgMetricCard
          label="Rejected"
          value={isLoading ? '…' : String(rejected)}
          hint="No lift"
          valueClassName="text-destructive"
        />
        <OrgMetricCard
          label="Reuse rate"
          value={isLoading ? '…' : `${reuseRate}%`}
          hint="Playbooks"
          valueClassName="text-magic"
        />
        <OrgMetricCard
          label="Last write"
          value={isLoading ? '…' : latest ? project.codeName.replace(/^PROJECT\s+/i, '') || project.name : '—'}
          hint={latest?.verifiedAt || 'No writes yet'}
          valueClassName="text-primary"
        />
      </div>

      {!isLoading && keepEntry && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <OrgInsightCard title="Keep" body={keepEntry.intervention || keepEntry.pattern} />
          <OrgInsightCard
            title="Never again"
            body={
              neverAgain && neverAgain.id !== keepEntry.id
                ? neverAgain.outcome || neverAgain.pattern
                : keepEntry.outcome || 'Do not generalize a single verified playbook beyond its DNA.'
            }
          />
        </div>
      )}

      <div className="relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="memory-search-input" className="sr-only">
          Search organizational learnings
        </label>
        <input
          id="memory-search-input"
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search organizational learnings, failure patterns, tags, or interventions..."
          className="w-full rounded-xl border border-border bg-surface-feed py-3.5 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-[14px] border border-border bg-card p-16 font-mono text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span>Loading institutional memory records...</span>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="space-y-2 rounded-[14px] border border-border bg-card p-12 text-center">
          <Database className="mx-auto h-8 w-8 text-muted-foreground opacity-60" aria-hidden="true" />
          <h3 className="text-base font-bold text-foreground">No organizational learnings found</h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground">
            No matching verified failure patterns or interventions were found. Commit an outcome from a verified experiment, or try a different pattern tag.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredEntries.map((entry) => (
            <MemoryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </OrgShell>
  );
}
