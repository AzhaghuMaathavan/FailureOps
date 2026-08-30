You are a senior software architect and migration engineer.

We are building a hackathon project called "FailureOps X".

IMPORTANT:
The existing project already contains working frontend functionality, an existing RAG implementation, database integration, API routes, deployment configuration, and other working code.

Your task is to REORGANIZE the existing project into a professional modular architecture.

DO NOT rebuild the application.
DO NOT delete working functionality.
DO NOT replace the existing RAG.
DO NOT rewrite working business logic unnecessarily.
DO NOT create fake implementations just to satisfy the folder structure.

The final application MUST continue to run after the migration.

==================================================
1. TARGET PROFESSIONAL ARCHITECTURE
==================================================

Create the following top-level structure:

FailureOps-X/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── public/
│   ├── types/
│   ├── services/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   └── dependencies/
│   │   │
│   │   ├── services/
│   │   ├── models/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── auth/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── rag/
│   ├── app/
│   │   ├── ingestion/
│   │   ├── parsing/
│   │   ├── chunking/
│   │   ├── embeddings/
│   │   ├── retrieval/
│   │   ├── reranking/
│   │   ├── citations/
│   │   │
│   │   ├── agents/
│   │   │   ├── evidence_agent/
│   │   │   ├── signal_agent/
│   │   │   ├── pattern_agent/
│   │   │   ├── failure_dna_agent/
│   │   │   ├── truth_agent/
│   │   │   ├── prediction_agent/
│   │   │   └── intervention_agent/
│   │   │
│   │   ├── intelligence/
│   │   │   ├── signals/
│   │   │   ├── patterns/
│   │   │   ├── failure_dna/
│   │   │   ├── similarity/
│   │   │   ├── risk/
│   │   │   └── prediction/
│   │   │
│   │   ├── models/
│   │   └── main.py
│   │
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── schema/
│   └── README.md
│
├── shared/
│   ├── contracts/
│   ├── schemas/
│   ├── types/
│   └── constants/
│
├── data/
│   ├── demo/
│   ├── sample_projects/
│   └── sanitized_cases/
│
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── smoke/
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── AGENTS.md
│   ├── DATA_FLOW.md
│   ├── PRIVACY.md
│   └── DEMO_FLOW.md
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md


==================================================
2. FIRST STEP — INSPECT, DO NOT MODIFY
==================================================

Before changing ANYTHING:

Inspect the entire repository.

Identify:

1. Current frontend
2. Current Next.js configuration
3. Current API/BFF routes
4. Existing Python backend
5. Existing RAG
6. RAG ingestion
7. Document parsers
8. Chunking
9. Embeddings
10. Retrieval
11. Reranking
12. Evidence extraction
13. Existing agents
14. Database models
15. PostgreSQL/pgvector configuration
16. Object storage
17. Authentication
18. Environment variables
19. Docker configuration
20. Deployment configuration
21. Tests
22. Existing demo/sample data

DO NOT MODIFY ANY FILE DURING THIS FIRST INSPECTION.

Return a report:

CURRENT STRUCTURE
↓
CURRENT COMPONENT
↓
TARGET LOCATION
↓
MIGRATION RISK

Example:

app/components/X.tsx
→ frontend/components/X.tsx
→ LOW RISK

rag/app/retrieval/foo.py
→ rag/app/retrieval/foo.py
→ NO MOVE REQUIRED

etc.


==================================================
3. IMPORTANT MIGRATION RULE
==================================================

The existing project currently has frontend files at the repository root and the RAG may already be inside:

rag/

The final architecture must have:

frontend/
backend/
rag/

as separate top-level systems.

However:

DO NOT blindly move files.

For every moved file:

1. Move it.
2. Update imports.
3. Update aliases.
4. Update package configuration.
5. Update TypeScript configuration.
6. Update Docker paths.
7. Update environment paths.
8. Update deployment scripts.
9. Update CI/CD.
10. Update API URLs.
11. Run tests/build.
12. Fix broken references.

