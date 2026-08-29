import { FailureDNA } from '@/types';

export const mockFailureDNA: Record<string, FailureDNA> = {
  aurora: {
    projectId: 'aurora',
    overallRisk: 82,
    dominantArchetype: 'The Premature Scope & Fragile Velocity Trap',
    generatedAt: '2026-08-29T10:14:00Z',
    dimensions: [
      {
        dimension: 'Adoption',
        score: 88,
        severity: 'CRITICAL',
        primaryDrivers: [
          'Activation decline from 72% to 31%',
          'Signup abandonment rate spiking to 43%',
          'Onboarding setup friction generating 76% of support volume',
        ],
        evidenceConfidence: 98,
        historicalCorrelation: 'Matches 94% of pre-launch B2B SaaS failure trajectories',
        whyExplanation: 'Severe friction during initial user journey is causing steep drop-offs before users can experience core value. Although marketing and signups remain steady, the product is losing 69% of acquired users before first action.',
      },
      {
        dimension: 'Operational',
        score: 81,
        severity: 'CRITICAL',
        primaryDrivers: [
          'Team working 58 hours/week average with 42% overtime',
          'PR review latency expanded to 3.4 days',
          'Context-switching across 7 disparate integration initiatives',
        ],
        evidenceConfidence: 92,
        historicalCorrelation: 'Precedes burnout and velocity stalls in 82% of similar scale-ups',
        whyExplanation: 'The engineering team is saturated and operating under acute cognitive debt. Engineers are cutting review depth to meet artificial delivery dates, causing secondary defect waves.',
      },
      {
        dimension: 'Execution',
        score: 79,
        severity: 'WARNING',
        primaryDrivers: [
          'Scope increased by 7 complex ERP integrations without deadline buffer',
          'Release velocity slowed by 38% due to regression fixes',
          'October 15 launch date remains fixed despite 3-week backlog deficit',
        ],
        evidenceConfidence: 89,
        historicalCorrelation: 'Common precursor to missed beta releases and rushed stabilization',
        whyExplanation: 'Execution planning reflects an asymmetric commitments-to-capacity ratio. Critical paths have zero slack, meaning any further pipeline failure directly pushes the public launch.',
      },
      {
        dimension: 'Customer',
        score: 72,
        severity: 'WARNING',
        primaryDrivers: [
          'Early trial cancellation rate doubled in 3 weeks',
          'Qualitative feedback reveals frustration with invitation acceptance',
          'NPS dropped from +34 to -12 among onboarded beta cohort',
        ],
        evidenceConfidence: 94,
        historicalCorrelation: 'Aligns with negative word-of-mouth seeds in early-adopter communities',
        whyExplanation: 'Customer trust is deteriorating during the most critical impression window. Customers who encounter deadlocks or permission bugs during setup do not return for follow-up testing.',
      },
      {
        dimension: 'Technical',
        score: 63,
        severity: 'WARNING',
        primaryDrivers: [
          'Deployment failure rate reached 28.6%',
          'Unresolved P1/P2 bug count increased by 311%',
          'Database deadlocks during parallel tenant provisioning',
        ],
        evidenceConfidence: 96,
        historicalCorrelation: 'Frequently observed 2 to 4 weeks prior to major production outages',
        whyExplanation: 'Technical foundations are destabilizing under rapid schema changes. The automated test suite is partially quarantined, leaving critical workflows unverified during build pipelines.',
      },
      {
        dimension: 'Financial',
        score: 54,
        severity: 'HEALTHY',
        primaryDrivers: [
          '18 months of venture runway currently intact',
          'Pricing resistance is statistically minimal (only 8% cite pricing)',
          'Customer acquisition cost remains within initial budget envelope',
        ],
        evidenceConfidence: 91,
        historicalCorrelation: 'Healthy capital reserves provide an 8-week recovery window',
        whyExplanation: 'Financial sustainability is not the imminent threat. Capital is sufficient to pivot or stabilize, but burning runway while acquiring non-activating users will compound future CAC.',
      },
    ],
  },
};

export const getFailureDNA = (projectId: string): FailureDNA => {
  return mockFailureDNA[projectId] || mockFailureDNA['aurora'];
};
