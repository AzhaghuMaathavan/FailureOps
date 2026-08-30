You are the senior full-stack architect and debugging engineer for my project: FAILUREOPS X.

IMPORTANT:
Do NOT add new product features yet.
Do NOT redesign the UI.
Do NOT replace working technologies unnecessarily.
Do NOT randomly rewrite the entire project.

The current project is broken because the frontend, backend, PostgreSQL/pgvector, RAG pipeline, and possibly AI agents/configuration have become mixed together.

Your ONLY objective right now is:

1. AUDIT THE ENTIRE PROJECT
2. IDENTIFY ARCHITECTURAL/CONFIGURATION/CONNECTION PROBLEMS
3. SEPARATE THE SERVICES CLEANLY
4. MAKE FRONTEND → BACKEND → DATABASE → RAG WORK END-TO-END
5. VERIFY EVERYTHING WITH REAL TESTS
6. ONLY AFTER EVERYTHING WORKS, report what was fixed.

==================================================
PROJECT GOAL
==================================================

FailureOps X will eventually be an AI organizational failure-intelligence platform.

The eventual pipeline is:

User
 ↓
Frontend
 ↓
Backend API
 ↓
Project/document processing
 ↓
RAG
 ↓
Evidence extraction
 ↓
Signals
 ↓
Failure DNA
 ↓
Historical similarity
 ↓
Failure Radar
 ↓
Prediction
 ↓
Intervention
 ↓
Learning / Memory

BUT DO NOT IMPLEMENT ALL OF THIS NOW.

For this repair task, ONLY establish this reliable foundation:

Frontend
 ↓
Backend API
 ↓
PostgreSQL + pgvector
 ↓
Document ingestion
 ↓
Chunking
 ↓
Embedding
 ↓
Vector storage
 ↓
Vector retrieval
 ↓
LLM/RAG response
 ↓
Backend
 ↓
Frontend

==================================================
STEP 1 — FULL PROJECT AUDIT
==================================================

Before changing anything, inspect the ENTIRE repository.

Identify:

- frontend framework
- frontend entry point
- frontend package manager
- backend framework
- backend entry point
- backend package manager
- PostgreSQL configuration
- pgvector configuration
- RAG implementation
- embedding model/provider
- LLM provider/model
- environment variables
- database connection code
- API routes
- CORS configuration
- frontend API client
- Docker configuration if present
- docker-compose configuration if present
- migration files
- schema files
- agent files
- RAG files
- authentication code if present
- upload/document processing code
- chunking code
- vector search code

DO NOT MODIFY FILES DURING THE INITIAL AUDIT.

First create an architecture report.

==================================================
STEP 2 — CREATE A CLEAN SERVICE ARCHITECTURE
==================================================

The architecture MUST be clearly separated.

Use this conceptual structure:

failureops/
│
├── frontend/
│
├── backend/
│
├── rag/
│
├── database/
│
├── tests/
│
├── .env.example
├── docker-compose.yml
└── README.md

If the current project has a different structure, DO NOT blindly move files.

First determine the safest structure and explain it.

==================================================
STEP 3 — PORT SEPARATION
==================================================

Use one dedicated port per service.

Recommended development ports:

Frontend:
http://localhost:3000

Backend:
http://localhost:8000

PostgreSQL:
localhost:5432

IMPORTANT:

PostgreSQL is NOT an HTTP service.

Do not try to access PostgreSQL through a browser.

The frontend must NEVER connect directly to PostgreSQL.

The frontend must communicate ONLY with the backend API.

Correct:

Frontend :3000
    ↓ HTTP
Backend :8000
    ↓ PostgreSQL connection
Postgres :5432

RAG should NOT randomly expose another HTTP server unless the existing implementation specifically requires it.

Prefer:

Backend
   ↓
RAG service/module
   ↓
Embedding provider
   ↓
Postgres/pgvector

For the initial repair, keep RAG inside the backend process/module unless there is a strong technical reason that it must be a separate service.

DO NOT create unnecessary ports.

==================================================
STEP 4 — ENVIRONMENT VARIABLES
==================================================

Create a single documented environment strategy.

Create:

.env.example

It should clearly define values such as:

DATABASE_URL=
POSTGRES_HOST=
POSTGRES_PORT=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=

LLM_API_KEY=
EMBEDDING_API_KEY=

BACKEND_URL=
FRONTEND_URL=

Use the actual providers already present in the project.

DO NOT invent providers or API keys.

Never hardcode:

- passwords
- API keys
- database credentials
- secret keys

Frontend environment variables must NOT expose server-side secrets.

==================================================
STEP 5 — DATABASE CONNECTION
==================================================

Make PostgreSQL connection reliable.

Verify:

1. PostgreSQL is running.
2. Database exists.
3. pgvector extension exists.
4. Backend can connect.
5. Tables exist.
6. Vector column has the correct dimension.
7. Index configuration matches the vector type/distance metric.