Never leave broken imports.

==================================================
4. FRONTEND MIGRATION
==================================================

Move the existing Next.js frontend into:

frontend/

Move only frontend-related code.

This includes:

- app/
- components/
- context/
- frontend-specific lib/
- public/
- frontend types
- frontend services
- Next.js configuration
- package.json
- frontend-specific configuration

The frontend must remain a normal Next.js application.

Expected:

frontend/
├── app/
├── components/
├── context/
├── lib/
├── public/
├── services/
├── types/
├── package.json
├── next.config.*
├── tsconfig.json
└── ...

Update all imports accordingly.

Do not duplicate the frontend.

There must be only ONE active frontend implementation.


==================================================
5. BACKEND MIGRATION
==================================================

Create:

backend/

The backend is responsible for:

- API
- authentication
- authorization
- project management
- company management
- user management
- permissions
- database access
- orchestration
- privacy enforcement
- communication with RAG
- communication with intelligence services

Do NOT put RAG retrieval logic inside backend business logic.

Backend should communicate with RAG through clear interfaces/API/service boundaries.

If the existing Python backend already performs both backend and RAG functions, DO NOT break it.

Instead, separate responsibilities logically first.

If physically separating the running services would create unnecessary risk, keep the existing implementation working and create clean service boundaries.


==================================================
6. RAG MIGRATION
==================================================

The existing RAG is extremely important.

DO NOT replace it.

The RAG must remain responsible for:

Document
↓
Parsing
↓
Chunking
↓
Embedding
↓
Retrieval
↓
Reranking
↓
Evidence candidates

Preserve:

- PyMuPDF
- Docling
- existing embedding model
- pgvector
- BM25 if present
- hybrid retrieval
- RRF if present
- reranking
- document/page/block lineage
- citations

The RAG should be located under:

rag/

Organize it into:

rag/app/

├── ingestion/
├── parsing/
├── chunking/
├── embeddings/
├── retrieval/
├── reranking/
└── citations/

Do not rewrite working RAG code merely for naming purposes.


==================================================
7. AGENTS
==================================================

Keep AI agents under:

rag/app/agents/

Create/maintain:

evidence_agent/
signal_agent/
pattern_agent/
failure_dna_agent/
truth_agent/
prediction_agent/
intervention_agent/

Each agent must have a clear responsibility.

Evidence Agent:

INPUT:
RAG-retrieved document chunks

OUTPUT:
structured EvidenceItems

Signal Agent:

INPUT:
EvidenceItems

OUTPUT:
Signals

Pattern Agent:

INPUT:
Signals + Evidence

OUTPUT:
Patterns

Failure DNA Agent:

INPUT:
Patterns + Signals

OUTPUT:
FailureDNA

Truth Agent:

INPUT:
User/project assumptions + evidence

OUTPUT:
ClaimAssessment

Prediction Agent:

INPUT:
FailureDNA + historical matches + trends

OUTPUT:
Prediction

Intervention Agent:

INPUT:
Failure pattern + historical cases

OUTPUT:
InterventionRecommendation


IMPORTANT:

Do not make every agent independently query the entire database.

Use controlled inputs and outputs.

The architecture should be:

RAG
↓
Evidence Agent
↓
Signal Agent
↓
Pattern Agent
↓
Failure DNA
↓
Historical Similarity
↓
Risk
↓
Prediction
↓
Intervention


==================================================
8. FAILURE RADAR
==================================================

IMPORTANT:

Do NOT create unnecessary "Radar Agent".

Failure Radar is primarily a risk visualization/calculation layer.

Architecture:

Evidence
↓
Signals
↓
Patterns
↓
Failure DNA
↓
Historical Similarity
↓
Risk Engine
↓
Failure Radar

The Risk Engine should perform deterministic calculations.

The UI should visualize:

- overall risk
- risk by dimension
- risk trend
- confidence
- strongest contributing signals
- historical similarity
- predicted next failure

