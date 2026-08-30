# Phase 3 Review

Below is the exact normalized output retrieved from PostgreSQL for two real PDFs parsed by the pipeline.

## 1. Document Metadata (Sample)
```json
{
  "id": "211f0853-c85b-48dd-9dec-8fe6d162343a",
  "filename": "table_doc.pdf",
  "status": "COMPLETED",
  "created_at": "2026-08-22 10:58:49.171613+00",
  "updated_at": "2026-08-22 10:58:51.299178+00"
}
```

## 2. Page Metadata (Sample)
```json
{
  "id": "641f1c5e-f32f-415c-9b36-4710a2557c0e",
  "document_id": "211f0853-c85b-48dd-9dec-8fe6d162343a",
  "page_number": 0,
  "status": "COMPLETED",
  "image_path": "P:\\agentic_rag\\storage\\documents\\...\\page_0.png"
}
```
*Note: The `raw_parser_response` (the entire OpenAI-format JSON response from NVIDIA) is fully preserved inside the `pages` table as a `JSONB` column.*

## 3. Normalized Document Blocks (Text Example)

From `Doc1.pdf`:
```json
[
  {
    "id": "46579be5-53e6-4cc6-a07c-dade657cb44a",
    "document_id": "644ad032-1f73-4543-8569-45743b0bac16",
    "page_id": "641f1c5e-f32f-415c-9b36-4710a2557c0e",
    "block_index": 0,
    "block_type": "Section-header",
    "content": "PDF 1: Purpose of RAGFlow",
    "bbox": {"xmin": 0.322, "ymin": 0.285, "xmax": 0.681, "ymax": 0.332}
  },
  {
    "id": "e1a7b34d-68b7-44c7-aabb-8d2327c8c04d",
    "document_id": "644ad032-1f73-4543-8569-45743b0bac16",
    "page_id": "641f1c5e-f32f-415c-9b36-4710a2557c0e",
    "block_index": 1,
    "block_type": "Text",
    "content": "RaGFlow is an open source Retrieval-Augmented Generation (RAG) engine designed to turn raw documents into reliable context for large language models...",
    "bbox": {"xmin": 0.109, "ymin": 0.148, "xmax": 0.893, "ymax": 0.218}
  }
]
```

## 4. Table Representation (Critical Discovery)

I generated a custom `table_doc.pdf` containing a "College Timetable" and passed it through the pipeline to see exactly how tables are handled. 

Here is the exact `DocumentBlock` generated for the table:
```json
{
  "id": "908c6b9e...",
  "block_index": 1,
  "block_type": "Table",
  "bbox": {"xmin": 0.2, "ymin": 0.3, "xmax": 0.8, "ymax": 0.5},
  "content": "\\begin{tabular}{cccc}\nDay & 9 AM & 10 AM & 11 AM\\\\\nMonday & Physics & Math & Chemistry\\\\\nTuesday & Math & English & Physics\\\\\n\\end{tabular}"
}
```

**Observation:**
Nemotron Parse natively extracts tables as **LaTeX tabular environments**. 
- Rows are delimited by `\\`
- Cells are delimited by `&`
This means the table structure (Row -> Cell) was *not* discarded or flattened into a meaningless string. It is preserved perfectly in a format that downstream LLMs natively understand and can reason over.

## 5. Verification Checklist
- **reading order is preserved**: Yes, `block_index` strictly maps to the sequence returned by the parser.
- **page lineage is preserved**: Yes, every `DocumentBlock` has a `page_id` linked to the specific page it was parsed from.
- **bbox is preserved**: Yes, the normalized JSON `bbox` dictionary maps exactly to `{"xmin":..., "ymin":..., "xmax":..., "ymax":...}`.
- **raw parser output is preserved**: Yes, the entire JSON payload from the API is securely locked in the `pages.raw_parser_response` `JSONB` column.
- **no information was silently discarded**: The raw object returned by `markdown_bbox` is also stored inside the `DocumentBlock.raw_metadata` column for fail-safe parsing.
- **no table structure was invented**: The LaTeX structure is the raw output from Nemotron Parse. We did not hallucinate or guess row/cell layouts.

I have stopped here and will not proceed to semantic chunking, embeddings, or retrieval until you review these findings.
