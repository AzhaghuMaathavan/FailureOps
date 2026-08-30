# Phase 4 Semantic Chunking

## 1. Files created/modified
- `app/models/chunk.py`: Created the `Chunk` SQLAlchemy model.
- `app/services/chunking_service.py`: Implemented `create_chunks_for_document` containing the layout-aware and structure-aware chunking logic.
- `app/db/init_db.py`: Updated to include the `Chunk` table creation.
- `app/services/document_service.py`: Pipeline updated to automatically execute semantic chunking immediately after normalization.

## 2. Database Schema
A new `chunks` table was explicitly designed to support the Agentic RAG architecture:
- `id`: UUID
- `document_id`: Links back to the source document.
- `chunk_index`: Preserves ordering.
- `content`: The enriched, ready-to-embed text body.
- `lineage`: A strictly tracked `JSONB` list of `page_ids` and `block_ids`. When the future agent uses this chunk as evidence, it knows exactly what pages and layout blocks to cite.
- `headers`: A `JSONB` structure containing contextual information (e.g., `section_path`).

*Note: As directed, no `vector` column was introduced. That is strictly reserved for Phase 5.*

## 3. Structural Chunking Logic
Rather than arbitrarily cutting text every N characters, the chunker walks through the normalized blocks sequentially:
- **Title Tracking**: It maintains an active context of the most recent `Section-header`. 
- **Context Injection**: When accumulating `Text` blocks, it injects the active header into the chunk's text (e.g. `Section: College Timetable\n\n...`) so that the embedding model understands the local context.
- **Table Preservation**: When a `Table` block is encountered, the chunker flushes any active text, isolates the Table into its own `Chunk`, injects the current header context, and then flushes again. This guarantees that tables are never orphaned or awkwardly split mid-row.
- **Cross-Page Support**: Because chunking iterates sequentially over the document's global block order rather than looping per page, contiguous paragraphs that span across a page boundary seamlessly merge into a single `Chunk`. The `lineage` array will correctly track that the chunk spans `["page_1_id", "page_2_id"]`.

## 4. Test Output Validation

Executing the chunker on the existing DB produced pristine context-aware chunks:

### Text Example (Doc1.pdf)
```json
{
  "Headers": {"title": "Unknown Document", "section_path": ["PDF 1: Purpose of RAGFlow"]},
  "Lineage": {"page_ids": ["641f1c5e-f32f-415c-9b36-4710a2557c0e"], "block_ids": ["a0998dfa-10ec...", "e1a7b34d-68b7..."]},
  "Content": "Section: PDF 1: Purpose of RAGFlow\n\nRAGFlow focuses on deep document understanding, so it can handle complex formats beyond plain text..."
}
```

### Table Example (table_doc.pdf)
```json
{
  "Headers": {"title": "Unknown Document", "section_path": ["College Timetable"]},
  "Lineage": {"page_ids": ["b225b2b8-49e6-49fa-b051-09ec79d48880"], "block_ids": ["29e28c74-fe31..."]},
  "Content": "Section: College Timetable\n\n\\begin{tabular}{cccc}\nDay & 9 AM & 10 AM & 11 AM\\\\\nMonday & Physics & Math & Chemistry\\\\\nTuesday & Math & English & Physics\\\\\n\\end{tabular}"
}
```

The table is preserved flawlessly in LaTeX alongside its semantic Section Header. The future Reranker and Agent can now query "timetable" and retrieve the exact grid layout required to answer specific day/time queries.
