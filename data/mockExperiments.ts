/** DEV-ONLY fixture. Not imported by production routes or pages. */
import { Experiment } from '@/types';

export const mockExperiments: Experiment[] = [
  {
    id: 'exp-01',
    projectId: 'aurora',
    interventionId: 'int-02',
    hypothesis: 'Replacing mandatory upfront bank verification with a 3-step progressive onboarding sandbox will lift user activation above 60%.',
    controlGroup: '50 new trial signups routed to existing 7-step onboarding flow requiring upfront Plaid KYC link.',
    treatmentGroup: '50 new trial signups routed to new 3-step progressive sandbox with pre-loaded mock ledger data.',
    duration: '14 Days (Simulated Cohort)',
    successMetric: 'Cohort Activation Rate > 60% (Defined as creating first expense report or inviting a team member)',
    status: 'COMPLETED',
    baselineMetric: 31,
    currentMetric: 64,
    treatmentMetric: 64,
    improvementDelta: 33,
    evidenceStrength: 94,
    observedOutcome: 'Activation rate increased from 31% in the control cohort to 64% in the treatment cohort (+33 percentage points lift, p < 0.001). Signup drop-off dropped from 43% to 11%.',
    aiInterpretation: 'The empirical outcome supports the hypothesis with 94% statistical confidence. Streamlining time-to-first-value eliminated the primary customer drop-off barrier without affecting downstream compliance completion rates.',
  },
];