The LLM should NOT randomly generate the numerical risk.


==================================================
9. SHARED CONTRACTS
==================================================

Create a shared contract layer:

shared/

├── contracts/
├── schemas/
├── types/
└── constants/

At minimum define contracts for:

EvidenceItem
Signal
Pattern
FailureDNA
ClaimAssessment
HistoricalMatch
Prediction
InterventionRecommendation
OutcomeVerification
PrivacyLevel

Use strongly typed schemas.

The frontend and backend/RAG must not independently invent incompatible versions of these objects.

For example:

EvidenceItem:

{
  id,
  project_id,
  source_id,
  document_name,
  page,
  section,
  claim,
  evidence_type,
  value,
  confidence,
  visibility
}

Preserve source lineage.


==================================================
10. DATABASE
==================================================

Database-related migration files should be under:

database/

Do not move the actual PostgreSQL server.

Do not create a second database.

Preserve existing PostgreSQL + pgvector configuration.

Organize:

database/
├── migrations/
├── seeds/
├── schema/
└── README.md

Existing database tables must continue working.

Potential entities:

companies
users
projects
documents
chunks
evidence
signals
patterns
failure_dna
historical_cases
predictions
interventions
experiments
outcomes

Do not fabricate production historical data.


==================================================
11. PRIVACY ARCHITECTURE
==================================================

FailureOps X is intended to eventually work as a global platform.

Therefore privacy must be built into the architecture.

Every document/evidence/case should conceptually support:

owner/company
visibility
sharing permission

Use:

PRIVATE
ORGANIZATION
GLOBAL_SANITIZED

Rules:

PRIVATE:
Only authorized users from the owning organization.

ORGANIZATION:
Available inside the organization.

GLOBAL_SANITIZED:
Explicitly approved for global learning/search.

CRITICAL:

Never expose a private company's document through global search.

Global historical learning should use sanitized/approved information.

Example:

PRIVATE SOURCE:

Company A internal report:
"Customer activation dropped because our onboarding implementation had bug XYZ."

This must NOT become globally readable.

Instead, if Company A explicitly permits global sharing:

GLOBAL MEMORY:

"Historical case: onboarding friction was associated with declining activation. Simplifying onboarding improved activation."

Do not expose the original private document.

Create:

rag/app/privacy/

or an equivalent clearly separated privacy module if appropriate.


==================================================
12. DATA FLOW
==================================================

The final architecture must support this flow:

USER
↓
FRONTEND
↓
BACKEND API
↓
DOCUMENT INGESTION
↓
RAG
↓
EVIDENCE
↓
SIGNALS
↓
PATTERNS
↓
FAILURE DNA
↓
HISTORICAL SIMILARITY
↓
RISK ENGINE
↓
FAILURE RADAR
↓
PREDICTION
↓
INTERVENTION
↓
EXPERIMENT
↓
OUTCOME
↓
SANITIZED ORGANIZATIONAL MEMORY


==================================================
13. GLOBAL SEARCH
==================================================

FailureOps X will eventually allow a company to search for similar products/projects.

Example:

User enters:

Product:
"Expense Tracker"

Description:
"Mobile expense tracking application for small businesses."

Features:

- receipt scanning
- automatic categorization
- budget tracking
- team expense management

System:

Product description
↓
Semantic representation
↓
Historical/global memory retrieval
↓
Similarity ranking
↓
Historical cases
↓
Approved/sanitized results

The result should NOT automatically expose private documents.

Instead show:

Similar product/case
Similarity
Failure pattern
What happened
Mistakes observed
Intervention
Outcome
Confidence
Evidence availability

Only show detailed source evidence if the user has permission to access it.


==================================================
14. DEMO DATA
==================================================

Keep demo data separate:

data/

├── demo/
├── sample_projects/
└── sanitized_cases/

Demo data must never be confused with real customer data.

Make it easy to seed the database for the hackathon demo.


