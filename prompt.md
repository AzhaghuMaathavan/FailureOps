You are the lead frontend/product engineer for FailureOps X.

IMPORTANT:
You are working inside an EXISTING FailureOps X repository.
Do NOT blindly rewrite the project.
First inspect the repository, understand the existing architecture,
routes, components, API integrations, authentication, data contracts,
design system, and current UI.

Your task is to redesign and upgrade the application into a
production-grade B2B SaaS platform while PRESERVING all existing
working backend, RAG, agent, API, database, and business logic.

============================================================
1. PRODUCT CONTEXT
============================================================

FailureOps X is an evidence-grounded project intelligence platform.

The product analyzes project/product evidence and turns it into:

Project Evidence
        ↓
Signals
        ↓
Patterns
        ↓
Failure DNA
        ↓
Truth / Assumption Validation
        ↓
Historical Intelligence
        ↓
Failure Radar
        ↓
Predicted Next Failure
        ↓
Intervention
        ↓
Experiment / Outcome
        ↓
Organizational Memory

FailureOps is NOT simply a document chatbot.

The core differentiation is:

A normal RAG system:
Question → retrieve documents → answer

FailureOps:
Project evidence → signals → patterns → risk profile →
historical comparison → emerging failure detection →
intervention → verified learning

The UI must communicate this clearly.

============================================================
2. FIRST: INSPECT BEFORE MODIFYING
============================================================

Before writing code, inspect:

- package.json
- existing Next.js structure
- app/
- components/
- context/
- lib/
- types/
- API routes
- authentication implementation
- existing RAG/backend integration
- existing project routes
- existing dashboard
- existing Failure DNA UI
- existing Radar UI
- existing Evidence UI
- existing historical search
- existing data contracts
- existing styling/design tokens
- existing responsive behavior

Determine:

1. What already works.
2. What can be reused.
3. What should be redesigned.
4. Which routes already exist.
5. Which APIs already exist.
6. Which components already exist.
7. Which pages currently contain hardcoded/demo data.
8. Which UI elements are connected to real APIs.
9. Which functionality must NOT be touched.

DO NOT start modifying files until you understand the current
architecture.

At the beginning, provide a short implementation plan based on
the actual repository you inspect.

============================================================
3. CRITICAL RULE: DO NOT BREAK BACKEND/RAG
============================================================

This is primarily a frontend/product UX redesign.

DO NOT:

- rewrite the RAG engine
- rewrite the agent system
- change database schemas unnecessarily
- remove existing API endpoints
- remove working project analysis
- replace real API data with hardcoded data
- break existing document lineage
- break evidence references
- break Failure DNA calculations
- break Failure Radar
- break historical retrieval
- break intervention logic
- break existing deployment configuration

If an existing API is already available, use it.

If a feature does not yet have a backend implementation, create
the frontend interface with a clean service abstraction and an
appropriate loading/empty state rather than inventing fake
production data.

============================================================
4. NEW PRODUCT INFORMATION ARCHITECTURE
============================================================

Separate the PUBLIC WEBSITE from the AUTHENTICATED APPLICATION.

PUBLIC WEBSITE:

/
 /platform
 /how-it-works
 /intelligence
 /security
 /login
 /signup

AUTHENTICATED APPLICATION:

/app
/app/dashboard
/app/projects
/app/projects/[id]
/app/search
/app/memory
/app/settings

If equivalent routes already exist, preserve them where possible
and adapt the architecture instead of unnecessarily renaming
everything.

============================================================
5. PUBLIC WEBSITE
============================================================

The public website should feel like a premium production-grade
B2B SaaS company.

It must NOT look like an internal monitoring dashboard.

Current landing page contains dashboard-like elements such as:

- Aurora
- failure risk percentages
- live telemetry
- evidence source counts
- experiment results
- internal engine labels

These should NOT dominate the public marketing page.

Do not present sample/demo numbers as real customer outcomes.

Do not claim that a result belongs to a real company unless the
repository contains verified data supporting that claim.

For illustrative examples, use labels such as:

"Illustrative analysis"
"Example project"
"Example historical case"

Do NOT use the phrase "mock data" in marketing copy.

============================================================
6. LANDING PAGE HERO
============================================================

Use this positioning:

HEADLINE:

"Know where your project is heading before it gets there."

SUBHEADING:

"FailureOps X turns fragmented project evidence into risk
intelligence — connecting signals, patterns, historical outcomes,
and verified interventions in one continuous intelligence layer."

Primary CTA:

"Start analyzing"

Secondary CTA:

"Explore intelligence"

Small supporting line:

"Evidence-grounded • Explainable • Privacy-controlled"

Do not use fake "LIVE telemetry" indicators.

Do not use fake real-time timestamps.

Do not imply that the visitor is viewing real customer telemetry.

