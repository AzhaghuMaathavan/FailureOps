'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FlaskConical, ArrowRight, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { ExperimentWidget } from '@/components/intervention/ExperimentWidget';

export default function ExperimentPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';
  const [experiments, setExperiments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExperiments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.getExperiments(projectId);
      const list = res?.experiments || (Array.isArray(res) ? res : []);
      setExperiments(list);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve experiment registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="p-16 rounded-2xl bg-card border border-border flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground font-mono text-sm">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span>Loading project experiments from backend...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
        <p className="font-bold">Unable to Load Experiments</p>
        <p className="text-xs mt-1 text-rose-400">{error}</p>
        <button
          onClick={fetchExperiments}
          className="mt-3 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-xs font-mono text-rose-200 border border-rose-500/40 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Empirical Experimentation
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {experiments.length} Active Experiment{experiments.length === 1 ? '' : 's'}
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Intervention Experiment Runner
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Test prescribed recovery interventions against control baselines with empirical metric verification.
          </p>
        </div>

        <Link
          href={`/projects/${projectId}/outcomes`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm"
        >
          <span>Verify Outcomes</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {experiments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <FlaskConical className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
          <p className="text-base font-bold text-foreground">No Active Experiments Configured Yet</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
            Run project analysis to identify failure patterns and synthesize evidence-backed interventions with testable experiment cohorts.
          </p>
          <Link
            href={`/projects/${projectId}/analysis`}
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
          >
            Run Project Analysis
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {experiments.map((exp: any) => (
            <ExperimentWidget
              key={exp.id || exp.experiment_id}
              experiment={exp}
              projectId={projectId}
              onRefresh={fetchExperiments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