Run an actual database health test.

Create or repair:

GET /health

Expected:

{
  "status": "ok"
}

Also create/verify:

GET /health/db

Expected:

{
  "status": "ok",
  "database": "connected"
}

Do not return fake health status.

The endpoint must perform a real database connection check.

==================================================
STEP 6 — PGVECTOR
==================================================

Verify pgvector is actually installed and usable.

The database must support vector operations.

Verify the actual SQL capability.

Do not assume pgvector is installed merely because a dependency exists.

Test:

- extension
- vector column
- insert
- similarity search

Use the vector dimension required by the CURRENT embedding model.

IMPORTANT:

Do NOT change the embedding model just to make the schema convenient.

If the existing embedding model produces dimension X, the vector column must match X.

==================================================
STEP 7 — DOCUMENT INGESTION
==================================================

Repair the document ingestion pipeline.

The minimum pipeline must be:

Upload document
 ↓
Backend receives file
 ↓
Extract text
 ↓
Split into chunks
 ↓
Generate embeddings
 ↓
Store chunks + embeddings
 ↓
Return ingestion result

Every chunk should retain useful metadata such as:

- document_id
- project_id if available
- page number if available
- chunk index
- source filename
- text
- embedding
- metadata

Do NOT lose source/page information.

This is important because FailureOps later needs evidence traceability.

==================================================
STEP 8 — RAG RETRIEVAL
==================================================

Repair the RAG retrieval pipeline.

Minimum:

User query
 ↓
Generate query embedding
 ↓
pgvector similarity search
 ↓
Top K chunks
 ↓
Build context
 ↓
LLM
 ↓
Answer + source references

Do NOT retrieve the entire database.

Use a reasonable top-K.

Example:

Top 10–20 candidates

Then optionally rerank.

For now, correctness is more important than advanced optimization.

==================================================
STEP 9 — RAG MUST BE REAL
==================================================

IMPORTANT:

Do NOT create fake RAG.

Do NOT return hardcoded answers.

Do NOT return predefined documents.

Do NOT make the UI display fake "AI analysis".

The following test must work:

1. Upload a real test document.
2. Document is stored.
3. Text is extracted.
4. Chunks are created.
5. Embeddings are generated.
6. Embeddings are stored in pgvector.
7. User submits a query.
8. Query embedding is generated.
9. Similar chunks are retrieved.
10. Retrieved chunks are passed to the LLM.
11. LLM answers using retrieved context.
12. Source/page metadata is returned.

==================================================
STEP 10 — RAG API
==================================================

Create or repair clean API endpoints.

At minimum:

POST /api/documents/upload

POST /api/rag/query

GET /api/documents

GET /api/health

GET /api/health/db

Use the existing API naming conventions if already established, but maintain the same logical separation.

Example query:

POST /api/rag/query

Request:

{
  "project_id": "demo-project",
  "query": "What evidence indicates increasing deployment instability?"
}

Response should be structured, for example:

{
  "answer": "...",
  "sources": [
    {
      "document": "engineering_report.pdf",
      "page": 8,
      "chunk_id": "..."
    }
  ]
}

Do not fabricate source references.

==================================================
STEP 11 — FRONTEND CONNECTION
==================================================

The frontend must communicate with the backend through HTTP.

Do NOT:

Frontend
 ↓
Postgres

That is forbidden.

Correct:

Frontend
 ↓
API
 ↓
Backend
 ↓
Database

Create one centralized API client if one does not already exist.

For example:

frontend/src/api/

Do not scatter hardcoded URLs throughout components.

Use one configured backend URL.

==================================================
STEP 12 — CORS
==================================================

Configure CORS correctly.

Development:

Frontend:
http://localhost:3000

Backend:
http://localhost:8000

Backend must allow the frontend origin.

Do NOT use wildcard CORS unnecessarily if credentials/authentication are involved.

Verify the browser can actually call the backend.

==================================================
STEP 13 — REMOVE ARCHITECTURAL CONFUSION
==================================================

Find and report:

- duplicate backend servers
- duplicate API routes
- duplicate RAG implementations
- unused ports
- conflicting environment variables
- multiple database clients
- multiple embedding implementations
- hardcoded localhost URLs
- frontend-to-database connections
- broken imports
- circular imports
- dead code
- duplicate schemas
- conflicting vector dimensions
- conflicting database URLs
- unused Docker services
- services started twice
- incorrect CORS configuration

Do not delete important code blindly.

Explain before removing major components.

==================================================
STEP 14 — SINGLE SOURCE OF TRUTH
==================================================

There must be one clear implementation for:

Database connection
Embedding generation
Chunking
Vector storage
Vector retrieval
LLM invocation
RAG orchestration

If duplicates exist, consolidate them safely.

==================================================
STEP 15 — LOGGING
==================================================

Add useful structured logging.

When a document is uploaded, backend logs should make it possible to understand:

UPLOAD
 ↓