============================================================
7. HERO PRODUCT VISUAL
============================================================

Create a sophisticated product preview showing an illustrative
project intelligence dashboard.

Example:

PROJECT INTELLIGENCE

Project Launch

Project Health                 68
Risk Trend                     ↑ Increasing

Adoption       ████████░░       81
Execution      ██████░░░░       63
Operational    ███████░░░       71
Technical      ████░░░░░░       42

Emerging Pattern

Onboarding friction → adoption risk

Historical similarity            87%

[Inspect evidence]

Clearly mark this visual as illustrative if needed.

This preview should look like a real enterprise product.

============================================================
8. LANDING PAGE SECTIONS
============================================================

Build these sections:

SECTION 1
Hero

SECTION 2
Evidence → Intelligence workflow

SECTION 3
Failure DNA

SECTION 4
Truth Engine / Assumption Validation

SECTION 5
Historical Intelligence

SECTION 6
Failure Radar

SECTION 7
Intervention → Experiment → Verified Learning

SECTION 8
Privacy / Controlled Knowledge Sharing

SECTION 9
Final CTA

SECTION 10
Professional footer

============================================================
9. EVIDENCE → INTELLIGENCE WORKFLOW
============================================================

Visually show:

Project Evidence
       ↓
Signals
       ↓
Failure DNA
       ↓
Historical Intelligence
       ↓
Failure Radar
       ↓
Intervention
       ↓
Verified Learning

Each stage needs:

- title
- short explanation
- appropriate icon
- subtle animation
- clean visual hierarchy

Avoid excessive animation.

============================================================
10. FAILURE DNA
============================================================

Failure DNA is a multidimensional project risk profile.

Show dimensions such as:

Technical
Operational
Adoption
Execution
Financial

Do NOT imply that every project is failing.

A healthy project should be able to show:

Overall risk: Low

✓ Adoption stable
✓ Execution on track
✓ Technical risk low
✓ No significant emerging pattern

A project with emerging problems can show:

Overall risk: Elevated

⚠ Adoption deterioration
⚠ Execution delay
⚠ Increasing operational friction

The product detects and explains risk; it does not manufacture
failure warnings.

============================================================
11. TRUTH ENGINE
============================================================

Create a strong product visualization.

Example:

TEAM ASSUMPTION

"Pricing is causing poor adoption."

Evidence:

Pricing complaints       8%
Onboarding complaints   76%
Signup abandonment      43%
Activation decline      37%

RESULT:

ASSUMPTION CHALLENGED

"Current evidence more strongly supports onboarding friction."

Include:

[View supporting evidence]

Make it visually clear that FailureOps compares assumptions
against evidence.

============================================================
12. HISTORICAL INTELLIGENCE
============================================================

This is a major product differentiator.

Users should be able to describe a product/project and search
approved historical intelligence.

Example:

Query:

"Expense management platform with receipt scanning,
budget tracking and team expenses."

Results can contain:

Similar historical product/project
Similarity score
Observed challenge
Failure pattern
Intervention
Observed outcome
Confidence
Source availability

Example:

Expense Management Platform

Similarity: 91%

Observed challenge:
Low activation

Pattern:
Complex onboarding

Intervention:
Simplified onboarding

Outcome:
Improved activation

IMPORTANT:

Global search MUST NOT expose private company documents.

Only approved/sanitized information can be returned through global
intelligence.

============================================================
13. PRIVACY MODEL
============================================================

Implement UI for three knowledge-sharing levels:

PRIVATE

Only the organization can access the project intelligence.

ORGANIZATION

Approved intelligence can be shared inside the organization.

GLOBAL_SANITIZED

Sanitized/approved intelligence can contribute to global
FailureOps intelligence.

Show this concept clearly:

Private source documents
        ↓
Evidence extraction
        ↓
Privacy / sanitization rules
        ↓
Approved knowledge
        ↓
Global intelligence

Never expose original private documents through global search
unless the originating organization explicitly allows it.

Do not claim specific security certifications or architecture
that does not actually exist.

Do not display:

"SOC2 compliant"
"HIPAA compliant"
"Zero knowledge"
"AES-256 encrypted"

unless the existing implementation genuinely supports those
claims.

============================================================
14. FAILURE RADAR
============================================================

Failure Radar belongs primarily inside the authenticated product.

It should automatically evaluate the current project based on
available project evidence, signals, Failure DNA, historical
similarity, and trends.

Possible states:

HEALTHY

Risk: 21
Trend: Stable

✓ Adoption improving
✓ Delivery on track
✓ No significant emerging pattern

ATTENTION REQUIRED

Risk: 71
Trend: Increasing

⚠ Activation declining
⚠ Onboarding friction increasing
⚠ Similar historical trajectory

Potential next failure:
Low repeat usage

Confidence:
82%

