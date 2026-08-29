'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Lightbulb, History, Sparkles, CheckCircle2 } from 'lucide-react';
import { mockInterventions } from '@/data/mockInterventions';
import { InterventionCard } from '@/components/intervention/InterventionCard';

export default function InterventionsPage() {
  const params = useParams();
  const projectId = (params?.id as string) || 'aurora';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary">
              Evidence-Backed Prescriptions
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Validated Solutions
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight mt-1">
            Intervention & Solution Engine
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Empirically grounded recovery playbooks derived from successful interventions in historically identical failure cases.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span>Historical Proof Rate: 75%+</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockInterventions.map(int => (
          <InterventionCard key={int.id} intervention={int} />
        ))}
      </div>
    </div>
  );
}
