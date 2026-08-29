import { HistoricalCase } from '@/types';

export const mockHistoricalCases: HistoricalCase[] = [
  {
    id: 'atlas',
    name: 'PROJECT ATLAS',
    companyAlias: 'Atlas Corp (FinTech Suite)',
    industry: 'FinTech / Expense Management',
    productDescription: 'SMB expense card and automated receipts ingestion platform targeting mid-tier retail businesses.',
    similarity: 94,
    outcome: 'Initially failed Q3 adoption milestone; recovered after radical onboarding redesign.',
    outcomeType: 'RECOVERED',
    primaryFailurePattern: 'Critical Onboarding Friction & Verification Gate',
    historicalIntervention: 'Replaced 7-step mandatory compliance gate with a 3-step progressive onboarding flow and deferred Plaid sandbox verification.',
    interventionOutcome: 'User activation rate surged by +27 percentage points within 21 days; support ticket volume decreased by 64%.',
    privacyLevel: 'ANONYMOUS_LEARNING',
    timeline: [
      { step: 'Phase 1', description: 'Ambitious launch planning with mandatory upfront bank KYC verification.', date: 'Month 1' },
      { step: 'Phase 2', description: 'Onboarding drop-off exceeded 62%; customer frustration surged.', date: 'Month 2' },
      { step: 'Phase 3', description: 'Activation plummeted to 24%; sales pipeline froze.', date: 'Month 3' },
      { step: 'Phase 4', description: 'Intervention deployed: 7-step flow reduced to 3 steps with instant test sandbox.', date: 'Month 4' },
      { step: 'Phase 5', description: 'Activation rebounded to 58%, recovering trial cohort retention.', date: 'Month 5' },
    ],
    keyLessons: [
      'Never mandate complete financial compliance verification before delivering the first "Aha!" moment.',
      'Allow users to explore mock data or test sandboxes within 60 seconds of registration.',
      'Customer complaints about price are often masked proxies for frustrating onboarding friction.',
    ],
  },
  {
    id: 'nova',
    name: 'PROJECT NOVA',
    companyAlias: 'Nova Cloud Billing',
    industry: 'Enterprise SaaS / Billing',
    productDescription: 'Usage-based metering and automated invoicing engine for high-volume developer platforms.',
    similarity: 87,
    outcome: 'Near-fatal launch delay caused by runaway CI/CD deployment instability and untested edge cases.',
    outcomeType: 'RECOVERED',
    primaryFailurePattern: 'Deployment Pipeline Paralysis & Code Regression Cascade',
    historicalIntervention: 'Instituted an immediate 5-day new feature freeze, quarantined 18 flaky integration suites, and stabilized release branch.',
    interventionOutcome: 'Deployment failures dropped by -61%; mean time to recovery improved from 6.2 hours to 28 minutes.',
    privacyLevel: 'ORGANIZATION',
    timeline: [
      { step: 'Sprint 12', description: 'Accelerated feature push to meet enterprise RFP commitments.', date: 'Sprint 12' },
      { step: 'Sprint 13', description: 'Deployment failure rate touched 34%; staging was broken 4 out of 5 days.', date: 'Sprint 13' },
      { step: 'Sprint 14', description: 'Emergency intervention: Complete 5-day feature freeze enacted.', date: 'Sprint 14' },
      { step: 'Sprint 15', description: 'Pipelines green; developer cycle time improved by 40%.', date: 'Sprint 15' },
    ],
    keyLessons: [
      'Feature development on top of unstable test suites creates exponential regression debt.',
      'A short, decisive feature freeze consistently yields net positive velocity within two subsequent sprints.',
      'Automated deployment confidence is the prerequisite for reliable delivery forecasting.',
    ],
  },
  {
    id: 'sigma',
    name: 'PROJECT SIGMA',
    companyAlias: 'Sigma Ledger Labs',
    industry: 'FinTech / Bookkeeping AI',
    productDescription: 'Automated multi-entity general ledger reconciliation using LLM extraction.',
    similarity: 78,
    outcome: 'Severe team attrition and missed Q2 beta due to unconstrained scope creep.',
    outcomeType: 'FAILED',
    primaryFailurePattern: 'Asymmetric Scope Creep & Cognitive Exhaustion',
    historicalIntervention: 'Cut 4 non-essential accounting integrations and reset roadmap milestones with executive sign-off.',
    interventionOutcome: 'Prevented project cancellation; stabilized remaining team and achieved successful delayed GA.',
    privacyLevel: 'PUBLIC',
    timeline: [
      { step: 'Month 1', description: 'Product roadmap expanded from 2 integrations to 9 to appease potential prospects.', date: 'Month 1' },
      { step: 'Month 2', description: 'Engineering overtime crossed 60 hrs/week; lead architect resigned.', date: 'Month 2' },
      { step: 'Month 3', description: 'Formal intervention: 5 integrations cut; milestone pushed by 6 weeks.', date: 'Month 3' },
      { step: 'Month 4', description: 'Quality stabilized; core MVP delivered with high reliability.', date: 'Month 4' },
    ],
    keyLessons: [
      'Scope expansion without deadline flexibility is the #1 predictor of engineering turnover.',
      'De-scoping non-critical integrations is far less damaging to brand reputation than delivering a broken release.',
    ],
  },
];

export const getHistoricalCaseById = (id: string): HistoricalCase => {
  const found = mockHistoricalCases.find(c => c.id === id);
  return found || mockHistoricalCases[0];
};