The UI must explain WHY the radar reached the conclusion.

============================================================
15. AUTHENTICATION
============================================================

Implement a production-quality but hackathon-appropriate
authentication experience.

Pages:

/login
/signup

Login:

FailureOps X

Welcome back

Work email
Password

[Sign in]

Forgot password?

Don't have an account?
Create workspace

Signup:

Create your workspace

Name
Work email
Password
Organization

[Create workspace]

After signup:

User
 ↓
Organization
 ↓
Workspace
 ↓
Project

Keep authentication implementation simple.

Do not spend time implementing:

- enterprise SSO
- SCIM
- complex billing
- advanced enterprise RBAC
- multi-region identity
- complex admin hierarchy

unless they already exist.

============================================================
16. AUTHENTICATED APPLICATION
============================================================

The authenticated application should retain the sophisticated
dark intelligence dashboard aesthetic of the existing product.

Sidebar:

Overview
Projects
Global Intelligence
Organizational Memory
Settings

Project detail:

Overview
Evidence
Failure DNA
Radar
Historical Intelligence
Interventions
Outcomes

============================================================
17. PROJECT CREATION
============================================================

Create a clean project creation experience.

Fields:

Project name
Product/project description
Stage
Industry/category

Stages:

Idea
Planning
Development
Launched

CTA:

"Create project"

After creation:

Project
 ↓
Upload evidence
 ↓
Analysis
 ↓
Project intelligence

============================================================
18. DOCUMENT UPLOAD UX
============================================================

Do NOT expose implementation language such as:

"Upload to RAG"

Instead:

"Build your project intelligence"

Upload:

PDF
DOCX
XLSX
CSV
PPTX
TXT
MD

Show processing progress:

✓ Documents received
✓ Content extracted
✓ Evidence identified
✓ Signals detected
✓ Patterns analyzed
✓ Failure DNA generated

Then:

"Analysis complete"

Use real backend processing where available.

============================================================
19. PROJECT OVERVIEW
============================================================

Show:

Project health
Overall risk
Risk trend
Confidence
Dominant risk dimensions
Key signals
Emerging patterns
Potential next failure
Historical similarity
Supporting evidence

Example:

PROJECT AURORA

Overall Risk: 68

Trend: ↑ Increasing

Confidence: 84%

Dominant dimensions:

Adoption
Operational
Execution

Key signals:

⚠ Activation declining
⚠ Onboarding abandonment increasing
✓ Infrastructure stable
✓ Delivery velocity stable

Potential next failure:

Low repeat usage

Why?

Activation decline
+
Signup abandonment
+
Historical similarity

[View evidence]

============================================================
20. EVIDENCE TRACEABILITY
============================================================

Every important insight must be traceable.

Evidence drawer should show:

Source document
Page/section
Relevant snippet
Confidence
Related signal
Related pattern

Example:

Signal:
Onboarding friction

Source:
Customer Research.pdf

Page:
14

Evidence:
"Users are abandoning the setup process..."

Confidence:
94%

[Open source]

Preserve the existing document/page/block lineage system.

============================================================
21. GLOBAL SEARCH
============================================================

Create a polished global intelligence search page.

Search input:

"Describe a product, project, challenge or failure pattern..."

Results should support:

- similarity
- failure pattern
- intervention
- outcome
- confidence
- privacy/source availability

Provide clear distinction between:

Current organization data
and
approved global intelligence.

============================================================
22. ORGANIZATIONAL MEMORY
============================================================

Show verified historical learning.

Example:

Pattern:
Onboarding friction

Intervention:
Simplified onboarding

Verified outcome:
+21 percentage points activation

Confidence:
93%

Context:
B2B SaaS onboarding

Only show information according to privacy permissions.

============================================================
23. DESIGN SYSTEM
============================================================

Maintain the FailureOps X identity but make it more mature.

Use:

- deep neutral/dark background
- restrained orange primary accent
- subtle blue/teal secondary indicators
- sophisticated typography
- generous whitespace
- consistent spacing
- subtle borders
- restrained gradients
- minimal glass effects
- professional charts
- consistent radius system

Avoid:

- excessive neon
- excessive glow
- excessive orange
- random gradients
- generic AI illustrations
- excessive glassmorphism
- unnecessary badges
- excessive animations

The design should feel closer to a serious enterprise intelligence
platform than a gaming interface.

============================================================
24. RESPONSIVE DESIGN
============================================================

The application MUST be optimized for:

Desktop:
1440px
1920px

Tablet:
768px+

Mobile:
390px
430px

Mobile requirements:

- no horizontal scrolling
- navigation becomes drawer
- cards become single column
- charts remain readable
- CTAs become appropriately full width
- evidence drawer becomes mobile bottom sheet/full-screen sheet
- tables transform into cards
- typography scales correctly
- touch targets are comfortable
- spacing remains consistent

