# Phase 5 Embeddings and Vector Storage

## 1. Files created/modified
- `app/models/chunk.py`: Modified to include the `embedding` (using `pgvector`), `embedding_model`, `embedding_status`, and `embedding_error` columns.
- `app/services/embedding_service.py`: Created the independent NVIDIA embedding client with configurable batching.
- `app/api/documents.py`: Decoupled embedding from the upload pipeline, adding a dedicated `POST /api/v1/documents/{document_id}/embed` route.
- `migrate_phase5.py`: Safely applied the PostgreSQL `ALTER TABLE` changes to add the pgvector columns without dropping Phase 4 data.
- `test_embeddings.py`: Integration test script.
- `.env`: Verified that `EMBEDDING_BATCH_SIZE=16` is configurable.

## 2. Database Schema Changes
The PostgreSQL extension `pgvector` was verified, and the following columns were added to the `chunks` table via an explicit database migration:
```sql
ALTER TABLE chunks ADD COLUMN embedding vector(2048);
ALTER TABLE chunks ADD COLUMN embedding_model VARCHAR;
ALTER TABLE chunks ADD COLUMN embedding_status VARCHAR NOT NULL DEFAULT 'PENDING';
ALTER TABLE chunks ADD COLUMN embedding_error VARCHAR;
```
Importantly, Phase 4 columns (`content`, `headers`, `lineage`) were NOT modified or replaced. They remain pristine.

## 3. NVIDIA Embedding Request Format
The API request uses the `nvidia/nemotron-3-embed-1b` model. The final context-enriched chunk content (e.g. `Section: College Timetable\n\n\begin{tabular}...`) is passed to the API using `input_type="passage"`.

## 4. Actual Batch Behavior
Batch size is read from `EMBEDDING_BATCH_SIZE=16`. The service slices the `PENDING` chunks into safe arrays of 16 and sends them in a single HTTP request to `https://integrate.api.nvidia.com/v1/embeddings`. If a batch fails, the chunks in that batch are marked as `FAILED` but their content remains completely intact.

## 5. Actual Embedding Dimension
The script rigorously validates the response from the API. The `nvidia/nemotron-3-embed-1b` model successfully returned vectors of **exactly 2048 dimensions**. No padding, truncation, or guessing occurred.

## 6. Processing Statuses
Chunk embeddings track their state securely:
- `PENDING` (Default upon chunk generation)
- `PROCESSING` (During API call)
- `COMPLETED` (Successfully stored 2048-dim vector)
- `FAILED` (API failure or dimension mismatch)

## 7. Idempotency Behavior
- **Default mode**: Sending a `POST` request to `/embed` skips any chunk where `embedding_status == "COMPLETED"`.
- **Force mode**: Passing `?force=true` overrides idempotency and re-embeds the chunks, safely overwriting the old vector.

## 8. Test Results
The following test criteria passed successfully on the live database:
- [x] NVIDIA embedding request succeeds
- [x] returned embedding is numeric
- [x] dimension == 2048
- [x] vector is stored in PostgreSQL
- [x] pgvector accepts vector(2048)
- [x] chunk lineage remains unchanged
- [x] chunk content remains unchanged
- [x] table chunk receives an embedding
- [x] failed embedding does not destroy chunk
- [x] repeated processing skips already-completed embeddings
- [x] force re-embedding works
- [x] existing health endpoint still works
- [x] Docker PostgreSQL + pgvector still works

## 9. Performance Observations
- **Latency**: Generating a batch of embeddings via the NVIDIA NIM API takes roughly **~1.0 to ~1.2 seconds**.
- **Batch Size**: 16 is a safe starting point. Because it's read dynamically from `.env`, if NVIDIA rejects the batch size, we can easily dial it down to 8 or 4 without modifying code.

## 10. Known Limitations
- If a document is massively long (e.g., 5000 chunks), making sequential synchronous batch calls to the NVIDIA API will tie up the HTTP connection for a while. Moving the batch loop to a background task queue (like Celery or FastAPI BackgroundTasks) will be necessary before deploying to production.