==================================================
15. CONFIGURATION
==================================================

Update:

docker-compose.yml
.env.example
README.md
CI/CD
deployment scripts

Every service must have clear environment variables.

Do not hard-code:

API keys
database passwords
tokens
credentials
private URLs

Use environment variables.


==================================================
16. DOCKER
==================================================

The final architecture should be able to run using Docker Compose.

Conceptually:

docker-compose.yml

services:

frontend
backend
rag
postgres
storage

However:

If backend and RAG currently run as one service and separating them would introduce unnecessary risk, keep them together temporarily while maintaining clear code boundaries.

Do not introduce unnecessary microservices.


==================================================
17. TESTING AFTER MIGRATION
==================================================

After restructuring, run:

1. Frontend build
2. Frontend lint
3. Backend startup
4. RAG startup
5. Database connection
6. pgvector availability
7. Existing RAG test
8. Upload test
9. Retrieval test
10. API health test
11. Frontend → backend test
12. Backend → RAG test

Test the basic flow:

Upload document
↓
Parse
↓
Chunk
↓
Embed
↓
Store
↓
Retrieve
↓
Return evidence


==================================================
18. DO NOT DO THESE
==================================================

DO NOT:

- rewrite the entire application
- replace the existing RAG
- change embedding models unnecessarily
- replace PostgreSQL
- introduce Kubernetes
- introduce unnecessary microservices
- introduce Kafka
- introduce Redis unless already required
- introduce a new vector database if pgvector already works
- create unnecessary abstractions
- duplicate components
- duplicate APIs
- duplicate RAG
- create fake AI results
- delete existing functionality
- expose private documents
- commit credentials
- hard-code API keys


==================================================
19. MIGRATION ORDER
==================================================

Perform the migration in this exact order:

PHASE 1
Inspect repository.

PHASE 2
Generate current architecture report.

PHASE 3
Create target directories.

PHASE 4
Move frontend.

PHASE 5
Fix frontend imports/configuration.

PHASE 6
Verify frontend builds.

PHASE 7
Separate backend responsibilities.

PHASE 8
Preserve/move RAG into rag/.

PHASE 9
Organize agents.

PHASE 10
Create shared contracts.

PHASE 11
Organize database migration/schema files.

PHASE 12
Organize data/demo files.

PHASE 13
Update Docker.

PHASE 14
Update deployment configuration.

PHASE 15
Update documentation.

PHASE 16
Run complete tests.

PHASE 17
Fix all broken imports/configurations.

PHASE 18
Verify the full application.


==================================================
20. VERY IMPORTANT — DO NOT STOP AT FOLDER CREATION
==================================================

After migration, verify that the actual application works.

Do not simply say:

"Folders created successfully."

You must verify:

Frontend
↓
Backend
↓
RAG
↓
Database

actually communicate.

Especially verify the existing RAG still performs:

Upload
→ Parse
→ Chunk
→ Embed
→ Retrieve
→ Evidence


==================================================
21. FINAL REPORT
==================================================

At the end, provide:

1. Final directory tree.

2. Files moved.

3. Files created.

4. Files modified.

5. Files intentionally left unchanged.

6. Frontend entry point.

7. Backend entry point.

8. RAG entry point.

9. Database configuration.

10. Agent locations.

11. Shared contract locations.

12. API communication flow.

13. RAG communication flow.

14. Privacy architecture.

15. Docker commands.

16. Development commands.

17. Test results.

18. Any remaining problems.

19. Any TODOs.

20. Any migration risks.

IMPORTANT:

Do not claim something is implemented unless you verified it.

Clearly label each feature as:

IMPLEMENTED
PARTIALLY IMPLEMENTED
INTERFACE ONLY
MOCK/DEMO
NOT IMPLEMENTED

The final project must be runnable.

Start with PHASE 1: repository inspection.
DO NOT MODIFY ANYTHING UNTIL THE INSPECTION REPORT IS COMPLETE.