Do not simply shrink desktop layouts.

Design mobile layouts intentionally.

============================================================
25. ACCESSIBILITY
============================================================

Implement:

- semantic HTML
- keyboard navigation
- visible focus states
- accessible contrast
- aria labels where needed
- reduced-motion support
- readable font sizes
- accessible buttons
- accessible form validation

============================================================
26. COMPONENT ARCHITECTURE
============================================================

Reuse existing components where appropriate.

Create reusable components where missing:

Navbar
MobileNav
Hero
Workflow
FeatureCard
ProductPreview
TruthEnginePreview
HistoricalCaseCard
PrivacySection
CTA
Footer

Authenticated:

Sidebar
MobileSidebar
ProjectCard
ProjectHealthCard
RiskTrend
FailureDNACard
EvidenceDrawer
RadarPanel
HistoricalMatch
InterventionCard
OutcomeCard
EmptyState
LoadingState
ErrorState

Do not duplicate similar UI components.

============================================================
27. DATA RULE
============================================================

VERY IMPORTANT:

Never replace working API data with hardcoded values just to make
the UI look complete.

If real data exists:
use the real data.

If data does not exist:
show a meaningful empty state.

For public marketing examples:
use clearly labeled illustrative content.

For authenticated projects:
use actual project/API data.

============================================================
28. ERROR / LOADING / EMPTY STATES
============================================================

Every major page must have:

Loading state
Empty state
Error state
Success state

Examples:

No projects:

"You haven't created a project yet."

[Create project]

No historical matches:

"No relevant historical patterns found."

Upload processing:

"Analyzing project evidence..."

API failure:

"Unable to load project intelligence."

[Retry]

============================================================
29. PERFORMANCE
============================================================

Optimize for production:

- avoid unnecessary client components
- use server components where appropriate
- lazy load heavy charts
- optimize images
- avoid unnecessary dependencies
- avoid huge JavaScript bundles
- prevent unnecessary re-renders
- use skeleton loading states
- preserve existing Next.js performance patterns

============================================================
30. SEO
============================================================

Public pages should include:

proper title
description
Open Graph metadata
semantic headings
robots configuration where appropriate

Suggested title:

"FailureOps X — Project Failure Intelligence"

Suggested description:

"Turn project evidence into risk intelligence, historical insight,
and evidence-backed interventions."

============================================================
31. IMPLEMENTATION PROCESS
============================================================

Work incrementally.

PHASE 1:
Inspect repository.

PHASE 2:
Create/reuse design tokens and layout primitives.

PHASE 3:
Redesign public navbar and landing page.

PHASE 4:
Implement responsive public pages.

PHASE 5:
Implement login/signup UI while preserving existing auth logic.

PHASE 6:
Implement authenticated application shell.

PHASE 7:
Implement project creation flow.

PHASE 8:
Connect project dashboard to existing APIs.

PHASE 9:
Improve Evidence / Failure DNA / Radar / Historical Intelligence
interfaces.

PHASE 10:
Implement privacy UI.

PHASE 11:
Mobile optimization.

PHASE 12:
Testing and visual QA.

============================================================
32. DO NOT DO EVERYTHING IN ONE GIANT CHANGE
============================================================

Implement in logical batches.

After each batch:

- run TypeScript checks
- run lint
- run tests
- inspect changed files
- verify routes
- verify API connections
- fix regressions

Do not continue if a major existing feature is broken.

============================================================
33. FINAL QUALITY CHECK
============================================================

Before finishing, verify:

[ ] Public landing page works
[ ] Navbar works
[ ] Mobile navigation works
[ ] Login works
[ ] Signup works
[ ] Workspace creation works
[ ] Project creation works
[ ] Existing project analysis still works
[ ] Existing RAG integration still works
[ ] Evidence lineage still works
[ ] Failure DNA still works
[ ] Failure Radar still works
[ ] Historical search still works
[ ] Privacy levels are represented correctly
[ ] No private data is exposed globally
[ ] No fake customer claims
[ ] No fake live telemetry
[ ] No "mock data" wording in marketing UI
[ ] Illustrative examples are clearly labeled
[ ] Empty states work
[ ] Loading states work
[ ] Error states work
[ ] Desktop works
[ ] Tablet works
[ ] Mobile works
[ ] No horizontal overflow
[ ] TypeScript passes
[ ] Lint passes
[ ] Existing tests pass
[ ] No unnecessary backend changes

IMPORTANT FINAL RULE:

Do not optimize for "more features."

Optimize for:

CLARITY
+
TRUST
+
EVIDENCE
+
EXPLAINABILITY
+
PRODUCTION QUALITY

FailureOps X should feel like a real product that a company could
understand and start using, not like a collection of hackathon
features.