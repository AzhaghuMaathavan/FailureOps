import { AnalysisStage } from '@/types';

export const INITIAL_ANALYSIS_STAGES: AnalysisStage[] = [
  {
    id: 'stage-1',
    name: 'Evidence Ingestion',
    description: 'Scanning uploaded PRDs, telemetry CSVs, and customer feedback logs.',
    status: 'WAITING',
    logMessages: [
      'Ingesting 5 project evidence artifacts...',
      'Verified file integrity & format checksums (MD5 validated).',
    ],
  },
  {
    id: 'stage-2',
    name: 'Evidence Normalization',
    description: 'Standardizing time horizons, cohort definitions, and semantic schemas.',
    status: 'WAITING',
    logMessages: [
      'Aligning product metrics to 4-week calendar timeline.',
      'Normalizing support sentiment vectors across 142 tickets.',
    ],
  },
  {
    id: 'stage-3',
    name: 'Signal Extraction',
    description: 'Isolating weak operational anomalies, friction spikes, and velocity drag.',
    status: 'WAITING',
    logMessages: [
      'Detected 14 onboarding-related friction observations.',
      'Extracted critical CI/CD build failure acceleration (+580%).',
    ],
  },
  {
    id: 'stage-4',
    name: 'Signal Validation',
    description: 'Cross-corroborating telemetry observations against noise thresholds.',
    status: 'WAITING',
    logMessages: [
      'Corroborated support churn tickets against drop-off step 4.',
      'Statistically validated activation drop: p < 0.001.',
    ],
  },
  {
    id: 'stage-5',
    name: 'Cross-Source Pattern Discovery',
    description: 'Connecting developer burnout, CI paralysis, and user activation collapse.',
    status: 'WAITING',
    logMessages: [
      'Cross-source pattern identified: Fragile Velocity & Scope Trap.',
      'Connected team overtime (58h) to unverified deployment regressions.',
    ],
  },
  {
    id: 'stage-6',
    name: 'Failure DNA Construction',
    description: 'Generating multi-dimensional risk vector across 6 operational axes.',
    status: 'WAITING',
    logMessages: [
      'Calculated Adoption Risk: 88% (Critical).',
      'Calculated Operational Risk: 81% (Critical).',
      'Constructed complete 6D Failure DNA profile.',
    ],
  },
  {
    id: 'stage-7',
    name: 'Historical Memory Comparison',
    description: 'Vector-matching Failure DNA against organizational case database.',
    status: 'WAITING',
    logMessages: [
      'Querying historical failure vector store (1,240 cases)...',
      'Discovered 94% similarity match with PROJECT ATLAS.',
      'Discovered 87% similarity match with PROJECT NOVA.',
    ],
  },
  {
    id: 'stage-8',
    name: 'Multi-Factor Risk Calculation',
    description: 'Aggregating cross-source signal weights and historical mortality curves.',
    status: 'WAITING',
    logMessages: [
      'Composite Organizational Failure Risk calculated at 82%.',
      'Risk trend elevated by +24% over previous 30 days.',
    ],
  },
  {
    id: 'stage-9',
    name: 'Failure Trajectory Prediction',
    description: 'Forecasting most probable failure horizon and causal cascade.',
    status: 'WAITING',
    logMessages: [
      'Forecasted Next Failure: Missed Beta Release (86% confidence).',
      'Identified critical zero-slack path in October 15 delivery milestone.',
    ],
  },
  {
    id: 'stage-10',
    name: 'Intervention Generation',
    description: 'Synthesizing evidence-backed recovery playbooks from historical successes.',
    status: 'WAITING',
    logMessages: [
      'Synthesized Intervention: 5-Day Pipeline Freeze & Onboarding Redesign.',
      'Validated 75% historical success rate across 4 identical scenarios.',
      'Analysis pipeline complete. Generating executive intelligence dashboard.',
    ],
  },
];
