'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  OrgInsightCard,
  OrgMetricCard,
  OrgPageHeader,
  OrgShell,
  OrgStatusPill,
  orgPrimaryBtnClass,
} from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';

function projectTone(health: Project['health']): 'critical' | 'watch' | 'success' {
  if (health === 'CRITICAL') return 'critical';
  if (health === 'AT_RISK') return 'watch';
  return 'success';
}

function projectBadge(health: Project['health']): string {
  if (health === 'CRITICAL') return 'SEV-1';
  if (health === 'AT_RISK') return 'WATCH';
  return 'HEALTHY';
}

function shortCode(codeName: string): string {
  return codeName.replace(/^PROJECT\s+/i, '').trim() || codeName;
}

export default function GlobalDashboardPage() {
  const router = useRouter();
  const { setProject } = useApp();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    apiClient
      .getProjects()
      .then((data) => {
        if (mounted) {
          setProjects(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load projects');
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const atRiskCount = projects.filter((p) => p.health === 'CRITICAL' || p.health === 'AT_RISK').length;
  const healthyCount = projects.filter((p) => p.health === 'HEALTHY').length;
  const openSignals = projects.reduce((sum, p) => sum + Number(p.activeFailureSeedsCount || 0), 0);
  const memoryHits = projects.filter((p) => Number(p.historicalSimilarity || 0) > 0).length;

  return (
    <OrgShell>
      <OrgPageHeader
        eyebrow="Organizational intelligence"
        title="Live enclave dashboard"
        description="Cross-project telemetry, emergent failure seeds, and recovery memory."
        action={
          <Link href="/register" className={orgPrimaryBtnClass}>
            Register Product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <OrgMetricCard
          label="At risk"
          value={isLoading ? '…' : String(atRiskCount)}
          hint="Projects needing action"
          valueClassName="text-destructive"
        />
        <OrgMetricCard
          label="Healthy"
          value={isLoading ? '…' : String(healthyCount)}
          hint="Within recovery band"
          valueClassName="text-success"
        />
        <OrgMetricCard
          label="Open signals"
          value={isLoading ? '…' : String(openSignals)}
          hint="Weak + escalating"
          valueClassName="text-info"
        />
        <OrgMetricCard
          label="Memory hits"
          value={isLoading ? '…' : String(memoryHits)}
          hint="Historical matches"
          valueClassName="text-magic"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-3 rounded-[14px] border border-border bg-card p-12 text-sm font-mono text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span>Loading projects from backend database...</span>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-[14px] border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          <p className="font-bold">Failed to load projects</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-[14px] border border-border bg-card p-12 text-center">
          <p className="text-sm font-bold text-foreground">No projects registered yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Register your first product to begin failure risk analysis. Try starting with a PRD and telemetry pack.
          </p>
          <Link href="/register" className={`${orgPrimaryBtnClass} mt-4`}>
            Register Product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {projects.map((p) => (
            <OrgInsightCard
              key={p.id}
              title={`${shortCode(p.codeName)}  ·  ${p.industry || p.name}`}
              body={`${p.failureRisk}% risk  ·  ${p.predictedNextFailure || 'No prediction yet.'}`}
              footer={<OrgStatusPill tone={projectTone(p.health)}>{projectBadge(p.health)}</OrgStatusPill>}
              onClick={() => {
                setProject(p);
                router.push(`/projects/${p.id}/overview`);
              }}
            />
          ))}
        </div>
      )}
    </OrgShell>
  );
}
