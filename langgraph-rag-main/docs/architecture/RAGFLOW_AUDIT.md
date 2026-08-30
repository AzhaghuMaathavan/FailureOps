# RAGFlow Architecture Audit

## 1. Document Parsing (DeepDoc)
**RAGFlow concept**: Uses `deepdoc/parser` for different file types. For PDF, it uses `RAGFlowPdfParser` which integrates `pdfplumber`, OCR, ONNX-based `LayoutRecognizer`, and `TableStructureRecognizer`. It extracts blocks, text, and tables. 
**What we can learn**: Document layout analysis is critical before plain text extraction. Identifying headers, paragraphs, and tables as distinct bounding boxes preserves meaning. 
**What we should reuse conceptually**: 
- Pipeline: PDF -> Layout Analysis -> Bounding Boxes -> Text/Table extraction.
- Table structure recognition (handling rowspan/colspan).
**What we should NOT copy**: 
- The heavy reliance on local ONNX/XGBoost models for layout recognition if we can use the `nvidia/nemotron-parse` API to get similar or better structural JSON out-of-the-box.
- The monolithic parser scripts (`pdf_parser.py` is ~2200 lines). We should build modular handlers for the output of `nemotron-parse`.

## 2. Table Extraction & Representation
**RAGFlow concept**: Uses `table.py` and `ExcelParser` to parse tabular data into Pandas DataFrames, handling multi-level headers and deduplicating columns. It serializes tables into `content_with_weight` for embeddings, and stores raw/metadata separately.
**What we can learn**: Hierarchical headers are collapsed (e.g., Header1-Header2) to give columns semantic meaning. Empty rows/columns are filtered. 
**What we should reuse conceptually**: 
- Preserving row and column indices. 
- Resolving merged cells (rowspan/colspan) by propagating values or headers.
**What we should NOT copy**: 
- Blindly converting everything to Pandas immediately. Our `Table` model should be a more generic graph/node or structured JSON object that the agent can traverse.
- Flattening table data blindly into text. We will use `table-aware chunking` where chunks retain references to their source tables for deterministic calculation.

## 3. Chunking & Indexing
**RAGFlow concept**: Tokenizes and chunks based on text length and logical boundaries. Table chunks are concatenated strings of `column: value`. Embeddings are stored in Elasticsearch/Infinity.
**What we can learn**: Chunking must respect document boundaries. Tables need special chunking (row-aware).
**What we should reuse conceptually**: 
- Semantic chunking (heading-aware).
- Storing metadata (file, page, table ID) with every chunk.
**What we should NOT copy**: 
- Static chunk concatenation for tables. 
- Relying purely on Vector DB for table answers. We want our Agent to be able to extract the raw table rows for deterministic math.

## 4. Retrieval & Agentic Orchestration
**RAGFlow concept**: Baseline RAG. Vector search + Keyword search -> LLM. It has an `agent` directory but primarily relies on a linear graph flow.
**What we can learn**: Hybrid search (Vector + Keyword) is robust. 
**What we should reuse conceptually**: 
- Reranking after retrieval.
**What we should NOT copy**: 
- Linear retrieval. We need an *Agentic* loop (Plan -> Retrieve -> Verify -> Search Again).
- LLM answering directly from chunks without a hard verification gate.
- Assuming the LLM will do math correctly.

## 5. How our Agentic RAG will improve/extend it
- **Scope Guard**: Explicit filtering for out-of-scope queries before entering the agent loop.
- **Agent Orchestrator**: Uses LLM as a planner/reasoner to decide *which* tools to use (vector vs table vs metadata search) rather than a fixed pipeline.
- **Iterative Retrieval**: Will recognize missing entities (e.g., "I found CSE and ECE, but need CIVIL") and dispatch a new search.
- **Evidence Verification**: A hard programmatic gate that blocks hallucinated answers.
- **Deterministic Math**: Calculator utility invoked by the agent for aggregations.
- **NVIDIA AI Endpoints**: Leveraging cloud endpoints (`nemotron-parse`, `nemotron-3-embed`, `llama-nemotron-rerank`, `nemotron-3-super`) instead of local ML models to simplify deployment and maximize quality.
