import pytest
from unittest.mock import patch, MagicMock
from app.intelligence.rag.adapter import RAGAdapter

def test_rag_adapter_successful_retrieval(sample_retrieved_chunks):
    mock_db = MagicMock()
    mock_candidates = [
        {
            "chunk_id": "c1",
            "document_id": "doc1",
            "chunk_index": 0,
            "content": "Sample content about CI failures.",
            "headers": {"title": "CI", "section_path": ["Logs"]},
            "lineage": {
                "document_name": "ci.pdf",
                "page_numbers": [3],
                "page_ids": ["p3"],
                "block_ids": ["b3"],
                "source_metadata": {}
            },
            "vector_distance": 0.11,
            "bm25_score": 0.95,
            "hybrid_score": 0.016,
            "rerank_score": 5.8,
            "rank": 1
        }
    ]
    mock_metrics = {"query_embedding": 0.05, "vector_search": 0.01, "reranking": 0.20}

    with patch("app.intelligence.rag.adapter.search_knowledge_base", return_value=(mock_candidates, mock_metrics, mock_candidates)):
        chunks, metrics = RAGAdapter.retrieve(
            db=mock_db,
            query="CI failures count",
            project_id="proj_123",
            company_id="comp_123"
        )

        assert len(chunks) == 1
        assert chunks[0]["chunk_id"] == "c1"
        assert chunks[0]["document_id"] == "doc1"
        assert chunks[0]["document_name"] == "ci.pdf"
        assert chunks[0]["citation"] == "ci.pdf (Pages: 3)"
        assert chunks[0]["rerank_score"] == 5.8
        assert "total_retrieval_time" in metrics

def test_rag_adapter_empty_retrieval():
    mock_db = MagicMock()
    with patch("app.intelligence.rag.adapter.search_knowledge_base", return_value=([], {}, [])):
        chunks, metrics = RAGAdapter.retrieve(
            db=mock_db,
            query="Nonexistent information",
            project_id="proj_123"
        )
        assert chunks == []
        assert "total_retrieval_time" in metrics

def test_rag_adapter_exception_resilience():
    mock_db = MagicMock()
    with patch("app.intelligence.rag.adapter.search_knowledge_base", side_effect=RuntimeError("Database connection lost")):
        chunks, metrics = RAGAdapter.retrieve(
            db=mock_db,
            query="Failing query",
            project_id="proj_123"
        )
        assert chunks == []
        assert "retrieval_error" in metrics
