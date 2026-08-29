import { Intervention } from '@/types';

export const mockInterventions: Intervention[] = [
  {
    id: 'int-01',
    projectId: 'aurora',
    title: '5-Day Pipeline Stabilization Freeze & Onboarding Redesign',
    summary: 'Institute an immediate 5-day pause on new feature PRs to resolve flaky CI test suites and deploy a streamlined 3-step progressive onboarding experiment.',
    actionItems: [
      'Quarantine top 12 flaky integration tests to restore rapid developer build feedback (< 10 min).',
      'Resolve 14 open P1/P2 database deadlock defects blocking staging verification.',
      'Replace the mandatory 7-step bank compliance gate with a 3-step progressive onboarding sandbox.',
      'Defer non-essential ERP integrations (SAP, NetSuite) to Post-Beta Release v1.1.',
    ],
    historicalEvidenceStrength: 87,
    expectedImpact: 'HIGH',
    similarCasesSucceeded: '3 of 4 similar cases significantly improved after this intervention',
    backedByCases: ['PROJECT ATLAS (94% similarity)', 'PROJECT NOVA (87% similarity)', 'PROJECT SIGMA (78% similarity)'],
  },
  {
    id: 'int-02',
    projectId: 'aurora',
    title: 'Progressive Customer Activation Sandbox (A/B Intervention)',
    summary: 'Decouple production bank verification from the trial workspace experience, enabling users to explore interactive mock expense dashboards within 60 seconds.',
    actionItems: [
      'Pre-seed trial accounts with 25 realistic expense transactions and mock OCR receipts.',
      'Allow users to invite teammates without requiring administrative identity verification first.',
      'Track Step 1 to Step 3 time-to-value completion metric in real-time telemetry.',
    ],
    historicalEvidenceStrength: 93,
    expectedImpact: 'HIGH',
    similarCasesSucceeded: 'Project Atlas achieved +27% activation recovery using this exact sandbox pattern',
    backedByCases: ['PROJECT ATLAS (94% similarity)'],
  },
];
