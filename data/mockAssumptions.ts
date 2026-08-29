import { AssumptionInvestigation } from '@/types';

export const mockAssumptions: Record<string, AssumptionInvestigation> = {
  pricing: {
    id: 'assump-01',
    projectId: 'aurora',
    assumptionText: 'Our adoption problem is mainly caused by pricing.',
    status: 'CHALLENGED',
    confidence: 91,
    teamBelief: 'Leadership hypothesized that customers find the $29/seat pricing tier excessive for early-stage features, causing trial drop-off.',
    evidenceMetrics: [
      { label: 'Pricing-related Complaints', value: '8%', percentage: 8, isContradiction: true },
      { label: 'Onboarding & Setup Complaints', value: '76%', percentage: 76, isContradiction: false },
      { label: 'Signup Flow Abandonment', value: '43%', percentage: 43, isContradiction: false },
      { label: 'Trial Activation Decline', value: '41%', percentage: 41, isContradiction: false },
    ],
    findingSummary: 'Current cross-source evidence strongly contradicts the pricing hypothesis. 76% of churned users never completed bank verification, and only 8% ever mentioned cost in exit interviews.',
    alternativeExplanation: 'The primary bottleneck is a 7-step onboarding flow requiring manual bank account verification before allowing users to test dashboard features. Users abandon before discovering value.',
    evidenceSources: ['customer_feedback.csv', 'product_metrics.csv', 'Cohort Pricing Survey #4'],
  },
  velocity: {
    id: 'assump-02',
    projectId: 'aurora',
    assumptionText: 'We need to hire 3 more backend developers to speed up feature delivery.',
    status: 'CHALLENGED',
    confidence: 88,
    teamBelief: 'Management believes engineering output is strictly bottlenecked by engineering headcount.',
    evidenceMetrics: [
      { label: 'CI/CD Flaky Pipeline Downtime', value: '28.6%', percentage: 29, isContradiction: false },
      { label: 'PR Review Latency (Idle Wait)', value: '3.4 days', percentage: 72, isContradiction: false },
      { label: 'Active Coding Time', value: '22%', percentage: 22, isContradiction: true },
      { label: 'Context Switching Deficit', value: '4.2 tasks/day', percentage: 84, isContradiction: false },
    ],
    findingSummary: 'Adding developers to an unstable pipeline will increase PR queue depth and merge conflicts, worsening delivery rather than accelerating it (Brooks\' Law).',
    alternativeExplanation: 'The bottleneck is developer unblock time: 78% of sprint delay is spent waiting on flaky automated builds, manual schema rollbacks, and delayed PR reviews.',
    evidenceSources: ['engineering_metrics.csv', 'team_operations.csv', 'Postmortem INC-402'],
  },
};

export const investigateAssumption = (query: string): AssumptionInvestigation => {
  const lower = query.toLowerCase();
  if (lower.includes('hire') || lower.includes('developer') || lower.includes('engineer') || lower.includes('headcount')) {
    return mockAssumptions.velocity;
  }
  return mockAssumptions.pricing;
};
