'use client';

import React, { useState } from 'react';
import {
  FileSearch,
  Activity,
  Dna,
  Scale,
  Database,
  Radar,
  Lightbulb,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStage {
  id: string;
  stepNumber: string;
  title: string;
  shortDesc: string;
  detail: string;
  icon: React.ElementType;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'evidence',
    stepNumber: '01',
    title: 'Project Evidence',
    shortDesc: 'Ingest PRDs, Jira, customer feedback, and CI/CD logs into an encrypted project enclave.',
    detail: 'Parses unstructured and structured documents, extracting granular statements with deterministic sentence & page provenance.',
    icon: FileSearch,
  },
  {
    id: 'signals',
    stepNumber: '02',
    title: 'Signals & Patterns',
    shortDesc: 'Extract weak failure indicators and metric changes from across cross-functional silos.',
    detail: 'Identifies non-obvious correlations such as developer overtime spikes preceding test failure escalations.',
    icon: Activity,
  },
  {
    id: 'dna',
    stepNumber: '03',
    title: 'Failure DNA',
    shortDesc: 'Calculate multi-dimensional risk fingerprints across 8 organizational dimensions.',
    detail: 'Evaluates Technical, Operational, Adoption, Execution, and Team dimensions without manufacturing artificial doom.',
    icon: Dna,
  },
  {
    id: 'truth',
    stepNumber: '04',
    title: 'Truth Validation',
    shortDesc: 'Cross-examine internal team beliefs against grounded multi-source evidence.',
    detail: 'Prevents organizational blindspots by challenging subjective opinions before launch milestones harden.',
    icon: Scale,
  },
  {
    id: 'historical',
    stepNumber: '05',
    title: 'Historical Intelligence',
    shortDesc: 'Match current failure trajectories against sanitized global and org case histories.',
    detail: 'Retrieves similar historical products, what went wrong, and the exact interventions that turned them around.',
    icon: Database,
  },
  {
    id: 'radar',
    stepNumber: '06',
    title: 'Failure Radar',
    shortDesc: 'Forecast the potential next failure milestone with explainable causal links.',
    detail: 'Provides executive health velocity, confidence scores, and plain-English "Why?" explanations.',
    icon: Radar,
  },
  {
    id: 'interventions',
    stepNumber: '07',
    title: 'Interventions',
    shortDesc: 'Prescribe high-ROI corrective actions weighted by effort, impact, and historical success.',
    detail: 'Generates prioritized playbooks designed to de-risk specific failure seeds before milestone deadlines.',
    icon: Lightbulb,
  },
  {
    id: 'learning',
    stepNumber: '08',
    title: 'Verified Learning',
    shortDesc: 'Measure empirical recovery lift and store validated outcomes in Organizational Memory.',
    detail: 'Closes the loop: experiments verify which interventions worked, making the company smarter on every release.',
    icon: CheckCircle2,
  },
];

export const WorkflowSection: React.FC = () => {
  const [activeStage, setActiveStage] = useState<string>('evidence');
  const currentStage = WORKFLOW_STAGES.find((s) => s.id === activeStage) || WORKFLOW_STAGES[0];

  return (
    <section id="workflow" className="w-full py-16 sm:py-24 bg-surface-base border-t border-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold uppercase tracking-wider">
            <span>Continuous Intelligence Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            From Fragmented Evidence to Verified Learning
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            FailureOps X connects the entire intelligence lifecycle in a closed-loop system — going far beyond basic retrieval to predict, intervene, and remember.
          </p>
        </div>

        {/* Interactive Step Navigator */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isSelected = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={cn(
                  'flex flex-col items-center text-center p-3 rounded-xl border transition-all duration-200 cursor-pointer text-left',
                  isSelected
                    ? 'bg-card border-primary ring-2 ring-primary/20 shadow-md scale-102'
                    : 'bg-card/50 border-border/70 hover:bg-card hover:border-border text-muted-foreground hover:text-foreground'
                )}
              >
                <span className="font-mono text-[10px] font-bold text-muted-foreground">
                  {stage.stepNumber}
                </span>
                <div
                  className={cn(
                    'p-2 rounded-lg my-1.5 transition-colors',
                    isSelected
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-feed text-muted-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold leading-tight line-clamp-1 text-foreground">
                  {stage.title}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Detailed Breakdown */}
        <div className="mt-8 p-6 sm:p-8 rounded-2xl bg-card border border-border shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-8 space-y-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                  STAGE {currentStage.stepNumber}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                  {currentStage.title}
                </h3>
              </div>
              <p className="text-base text-foreground font-medium">
                {currentStage.shortDesc}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {currentStage.detail}
              </p>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-center p-5 rounded-xl bg-surface-feed border border-border space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-bold">
                Why this matters
              </p>
              <p className="text-xs text-foreground leading-relaxed">
                Traditional RAG stops at answering questions. FailureOps X synthesizes evidence into durable intelligence that detects systemic failure before it impacts your customer.
              </p>
              <div className="pt-1">
                <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                  <span>Part of the continuous intelligence cycle</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