TEXT EXTRACTION
 ↓
CHUNK COUNT
 ↓
EMBEDDING
 ↓
VECTOR INSERT
 ↓
SUCCESS

When a query runs:

QUERY
 ↓
QUERY EMBEDDING
 ↓
VECTOR SEARCH
 ↓
RETRIEVED CHUNKS
 ↓
LLM
 ↓
RESPONSE

Do not log secrets or sensitive document contents.

==================================================
STEP 16 — ERROR HANDLING
==================================================

Never silently fail.

If:

database unavailable

return a clear backend error.

If:

embedding generation fails

return a clear error.

If:

LLM fails

return a clear error.

If:

document extraction fails

return a clear error.

If:

vector search returns zero results

return:

{
  "answer": "No relevant evidence was found.",
  "sources": []
}

Do not hallucinate an answer when retrieval returns nothing.

==================================================
STEP 17 — BUILD A REAL TEST DATASET
==================================================

Create a small local test dataset.

Example:

project:
Aurora

documents:

engineering_report.pdf
customer_feedback.pdf
project_plan.pdf

Make the documents contain known facts.

For example:

engineering_report:

"Deployment failures increased from 8% to 18%."

customer_feedback:

"Complaints related to onboarding increased significantly."

project_plan:

"Release deadline remains June 30."

Then test queries against those known facts.

==================================================
STEP 18 — AUTOMATED TESTS
==================================================

Create tests for:

1. backend health
2. database connection
3. pgvector availability
4. document upload
5. text extraction
6. chunk creation
7. embedding generation
8. vector insertion
9. vector retrieval
10. RAG response
11. source references
12. frontend → backend connection

At minimum, create one end-to-end test:

Upload
 ↓
Process
 ↓
Embed
 ↓
Store
 ↓
Query
 ↓
Retrieve
 ↓
Generate
 ↓
Return source

==================================================
STEP 19 — PERFORMANCE
==================================================

Do not prematurely optimize.

But ensure vector retrieval uses an appropriate ANN index if the current dataset requires it.

Use metadata filtering where applicable.

Retrieve only a small candidate set.

Do NOT send thousands of chunks to the LLM.

The target architecture is:

Query
 ↓
Metadata filter
 ↓
Vector ANN search
 ↓
Top 10–20
 ↓
Optional rerank
 ↓
Top 5–10
 ↓
LLM

==================================================
STEP 20 — FRONTEND MINIMUM UI
==================================================

Do not redesign the entire FailureOps UI.

For now the frontend only needs:

1. Backend connection status
2. Database connection status
3. Upload document
4. Show uploaded documents
5. Query RAG
6. Display answer
7. Display source/page references
8. Display errors clearly

Create a simple debug/status screen if necessary.

The goal is to prove the complete pipeline works.

==================================================
STEP 21 — DO NOT IMPLEMENT FAILURE DNA YET
==================================================

Do NOT start:

- Failure DNA
- Failure Radar
- Prediction
- Truth Engine
- Historical similarity
- Experiment engine
- Global memory
- complex multi-agent orchestration

until this foundation passes.

The foundation is:

Frontend
 ↓
Backend
 ↓
Postgres
 ↓
pgvector
 ↓
RAG
 ↓
LLM
 ↓
Frontend

==================================================
STEP 22 — FINAL VERIFICATION
==================================================

After fixing everything, perform a complete clean-start test.

Stop all existing processes.

Start only the required services.

Expected:

Postgres:
5432

Backend:
8000

Frontend:
3000

Then verify:

http://localhost:3000
works.

Frontend → Backend works.

Backend → PostgreSQL works.

Backend → pgvector works.

Document upload works.

Embedding works.

Vector insertion works.

Vector retrieval works.

LLM works.

RAG works.

Frontend displays the real RAG answer.

==================================================
STEP 23 — FINAL REPORT
==================================================

When finished, DO NOT simply say "fixed".

Provide:

A. Original problems discovered

B. Files changed

C. Architecture after repair

D. Services and ports

E. Environment variables required

F. Database schema

G. RAG flow

H. APIs available

I. Tests performed

J. Test results

K. Remaining issues

L. Exact commands to start the project

M. Exact command to test the RAG pipeline

N. Any assumptions made

IMPORTANT:

If something cannot be verified, explicitly say so.

Do not claim something works unless you actually tested it.

==================================================
CRITICAL RULE
==================================================

The priority order is:

1. Architecture
2. Service separation
3. Database connection
4. pgvector
5. Document ingestion
6. Embeddings
7. Vector retrieval
8. RAG
9. Backend API
10. Frontend integration
11. Testing

ONLY AFTER ALL 11 WORK:

Proceed to FailureOps X intelligence features.

Do not optimize or redesign features that are not currently required.

START NOW.

First inspect the repository and produce the architecture/problem report.

DO NOT MODIFY CODE UNTIL THE AUDIT IS COMPLETE.