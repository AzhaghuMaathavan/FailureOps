'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlusCircle,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowRight,
  Activity,
  Radar,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Server,
  Brain,
  HeartPulse,
  Landmark,
  Terminal,
  Clock,
  FileText,
  Loader2,
  X,
  Compass,
} from 'lucide-react';
import { OrgShell } from '@/components/layout/OrgShell';
import { apiClient } from '@/lib/api/client';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';
import { RiskBadge } from '@/components/common/RiskBadge';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';

function getIndustryIcon(industry?: string) {
  const ind = (industry || '').toLowerCase();
  if (ind.includes('ai') || ind.includes('ml')) return Brain;
  if (ind.includes('health') || ind.includes('care')) return HeartPulse;
  if (ind.includes('fintech') || ind.includes('finance') || ind.includes('bank')) return Landmark;
  if (ind.includes('dev') || ind.includes('tool')) return Terminal;
  return Server;
}

function shortCode(codeName: string): string {
  return codeName.replace(/^PROJECT\s+/i, '').trim() || codeName;
}

export default function GlobalDashboardPage() {
  const router = useRouter();
  const { setProject } = useApp();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'CRITICAL' | 'AT_RISK' | 'HEALTHY'>('ALL');
  const [industryFilter, setIndustryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'risk_desc' | 'risk_asc' | 'signals_desc' | 'name_asc'>('risk_desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
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

  // Compute aggregate fleet metrics
  const criticalCount = useMemo(() => projects.filter((p) => p.health === 'CRITICAL' || p.failureRisk >= 60).length, [projects]);
  const watchCount = useMemo(() => projects.filter((p) => p.health === 'AT_RISK' || (p.failureRisk >= 30 && p.failureRisk < 60)).length, [projects]);
  const healthyCount = useMemo(() => projects.filter((p) => p.health === 'HEALTHY' && p.failureRisk < 30).length, [projects]);
  const totalSignals = useMemo(() => projects.reduce((sum, p) => sum + Number(p.activeFailureSeedsCount || 0), 0), [projects]);
  const totalMemoryHits = useMemo(() => projects.filter((p) => Number(p.historicalSimilarity || 0) > 0).length, [projects]);

  // Unique industries
  const industries = useMemo(() => {
    const set = new Set<string>();
    projects.forEach((p) => {
      if (p.industry) set.add(p.industry);
    });
    return Array.from(set);
  }, [projects]);

  // Filter & Sort Logic
  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        if (healthFilter === 'CRITICAL') return p.health === 'CRITICAL' || p.failureRisk >= 60;
        if (healthFilter === 'AT_RISK') return p.health === 'AT_RISK' || (p.failureRisk >= 30 && p.failureRisk < 60);
        if (healthFilter === 'HEALTHY') return p.health === 'HEALTHY' && p.failureRisk < 30;
        return true;
      })
      .filter((p) => {
        if (industryFilter === 'ALL') return true;
        return (p.industry || '').toLowerCase() === industryFilter.toLowerCase();
      })
      .filter((p) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.codeName && p.codeName.toLowerCase().includes(q)) ||
          (p.industry && p.industry.toLowerCase().includes(q)) ||
          (p.stage && p.stage.toLowerCase().includes(q)) ||
          (p.predictedNextFailure && p.predictedNextFailure.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'risk_desc') return (b.failureRisk || 0) - (a.failureRisk || 0);
        if (sortBy === 'risk_asc') return (a.failureRisk || 0) - (b.failureRisk || 0);
        if (sortBy === 'signals_desc') return (b.activeFailureSeedsCount || 0) - (a.activeFailureSeedsCount || 0);
        if (sortBy === 'name_asc') return (a.name || a.codeName).localeCompare(b.name || b.codeName);
        return 0;
      });
  }, [projects, healthFilter, industryFilter, searchQuery, sortBy]);

  const handleSelectProject = (p: Project, targetPath = '/overview') => {
    setProject(p);
    router.push(`/projects/${p.id}${targetPath}`);
  };

  return (
    <OrgShell>
      {/* 1. Header & Live Status */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-primary">
              ORGANIZATIONAL INTELLIGENCE FLEET
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 border border-success/30 text-success text-[10px] font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              Live Telemetry Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Live Enclave Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Continuous cross-project observability, emergent failure seeds, telemetry regressions, and organizational recovery memory.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-primary-glow transition-all hover:bg-primary-hover hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PlusCircle className="w-4 h-4" aria-hidden="true" />
            <span>Register Product</span>
          </Link>
        </div>
      </div>

      {/* 2. Interactive KPI Fleet Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* At Risk Projects */}
        <button
          type="button"
          onClick={() => setHealthFilter(healthFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL')}
          className={`flex flex-col gap-2 rounded-2xl border p-4 sm:p-5 text-left transition-all cursor-pointer shadow-sm ${
            healthFilter === 'CRITICAL'
              ? 'bg-destructive/10 border-destructive ring-2 ring-destructive/30'
              : 'bg-card border-border hover:border-destructive/40 hover:bg-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Critical / Sev-1
            </span>
            <AlertTriangle className="w-4 h-4 text-destructive" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-destructive">
              {isLoading ? '…' : criticalCount}
            </span>
            <span className="text-[11px] text-muted-foreground">projects</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {criticalCount > 0 ? 'Action required immediately' : 'No critical Sev-1 escalations'}
          </p>
        </button>

        {/* Watchlist */}
        <button
          type="button"
          onClick={() => setHealthFilter(healthFilter === 'AT_RISK' ? 'ALL' : 'AT_RISK')}
          className={`flex flex-col gap-2 rounded-2xl border p-4 sm:p-5 text-left transition-all cursor-pointer shadow-sm ${
            healthFilter === 'AT_RISK'
              ? 'bg-warning/10 border-warning ring-2 ring-warning/30'
              : 'bg-card border-border hover:border-warning/40 hover:bg-card-hover'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Watchlist / Moderate
            </span>
            <TrendingUp className="w-4 h-4 text-warning" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-warning">
              {isLoading ? '…' : watchCount}
            </span>
            <span className="text-[11px] text-muted-foreground">projects</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Emerging risks under observation</p>
        </button>

        {/* Open Signals */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Live Signals Stream
            </span>
            <Activity className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-primary">
              {isLoading ? '…' : totalSignals}
            </span>
            <span className="text-[11px] text-muted-foreground">detected</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Cross-source anomalies & metrics</p>
        </div>

        {/* Memory Matches */}
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Memory Hits
            </span>
            <ShieldCheck className="w-4 h-4 text-success" aria-hidden="true" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black font-mono text-success">
              {isLoading ? '…' : totalMemoryHits}
            </span>
            <span className="text-[11px] text-muted-foreground">twins</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Historical failure twins matched</p>
        </div>
      </div>

      {/* 3. Fleet Risk Distribution Bar */}
      {projects.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold uppercase text-[11px] text-muted-foreground">
              Fleet Health Distribution ({projects.length} Total Projects)
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-destructive" />
                <span>Critical: {criticalCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-warning" />
                <span>Watchlist: {watchCount}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                <span>Healthy: {healthyCount}</span>
              </span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-surface-feed overflow-hidden flex gap-0.5">
            <div
              style={{ width: `${(criticalCount / Math.max(1, projects.length)) * 100}%` }}
              className="h-full bg-destructive transition-all duration-500"
              title={`Critical: ${criticalCount}`}
            />
            <div
              style={{ width: `${(watchCount / Math.max(1, projects.length)) * 100}%` }}
              className="h-full bg-warning transition-all duration-500"
              title={`Watchlist: ${watchCount}`}
            />
            <div
              style={{ width: `${(healthyCount / Math.max(1, projects.length)) * 100}%` }}
              className="h-full bg-success transition-all duration-500"
              title={`Healthy: ${healthyCount}`}
            />
          </div>
        </div>
      )}

      {/* 4. Controls & Filters Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between bg-card/60 p-3.5 rounded-2xl border border-border">
        {/* Search Input */}
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects, domains, failure modes..."
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-feed border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Pills & Selectors */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Health Filter Pills */}
          <div className="inline-flex rounded-xl bg-surface-feed p-1 border border-border text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setHealthFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                healthFilter === 'ALL' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                healthFilter === 'CRITICAL' ? 'bg-destructive text-white shadow-sm' : 'text-muted-foreground hover:text-destructive'
              }`}
            >
              Sev-1 ({criticalCount})
            </button>
            <button
              type="button"
              onClick={() => setHealthFilter('AT_RISK')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                healthFilter === 'AT_RISK' ? 'bg-warning text-black shadow-sm' : 'text-muted-foreground hover:text-warning'
              }`}
            >
              Watch ({watchCount})
            </button>
          </div>

          {/* Industry Filter Dropdown */}
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-surface-feed border border-border text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Filter by industry"
          >
            <option value="ALL">All Industries</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 rounded-xl bg-surface-feed border border-border text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Sort projects"
          >
            <option value="risk_desc">Highest Risk</option>
            <option value="risk_asc">Lowest Risk</option>
            <option value="signals_desc">Most Signals</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>

          {/* View Toggle */}
          <div className="hidden sm:inline-flex rounded-xl bg-surface-feed p-1 border border-border">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-16 text-sm font-mono text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary motion-reduce:animate-none" aria-hidden="true" />
          <span>Synchronizing organizational intelligence fleet...</span>
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-sm text-destructive">
          <p className="font-bold">Failed to load project intelligence</p>
          <p className="mt-1 text-xs">{error}</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-16 text-center space-y-3">
          <p className="text-base font-bold text-foreground">No projects match the selected filters</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Try adjusting your search query or switching filter tabs to view other projects in the enclave fleet.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setHealthFilter('ALL');
              setIndustryFilter('ALL');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-feed hover:bg-card border border-border text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Matrix View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredProjects.map((p) => {
            const IndustryIcon = getIndustryIcon(p.industry);
            const risk = p.failureRisk || 0;
            const riskColor = risk >= 60 ? 'text-destructive' : risk >= 30 ? 'text-warning' : 'text-success';
            const riskBg = risk >= 60 ? 'bg-destructive' : risk >= 30 ? 'bg-warning' : 'bg-success';

            return (
              <article
                key={p.id}
                className="group relative bg-card rounded-2xl border border-border p-5 shadow-sm transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Industry Icon, Domain, Stage, Risk Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-2 rounded-xl bg-surface-feed border border-border text-primary shrink-0">
                        <IndustryIcon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground block truncate">
                          {p.industry || 'Technology'}
                        </span>
                        <h3 className="font-mono font-bold text-foreground text-sm tracking-tight truncate">
                          {shortCode(p.codeName)}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <RiskBadge level={p.health} />
                    </div>
                  </div>

                  {/* Product Display Name & Stage */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-feed text-muted-foreground border border-border shrink-0">
                      {p.stage || 'Production'}
                    </span>
                  </div>

                  {/* Failure Risk Gauge */}
                  <div className="bg-surface-feed/70 p-3 rounded-xl border border-border/80 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                        Failure Probability
                      </span>
                      <span className={`font-mono font-bold ${riskColor}`}>
                        {risk}% <span className="text-muted-foreground font-normal">/ 100</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
                      <div
                        style={{ width: `${Math.max(4, risk)}%` }}
                        className={`h-full ${riskBg} transition-all duration-300`}
                      />
                    </div>
                  </div>

                  {/* Predicted Next Failure Mode */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-muted-foreground uppercase">
                      <Compass className="w-3 h-3 text-primary shrink-0" />
                      <span>Predicted Failure Seed</span>
                    </div>
                    <p className="text-xs text-foreground font-medium leading-snug line-clamp-2">
                      {p.predictedNextFailure || 'Awaiting multi-source telemetry analysis'}
                    </p>
                  </div>

                  {/* Telemetry Stats Strip */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center font-mono text-[10px]">
                    <div className="bg-surface-feed p-2 rounded-lg border border-border/50">
                      <span className="text-muted-foreground block text-[9px] uppercase">Signals</span>
                      <span className="font-bold text-foreground">{p.activeFailureSeedsCount || 0}</span>
                    </div>
                    <div className="bg-surface-feed p-2 rounded-lg border border-border/50">
                      <span className="text-muted-foreground block text-[9px] uppercase">Sources</span>
                      <span className="font-bold text-foreground">{(p.sourcesUploaded || []).length || 1}</span>
                    </div>
                    <div className="bg-surface-feed p-2 rounded-lg border border-border/50">
                      <span className="text-muted-foreground block text-[9px] uppercase">Twin Match</span>
                      <span className="font-bold text-primary">{p.historicalSimilarity || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <PrivacyBadge level={p.privacyLevel || 'ORGANIZATION'} />
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectProject(p, '/radar')}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-feed transition-colors cursor-pointer"
                      title="View Failure DNA Radar"
                    >
                      Radar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectProject(p, '/overview')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-bold transition-colors cursor-pointer shadow-sm"
                    >
                      <span>Explore</span>
                      <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* High-Density Operational Table View */
        <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-feed/70 font-mono text-[10px] text-muted-foreground uppercase">
                <th className="py-3 px-4 font-bold">Project</th>
                <th className="py-3 px-4 font-bold">Domain & Stage</th>
                <th className="py-3 px-4 font-bold">Risk Score</th>
                <th className="py-3 px-4 font-bold">Predicted Failure Mode</th>
                <th className="py-3 px-4 font-bold text-center">Signals</th>
                <th className="py-3 px-4 font-bold text-center">Twin Match</th>
                <th className="py-3 px-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProjects.map((p) => {
                const IndustryIcon = getIndustryIcon(p.industry);
                const risk = p.failureRisk || 0;
                const riskColor = risk >= 60 ? 'text-destructive' : risk >= 30 ? 'text-warning' : 'text-success';

                return (
                  <tr key={p.id} className="hover:bg-surface-feed/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-surface-feed text-primary shrink-0 border border-border">
                          <IndustryIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="font-bold text-foreground block">{shortCode(p.codeName)}</span>
                          <span className="text-[11px] text-muted-foreground block">{p.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-foreground block">{p.industry || 'Technology'}</span>
                      <span className="text-muted-foreground block text-[10px]">{p.stage || 'Production'}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${riskColor}`}>{risk}%</span>
                        <RiskBadge level={p.health} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-muted-foreground" title={p.predictedNextFailure}>
                      {p.predictedNextFailure || 'Awaiting analysis'}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-foreground">
                      {p.activeFailureSeedsCount || 0}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-center text-primary">
                      {p.historicalSimilarity || 0}%
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelectProject(p, '/overview')}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-feed hover:bg-card border border-border text-foreground font-semibold text-xs transition-colors cursor-pointer"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3 text-primary" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </OrgShell>
  );
}
