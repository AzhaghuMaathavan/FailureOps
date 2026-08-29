# Phase 3 Document Parsing and Normalization

## 1. Files created/modified
- `app/api/documents.py`: API route for document upload and status tracking.
- `app/services/pdf_renderer.py`: Uses `PyMuPDF` to convert PDF pages into PNG images.
- `app/services/nemotron_client.py`: Calls `nvidia/nemotron-parse` API endpoint with the page images encoded in base64.
- `app/services/document_normalizer.py`: Normalizes the Nemotron parser `markdown_bbox` blocks into our database schema.
- `app/services/document_service.py`: Orchestrates the pipeline independently per page and handles errors safely.
- `app/models/document.py`: Defines the SQLAlchemy models.
- `app/db/init_db.py`: Initialization script for PostgreSQL schemas.
- `test_upload.py`: Integration test script.

## 2. Database tables created
- `documents`: Stores original document path, status, and error states.
- `pages`: Stores page-level rendering and parsing results (including the `raw_parser_response` as a `JSONB` column to ensure we never lose the Nemotron original data).
- `document_blocks`: The normalized structure representing semantic units.

## 3. Parser integration
- Using the `chat/completions` endpoint for `nvidia/nemotron-parse`.
- Passing the rendered PDF page as an `image_url` data URI.
- Extracting the stringified JSON array from the `markdown_bbox` tool call arguments.

## 4. Actual normalized structure
The `DocumentBlock` model captures the exact structure required:
- `id`: UUID
- `document_id`: Relational link to the parent document.
- `page_id`: Relational link to the parent page.
- `block_index`: Sequential index preserving the exact reading order determined by the parser.
- `block_type`: Parser-identified layout type (e.g., `Section-header`, `Text`, `Table`).
- `content`: The text content extracted from the bounding box.
- `bbox`: JSON object with `xmin`, `ymin`, `xmax`, `ymax`.
- `raw_metadata`: The exact dictionary provided by the parser for this specific block.

## 5. Sample parsed document structure
Testing `Doc1.pdf` yielded 3 distinct blocks on Page 1. Here is a sample normalized block:
```json
{
  "id": "46579be5-53e6-4cc6-a07c-dade657cb44a",
  "block_index": 0,
  "block_type": "Section-header",
  "content": "PDF 1: Purpose of RAGFlow",
  "bbox": {
    "xmin": 0.3225,
    "ymin": 0.2858,
    "xmax": 0.6814,
    "ymax": 0.3323
  }
}
```

## 6. Error handling
- Invalid file types (non-PDF) are rejected immediately at the API boundary with HTTP 400.
- If rendering fails (e.g. corrupted PDF), the `Document` status is set to `FAILED`.
- Pages are processed inside an independent try-catch block. If one page fails due to a network timeout with Nemotron, the `Page` status becomes `FAILED` and the parent `Document` becomes `PARTIAL_SUCCESS`. This ensures a 100-page document doesn't fail entirely if page 42 times out.

## 7. Test results
- **Single/Multi-page PDF upload**: Successfully uploaded, saved to local storage, and tracked in Postgres.
- **Parser Execution**: Successfully communicated with the real NVIDIA API, retrieving valid layout blocks.
- **Postgres Storage**: Confirmed that `DocumentBlock`s are populated correctly and no embedding vectors were instantiated yet.

## 8. Known limitations
- **Table Parsing Extraction**: The `nemotron-parse` model successfully identifies `Table` block types and retrieves the text. However, it does not explicitly return a structured grid of `Row -> Cell` natively in the first layer of `markdown_bbox`. It often returns the table as a markdown-formatted string inside the `content` field.
- **Scale**: The current `document_service.py` processes pages synchronously. For a 500-page textbook, this would be slow. 

## 9. Recommendations for Phase 4
- Introduce `pgvector(2048)` to the `DocumentBlock` or a child `Chunk` table.
- Implement an explicit Markdown-Table parsing function to take the `content` of a block identified as `Table` and reconstruct a logical `Row -> Cell` dictionary for accurate numerical calculations.
- Introduce parallel asynchronous processing of pages (e.g., using `asyncio.gather` or a background task queue) to speed up ingestion of large PDFs.
- Begin Semantic Chunking rules (e.g. collapsing `Text` blocks under the nearest preceding `Section-header`).
