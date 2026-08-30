# NVIDIA API Verification Report

This document outlines the exact behavior of the NVIDIA endpoints based on empirical testing against the live APIs. **This information must be used to design the database schema and document model.**

## 1. NVIDIA Nemotron Parse (nvidia/nemotron-parse)
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Authentication**: `Bearer <API_KEY>`
- **Request Format**: The model **only** accepts images. Providing plain text alongside the image (e.g. `{"type": "text", "text": "..."}`) results in a `400 Bad Request` with the error `"Content cannot be a plain string. The model does not support text input."` The payload must use the standard OpenAI `image_url` multimodal structure containing a base64 Data URI of the image.
- **Response Format**: `200 OK`. Instead of raw text in `message['content']`, the model outputs a structured payload via `tool_calls`. Specifically, it returns a function call named `markdown_bbox`. 
- **Parser Output Structure**: The `arguments` of the `markdown_bbox` function is a stringified JSON array containing bounding boxes, layout types, and extracted text.
  Example Structure:
  ```json
  [
    [
      {
        "bbox": {"xmin": 0.009, "ymin": 0.026, "xmax": 0.089, "ymax": 0.077},
        "text": "Header <br>\\nThis is a table...",
        "type": "Text"
      }
    ]
  ]
  ```
- **Recommendations for Phase 3**: The parsing pipeline must convert PDF pages to images, submit them to this endpoint, and deserialize the `markdown_bbox` arguments into our internal Document object hierarchy (Page -> Block).

## 2. NVIDIA Embeddings (nvidia/nemotron-3-embed-1b)
- **Endpoint**: `https://integrate.api.nvidia.com/v1/embeddings`
- **Request Format**: Standard OpenAI `{"input": ["..."], "model": "...", "input_type": "query"}`
- **Success Behavior**: `200 OK`
- **Batching**: Supported. Passing multiple strings returns an array of embeddings.
- **Actual Embedding Dimension**: **2048**
- **Recommendations for Phase 3**: Now that we know the exact dimension is 2048, we can safely create pgvector columns with `vector(2048)`. Do not use 1024 or 768.

## 3. NVIDIA Reranker
- **Endpoint**: `https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking` (Note: not the `integrate` base URL)
- **Model Availability (CRITICAL ERROR)**: The configured model `nvidia/llama-nemotron-rerank-v1-1b` is **UNAVAILABLE** and returned a `404 Not Found` (Unknown model). The API error explicitly stated: `Available models are: ['nvidia/rerank-qa-mistral-4b', 'nv-rerank-qa-mistral-4b:1']`.
- **Request Format**: The API strictly enforces a typed dictionary for queries and passages. Passing plain strings for passages throws a `422 Unprocessable Entity` validation error. The correct format is:
  ```json
  {
    "model": "nvidia/rerank-qa-mistral-4b",
    "query": {"text": "What are the library hours?"},
    "passages": [{"text": "Cafeteria 8-8."}, {"text": "Library 9-10."}]
  }
  ```
- **Response Format**: Returns a `rankings` array containing `index` and `logit` (relevance score).
  ```json
  {"rankings": [{"index": 1, "logit": -4.1015625}, {"index": 0, "logit": -12.28125}]}
  ```
- **Recommendations for Phase 3**: We must update our `.env` configuration to use the available `nvidia/rerank-qa-mistral-4b` model instead of the invalid one.

## 4. NVIDIA LLM (nvidia/nemotron-3-super-120b-a12b)
- **Endpoint**: `https://integrate.api.nvidia.com/v1/chat/completions`
- **Request Format**: Standard OpenAI Chat Completions `{"messages": [{"role": "user", "content": "..."}]}`
- **Response Format**: Returns `choices[0]['message']['content']`. Notably, this model also returns `reasoning_content` which includes internal chain-of-thought logic.
- **Recommendations for Phase 3**: Ensure that the application *only* returns the `content` field to the user and strips out the `reasoning_content` entirely to obey the prompt's strict rule of "Never expose chain-of-thought."
