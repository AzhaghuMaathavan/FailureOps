'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  AlertTriangle,
  Flame,
  CheckCircle2,
  PlusCircle,
  ArrowUpRight,
  TrendingUp,
  Compass,
  Database,
  History,
  Shield,
  Activity,
  Sparkles,
} from 'lucide-react';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { TopHeader } from '@/components/layout/TopHeader';
import { StatCard } from '@/components/common/StatCard';
import { RiskBadge } from '@/components/common/RiskBadge';
import { PrivacyBadge } from '@/components/common/PrivacyBadge';
import { apiClient } from '@/lib/api/client';
import { Project } from '@/types';
import { useApp } from '@/context/AppContext';

export default function GlobalDashboardPage() {
  const router = useRouter();
  const { setProject } = useApp();
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    apiClient.getProjects()
      .then(data => {
        if (mounted) {
          setProjects(data || []);
          setIsLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to load projects');
          setIsLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const atRiskCount = projects.filter(p => p.health === 'CRITICAL' || p.health === 'AT_RISK').length;
  const emergingSeeds = projects.reduce((sum, p) => sum + Number(p.activeFailureSeedsCount || 0), 0);
  const predictedCount = projects.filter((p) => {
    const label = String(p.predictedNextFailure || '');
    return label.length > 0 && !/awaiting|insufficient|no failure predicted/i.test(label);
  }).length;
  const analyzedCount = projects.filter((p) => Boolean(p.lastAnalyzedAt) && p.lastAnalyzedAt !== 'Never').length;


  return (
    <div className="min-h-screen flex w-full bg-background text-foreground">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Header Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-card border border-border/80 p-1.5 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(255,122,0,0.3)]">
                <img src="/logo.png" alt="FailureOps X" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight">
                    Organizational Intelligence
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/30">
                    Live Enclave
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time cross-project telemetry reasoning, emergent failure seeds, and institutional recovery memory.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(255,122,0,0.4)]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Product</span>
              </Link>
            </div>
          </div>

          {/* Key Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard
              label="Active Projects"
              value={isLoading ? "..." : String(projects.length)}
              subtext="Monitored in Enclave"
              icon={Building2}
            />
            <StatCard
              label="Projects at Risk"
              value={isLoading ? "..." : String(atRiskCount)}
              trend={projects.length > 0 ? `${Math.round((atRiskCount / projects.length) * 100)}% of Portfolio` : "0%"}
              isRiskTrend
              trendDirection="up"
              icon={AlertTriangle}
              accentColor="text-rose-400"
            />
            <StatCard
              label="Emerging Seeds"
              value={isLoading ? "..." : String(emergingSeeds)}
              subtext="From completed analyses"
              icon={Flame}
              accentColor="text-amber-400"
            />
            <StatCard
              label="Predicted Failures"
              value={isLoading ? "..." : String(predictedCount)}
              subtext="Backend predictions only"
              icon={Compass}
              accentColor="text-purple-400"
            />
            <StatCard
              label="Analyzed Projects"
              value={isLoading ? "..." : String(analyzedCount)}
              subtext="Completed RAG analysis"
              icon={CheckCircle2}
              accentColor="text-emerald-400"
            />
          </div>

          {/* Active Projects Portfolio Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground tracking-tight">
                  Active Monitored Projects
                </h2>
                <p className="text-xs text-muted-foreground">
                  Continuous multi-dimensional risk scores based on uploaded evidence
                </p>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                Showing {projects.length} Active Enclaves
              </span>
            </div>

            {isLoading ? (
              <div className="p-12 rounded-2xl bg-card border border-border flex items-center justify-center">
                <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading projects from backend database...</span>
                </div>
              </div>
            ) : error ? (
              <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
                <p className="font-bold">Failed to load projects</p>
                <p className="text-xs mt-1 text-rose-400">{error}</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="p-12 rounded-2xl bg-card border border-border text-center">
                <p className="text-sm font-bold text-foreground">No projects registered yet</p>
                <p className="text-xs text-muted-foreground mt-1">Register your first product to begin failure risk analysis</p>
                <Link href="/register" className="inline-block mt-4 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl">
                  Register Product
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projects.map(p => {
                  const isCritical = p.health === 'CRITICAL';
                  const isAtRisk = p.health === 'AT_RISK';

                  return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setProject(p);
                      router.push(`/projects/${p.id}/overview`);
                    }}
                    className="p-6 rounded-2xl bg-card border border-border/80 hover:border-primary/50 hover:bg-card-hover transition-all duration-200 cursor-pointer shadow-sm flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar with badges */}
                      <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-border/50">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                          {p.codeName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <PrivacyBadge level={p.privacyLevel} />
                          <RiskBadge level={p.health} />
                        </div>
                      </div>

                      {/* Title & Company */}
                      <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{p.name}</span>
                        <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                      </h3>
                      <span className="text-xs text-muted-foreground font-medium block mt-0.5">
                        {p.company} • {p.industry}
                      </span>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                        {p.description}
                      </p>

                      {/* Risk Scores Grid */}
                      <div className="grid grid-cols-2 gap-3 mt-4 p-3 rounded-xl bg-surface-feed/70 border border-border/60">
                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                            Failure Risk
                          </span>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span
                              className={`text-2xl font-extrabold font-mono ${
                                isCritical
                                  ? 'text-rose-400'
                                  : isAtRisk
                                  ? 'text-amber-400'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {p.failureRisk}%
                            </span>
                            <span className="text-[10px] font-mono text-rose-400 font-semibold">
                              {p.riskTrend}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className="text-[10px] font-mono text-muted-foreground uppercase block">
                            Hist. Match
                          </span>
                          <span className="text-lg font-bold font-mono text-purple-400 mt-1 block">
                            {p.historicalSimilarity}%
                          </span>
                        </div>
                      </div>

                      {/* Predicted Failure Banner */}
                      <div className="mt-4 p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs">
                        <span className="text-[10px] font-mono text-primary uppercase font-bold block mb-0.5">
                          Most Probable Next Failure:
                        </span>
                        <p className="font-bold text-foreground truncate">
                          {p.predictedNextFailure}
                        </p>
                        <span className="text-[10px] text-muted-foreground font-mono mt-1 block">
                          Prediction Confidence: {p.predictionConfidence}%
                        </span>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="text-[11px] font-mono">
                        {p.sourcesUploaded.length} Sources Analyzed
                      </span>
                      <span className="text-primary text-xs font-semibold group-hover:underline">
                        Open Project Intelligence →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>


          {/* Quick Deep Link into Demo Flow */}
          <div className="p-6 rounded-2xl bg-surface-feed border border-border/80 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Featured Hackathon Investigation: Project Aurora</h4>
                <p className="text-xs text-muted-foreground">
                  ExpenseTracker is exhibiting an 82% risk trajectory toward missing its beta milestone due to onboarding friction and flaky CI pipelines.
                </p>
              </div>
            </div>

            <Link
              href="/projects/aurora/overview"
              className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold tracking-wide uppercase transition-all shrink-0 shadow-sm"
            >
              Examine Aurora Briefing
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
