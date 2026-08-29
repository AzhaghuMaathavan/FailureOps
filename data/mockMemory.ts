import { OrganizationalMemoryEntry } from '@/types';

export const mockMemoryEntries: OrganizationalMemoryEntry[] = [
  {
    id: 'mem-01',
    pattern: 'Pre-Launch Verification Gate Friction',
    evidenceSummary: [
      'Trial activation plummeted to 31%',
      'Signup abandonment spiked to 43%',
      '76% of churn feedback cited bank connection failure before reaching product dashboard',
    ],
    intervention: 'Replaced mandatory upfront compliance gate with 3-step progressive onboarding and instant mock transaction sandbox.',
    experimentDesign: '50 control users (7-step flow) vs 50 treatment users (3-step sandbox) over 14 days.',
    outcome: '+33 percentage points activation improvement (31% → 64%); support tickets reduced by 64%.',
    confidence: 94,
    context: {
      industry: 'FinTech',
      stage: 'Beta / Pre-Launch',
      targetMarket: 'SMB Finance & Operations',
    },
    tags: ['Onboarding', 'Activation', 'Friction', 'Progressive Disclosure', 'FinTech'],
    verifiedAt: '2026-08-29',
  },
  {
    id: 'mem-02',
    pattern: 'CI/CD Flaky Pipeline Velocity Trap',
    evidenceSummary: [
      'Deployment failure rate reached 34%',
      'Engineering PR review latency stretched to 3.4 days',
      'Engineers logged 58 hrs/week overtime while velocity dropped 38%',
    ],
    intervention: 'Instituted mandatory 5-day new feature freeze to quarantine flaky tests and resolve staging DB deadlock defects.',
    experimentDesign: 'Sprint retrospective telemetry comparison before and after 5-day stabilization buffer.',
    outcome: 'Deployment failures decreased by 61%; MTTR dropped from 4.8 hours to 24 minutes; developer velocity rebounded by 40%.',
    confidence: 91,
    context: {
      industry: 'Enterprise SaaS',
      stage: 'Growth',
      targetMarket: 'Engineering Teams',
    },
    tags: ['DevOps', 'CI/CD', 'Feature Freeze', 'Velocity', 'Code Quality'],
    verifiedAt: '2026-08-15',
  },
  {
    id: 'mem-03',
    pattern: 'Asymmetric Scope Creep Under Fixed Milestones',
    evidenceSummary: [
      'Roadmap expanded by 7 unbuffered enterprise integrations',
      'Bug backlog surged 311% in 3 weeks',
      'Lead engineer resignations correlated with fixed deadlines and scope expansion',
    ],
    intervention: 'Aggressively de-scoped non-critical third-party integrations to post-beta releases and reset milestone buffers.',
    experimentDesign: 'Pilot delivery comparison between full scope vs lean MVP core.',
    outcome: 'Zero missed production release deadlines; engineering turnover dropped to 0% across 6 months.',
    confidence: 89,
    context: {
      industry: 'B2B Software',
      stage: 'Early Stage',
      targetMarket: 'Enterprise Operations',
    },
    tags: ['Scope Management', 'Burnout', 'Milestones', 'Risk Management'],
    verifiedAt: '2026-07-22',
  },
];
