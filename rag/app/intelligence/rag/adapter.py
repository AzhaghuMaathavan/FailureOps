import time
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.services.retrieval_service import search_knowledge_base
from app.services.query_understanding import analyze_query
from ..config import intelligence_settings

logger = logging.getLogger(__name__)

class RAGAdapter:
    """
    Adapter wrapping the existing working RAG retrieval service.
    Preserves 100% of chunk lineage, citations, and rerank scores without modifying RAG internals.
    """

    @staticmethod
    def retrieve(
        db: Session,
        query: str,
        project_id: str,
        company_id: Optional[str] = None,
        document_ids: Optional[List[str]] = None,
        options: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
        """
        Executes hybrid retrieval + reranking via existing RAG.
        Returns: (retrieved_chunks, metrics)
        """
        t0 = time.time()
        options = options or {}
        
        # 1. Heuristic query scope analysis using existing query understanding
        query_filters = analyze_query(query)
        
        # 2. Call existing hybrid search + reranker
        try:
            final_evidence, metrics, initial_candidates = search_knowledge_base(
                db=db,
                query_text=query,
                document_ids=document_ids,
                filters=query_filters
            )
        except Exception as e:
            logger.error(f"[RAGAdapter] Failed to execute search_knowledge_base: {e}")
            return [], {"retrieval_error": str(e), "total_retrieval_time": time.time() - t0}

        metrics["total_retrieval_time"] = time.time() - t0

        # 3. Format chunks for LangGraph state while strictly preserving citation lineage
        formatted_chunks: List[Dict[str, Any]] = []
        max_chunks = options.get("max_chunks", intelligence_settings.MAX_RETRIEVED_CHUNKS)

        for chunk in final_evidence[:max_chunks]:
            cid = chunk.get("chunk_id", chunk.get("id"))
            doc_id = chunk.get("document_id")
            lineage = chunk.get("lineage", {})
            headers = chunk.get("headers", {})
            
            doc_name = lineage.get("document_name") or "Unknown Document"
            pages = lineage.get("page_numbers", [])
            page_str = f" (Pages: {', '.join(map(str, pages))})" if pages else ""
            formatted_citation = f"{doc_name}{page_str}"

            formatted_chunks.append({
                "chunk_id": cid,
                "document_id": doc_id,
                "document_name": doc_name,
                "project_id": project_id,
                "company_id": company_id,
                "chunk_index": chunk.get("chunk_index", 0),
                "content": chunk.get("content", ""),
                "headers": headers,
                "lineage": lineage,
                "citation": formatted_citation,
                "vector_distance": chunk.get("vector_distance"),
                "bm25_score": chunk.get("bm25_score"),
                "rerank_score": chunk.get("rerank_score"),
                "rank": chunk.get("rank")
            })

        logger.info(f"[RAGAdapter] Retrieved {len(formatted_chunks)} chunks for project {project_id} in {metrics['total_retrieval_time']:.2f}s")
        return formatted_chunks, metrics
