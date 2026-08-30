'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Activity,
  Layers,
  Dna,
  History,
  Radar,
  Compass,
  Lightbulb,
  FlaskConical,
  CheckCircle2,
  Database,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface IntelligencePipelineProps {
  currentStage?: string;
  projectId?: string;
  compact?: boolean;
}

export const IntelligencePipeline: React.FC<IntelligencePipelineProps> = ({
  currentStage = 'radar',
  projectId = 'aurora',
  compact = false,
}) => {
  const steps = [
    { id: 'evidence', label: 'Evidence', href: `/projects/${projectId}/evidence`, icon: FileText },
    { id: 'signals', label: 'Signals', href: `/projects/${projectId}/signals`, icon: Activity },
    { id: 'patterns', label: 'Patterns', href: `/projects/${projectId}/causal`, icon: Layers },
    { id: 'dna', label: 'Failure DNA', href: `/projects/${projectId}/dna`, icon: Dna },
    { id: 'memory-search', label: 'Historical Memory', href: `/historical/atlas`, icon: History },
    { id: 'radar', label: 'Failure Radar', href: `/projects/${projectId}/radar`, icon: Radar },
    { id: 'prediction', label: 'Prediction', href: `/projects/${projectId}/prediction`, icon: Compass },
    { id: 'simulation', label: 'Simulation', href: `/projects/${projectId}/simulation`, icon: Sparkles },
    { id: 'interventions', label: 'Intervention', href: `/projects/${projectId}/interventions`, icon: Lightbulb },
    { id: 'experiment', label: 'Experiment', href: `/projects/${projectId}/experiment`, icon: FlaskConical },
    { id: 'outcomes', label: 'Verification', href: `/projects/${projectId}/outcomes`, icon: CheckCircle2 },
    { id: 'org-memory', label: 'Org Memory', href: `/memory`, icon: Database },
  ];

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto py-2 px-1 text-xs no-scrollbar">
        {steps.map((step, idx) => {
          const isActive = currentStage === step.id;
          const Icon = step.icon;
          return (
            <React.Fragment key={step.id}>
              <Link
                href={step.href}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary/20 border border-primary text-primary font-semibold shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{step.label}</span>
              </Link>
              {idx < steps.length - 1 && (
                <ChevronRight className="w-3 h-3 text-border shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full bg-card/60 border border-border/70 rounded-2xl p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Continuous Organizational Reasoning Loop
          </h4>
        </div>
        <span className="text-[11px] font-mono text-muted-foreground/80">
          Autonomous Reasoning Graph Active
        </span>
      </div>

      <div className="relative overflow-x-auto pb-2 pt-1 no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {steps.map((step, index) => {
            const isActive = currentStage === step.id;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <Link
                  href={step.href}
                  className={`group flex flex-col items-center justify-center p-3 rounded-xl min-w-[92px] border transition-all duration-200 ${
                    isActive
                      ? 'bg-primary/15 border-primary/60 text-primary shadow-[0_0_15px_-3px_rgba(255,122,0,0.3)]'
                      : 'bg-card border-border/80 text-muted-foreground hover:border-border hover:text-foreground hover:bg-card-hover'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 transition-colors ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-feed border border-border/60 group-hover:text-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-medium tracking-tight text-center whitespace-nowrap">
                    {step.label}
                  </span>
                  <span className="text-[9px] font-mono opacity-60 mt-0.5">
                    Step {index + 1}
                  </span>
                </Link>

                {index < steps.length - 1 && (
                  <div className="flex items-center justify-center text-border shrink-0">
                    <div className="w-3 h-0.5 bg-border" />
                    <ChevronRight className="w-3.5 h-3.5 -ml-1 text-muted-foreground/60" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
