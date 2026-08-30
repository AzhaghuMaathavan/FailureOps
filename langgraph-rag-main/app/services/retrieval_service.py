import httpx
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import Float
from app.models.chunk import Chunk
from app.core.config import settings
from app.services.embedding_service import embed_query

logger = logging.getLogger(__name__)

def retrieve_candidates(
    db: Session, 
    query_vector: List[float], 
    document_ids: Optional[List[str]] = None, 
    top_k: int = 15,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    if not query_vector:
        raise RuntimeError("Query embedding is empty; cannot run pgvector search.")
    if getattr(db.bind, "dialect", None) and getattr(db.bind.dialect, "name", "") == "sqlite":
        # In-memory SQLite test fallback
        query = db.query(Chunk).filter(Chunk.embedding_status == "COMPLETED")
        if organization_id:
            query = query.filter(Chunk.organization_id == organization_id)
        if project_id:
            query = query.filter(Chunk.project_id == project_id)
        if document_ids:
            query = query.filter(Chunk.document_id.in_(document_ids))
        sqlite_chunks = query.limit(top_k).all()
        candidates = []
        for c in sqlite_chunks:
            doc_name = c.lineage.get("document_name", "document") if isinstance(c.lineage, dict) else "document"
            page_num = c.lineage.get("page_numbers", [1])[0] if isinstance(c.lineage, dict) and c.lineage.get("page_numbers") else 1
            candidates.append({
                "chunk_id": c.id,
                "document_id": c.document_id,
                "document_name": doc_name,
                "content": c.content,
                "distance": 0.1,
                "vector_score": 0.9,
                "page_number": page_num,
                "lineage": c.lineage or {},
                "headers": c.headers or {}
            })
        return candidates

    # SafeVector wraps pgvector Vector. The <=> result is a float; without return_type
    # SQLAlchemy treats the distance column as a vector and crashes on result processing.
    distance_expr = Chunk.embedding.op("<=>", return_type=Float)(query_vector).label("distance")
    query = db.query(Chunk, distance_expr)
    query = query.filter(Chunk.embedding_status == "COMPLETED")
    query = query.filter(Chunk.embedding.isnot(None))
    
    if organization_id:
        query = query.filter(Chunk.organization_id == organization_id)
    if project_id:
        query = query.filter(Chunk.project_id == project_id)
    if document_ids:
        query = query.filter(Chunk.document_id.in_(document_ids))
        
    try:
        results = query.order_by(distance_expr).limit(top_k).all()
    except Exception as exc:
        logger.error("[VECTOR SEARCH] query failed: %s", exc)
        raise RuntimeError(f"pgvector similarity search failed: {exc}") from exc
    
    candidates = []
    for row in results:
        mapping = getattr(row, "_mapping", None)
        if mapping is not None:
            chunk = mapping.get("Chunk")
            dist_val = mapping.get("distance", 0.0)
        elif hasattr(row, "Chunk"):
            chunk = row.Chunk
            dist_val = getattr(row, "distance", 0.0)
        else:
            chunk = row[0]
            dist_val = row[1] if len(row) > 1 else 0.0

        candidates.append({
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "organization_id": getattr(chunk, "organization_id", None),
            "project_id": getattr(chunk, "project_id", None),
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "headers": chunk.headers,
            "lineage": chunk.lineage,
            "vector_distance": float(dist_val or 0.0)
        })
        
    return candidates


from app.services.llm_key_manager import key_manager

def rerank_candidates(query_text: str, candidates: List[Dict[str, Any]], rerank_top_k: int = 5, exhaustive: bool = False) -> List[Dict[str, Any]]:
    if not candidates:
        return []
        
    MAX_CHARS_TOTAL = 120000
    MAX_CHARS_PER_PASSAGE = 4000
    safe_candidates = []
    passages = []
    current_chars = len(query_text)
    
    for c in candidates:
        text = c["content"]
        if len(text) > MAX_CHARS_PER_PASSAGE:
            text = text[:MAX_CHARS_PER_PASSAGE] + "... [TRUNCATED]"
            
        if current_chars + len(text) > MAX_CHARS_TOTAL:
            break
            
        passages.append({"text": text})
        safe_candidates.append(c)
        current_chars += len(text)
        
    if not safe_candidates:
        return []
        
    candidates = safe_candidates
    
    payload = {
        "model": settings.NVIDIA_RERANK_MODEL,
        "query": {"text": query_text},
        "passages": passages
    }
    
    max_retries = 3
    data = {"rankings": []}
    for attempt in range(max_retries):
        api_key = key_manager.get_next_key()
        if not api_key:
            logger.warning("[RERANK] no API key configured; using retrieval rank order")
            ranked = []
            for i, c in enumerate(candidates[:rerank_top_k]):
                c_copy = c.copy()
                c_copy["rerank_score"] = float(c.get("hybrid_score") or -(c.get("vector_distance") or 0.0))
                c_copy["rank"] = i + 1
                ranked.append(c_copy)
            return ranked
            
        key_label = key_manager.get_key_label(api_key)
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        try:
            timeout = 10.0 if settings.DEMO_MODE else 30.0
            resp = httpx.post(settings.NVIDIA_RERANK_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            break
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                key_manager.mark_rate_limited(api_key, backoff_seconds=15.0)
                if attempt == max_retries - 1:
                    return candidates[:rerank_top_k]
            elif status in (401, 403):
                key_manager.mark_invalid(api_key)
                if attempt == max_retries - 1:
                    return candidates[:rerank_top_k]
            elif status >= 500:
                key_manager.mark_rate_limited(api_key, backoff_seconds=2.0)
                if attempt == max_retries - 1:
                    return candidates[:rerank_top_k]
            else:
                return candidates[:rerank_top_k]
        except (httpx.TimeoutException, Exception) as e:
            return candidates[:rerank_top_k]

    rankings = data.get("rankings", [])
    if not rankings:
        logger.warning("[RERANK] empty rankings; using retrieval order")
        for i, c in enumerate(candidates[:rerank_top_k]):
            c["rerank_score"] = float(c.get("hybrid_score") or -(c.get("vector_distance") or 0.0))
            c["rank"] = i + 1
        return candidates[:rerank_top_k]
        
    ranked_results = []
    for i, rank_info in enumerate(rankings):
        score = float(rank_info.get("logit", 0.0))
        if i >= rerank_top_k:
            break
            
        original_idx = rank_info.get("index", i)
        if original_idx < len(candidates):
            candidate = candidates[original_idx].copy()
            candidate["rerank_score"] = score
            candidate["rank"] = i + 1
            ranked_results.append(candidate)
        
    return ranked_results

def retrieve_bm25_candidates(
    db: Session, 
    query_text: str, 
    document_ids: Optional[List[str]] = None, 
    top_k: int = 15,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    from sqlalchemy import text
    
    clean_query = query_text.replace("'", "").replace('"', "").replace(":", "").replace("\\", "").strip()
    if not clean_query:
        return []
        
    or_query = " OR ".join(clean_query.split())
        
    base_sql = """
        SELECT id, document_id, chunk_index, content, headers, lineage, organization_id, project_id,
               ts_rank_cd(to_tsvector('english', content), websearch_to_tsquery('english', :query)) AS rank_score
        FROM chunks
        WHERE to_tsvector('english', content) @@ websearch_to_tsquery('english', :query)
    """
    
    params = {"query": or_query}
    
    if organization_id:
        base_sql += " AND organization_id = :org_id "
        params["org_id"] = organization_id
    if project_id:
        base_sql += " AND project_id = :proj_id "
        params["proj_id"] = project_id
    if document_ids:
        base_sql += " AND document_id = ANY(:doc_ids) "
        params["doc_ids"] = document_ids
        
    base_sql += " ORDER BY rank_score DESC LIMIT :top_k"
    params["top_k"] = top_k
    
    candidates = []
    try:
        results = db.execute(text(base_sql), params).fetchall()
        for row in results:
            candidates.append({
                "chunk_id": row.id,
                "document_id": row.document_id,
                "organization_id": getattr(row, "organization_id", None),
                "project_id": getattr(row, "project_id", None),
                "chunk_index": row.chunk_index,
                "content": row.content,
                "headers": row.headers,
                "lineage": row.lineage,
                "bm25_score": float(row.rank_score)
            })
    except Exception as e:
        logger.debug("[BM25] PostgreSQL tsvector search unavailable, attempting SQLite/generic fallback: %s", e)
        try:
            from app.models.chunk import Chunk
            q = db.query(Chunk)
            if organization_id:
                q = q.filter(Chunk.organization_id == organization_id)
            if project_id:
                q = q.filter(Chunk.project_id == project_id)
            if document_ids:
                q = q.filter(Chunk.document_id.in_(document_ids))
            
            # Simple keyword matching fallback
            words = [w.lower() for w in clean_query.split() if len(w) > 3][:5]
            rows = q.limit(top_k * 2).all()
            for r in rows:
                content_lower = (r.content or "").lower()
                matches = sum(1 for w in words if w in content_lower)
                score = matches / max(1, len(words))
                candidates.append({
                    "chunk_id": r.id,
                    "document_id": r.document_id,
                    "organization_id": r.organization_id,
                    "project_id": r.project_id,
                    "chunk_index": r.chunk_index,
                    "content": r.content,
                    "headers": r.headers,
                    "lineage": r.lineage,
                    "bm25_score": float(score)
                })
            candidates.sort(key=lambda x: x["bm25_score"], reverse=True)
            candidates = candidates[:top_k]
        except Exception as fallback_err:
            logger.error("[BM25] Fallback search also failed: %s", fallback_err)
            return []
    return candidates

def reciprocal_rank_fusion(vector_candidates: List[Dict], bm25_candidates: List[Dict], k: int = 60) -> List[Dict]:
    fusion_scores = {}
    candidate_map = {}
    
    for idx, c in enumerate(vector_candidates):
        cid = c["chunk_id"]
        if cid not in candidate_map:
            candidate_map[cid] = c.copy()
            candidate_map[cid].setdefault("vector_distance", 1.0)
            fusion_scores[cid] = 0.0
        rank = idx + 1
        fusion_scores[cid] += 1.0 / (k + rank)
        
    for idx, c in enumerate(bm25_candidates):
        cid = c["chunk_id"]
        if cid not in candidate_map:
            candidate_map[cid] = c.copy()
            candidate_map[cid].setdefault("bm25_score", c.get("bm25_score", 0.0))
            fusion_scores[cid] = 0.0
        rank = idx + 1
        fusion_scores[cid] += 1.0 / (k + rank)
        
    fused = []
    for cid, score in sorted(fusion_scores.items(), key=lambda x: x[1], reverse=True):
        candidate = candidate_map[cid]
        candidate["hybrid_score"] = score
        fused.append(candidate)
        
    return fused

def search_knowledge_base(
    db: Session, 
    query_text: str, 
    document_ids: Optional[List[str]] = None, 
    filters: Optional[Dict[str, Any]] = None,
    organization_id: Optional[str] = None,
    project_id: Optional[str] = None
) -> Tuple[List[Dict[str, Any]], Dict[str, float], List[Dict[str, Any]]]:
    rerank_top_k = settings.RERANK_TOP_K
    vector_top_k = settings.HYBRID_VECTOR_TOP_K if settings.HYBRID_SEARCH_ENABLED else settings.TOP_K
    bm25_top_k = settings.HYBRID_BM25_TOP_K
    
    exhaustive_rerank = False
    if filters:
        scope = filters.get("retrieval_scope", "MULTI_FACT")
        logical_op = filters.get("logical_operation", "SINGLE_TARGET")
        
        if scope == "EXHAUSTIVE_LIST" or logical_op == "UNION":
            rerank_top_k = 150
            vector_top_k = 300
            bm25_top_k = 300
            exhaustive_rerank = True
        elif scope == "COMPARISON":
            rerank_top_k = 15
            vector_top_k = 30
            bm25_top_k = 30
        elif scope == "MULTI_FACT":
            rerank_top_k = 10
            vector_top_k = 20
            bm25_top_k = 20
        elif scope == "EXACT_LOOKUP" or logical_op == "INTERSECTION":
            rerank_top_k = 5
            vector_top_k = 10
            bm25_top_k = 30
        elif scope == "SIMPLE_FACTUAL":
            rerank_top_k = 5
            vector_top_k = 10
            bm25_top_k = 10
        elif scope == "SEMANTIC":
            rerank_top_k = 5
            vector_top_k = 15
            bm25_top_k = 10

    metrics = {}
    
    logger.info("[QUERY EMBEDDING] chars=%s", len(query_text or ""))
    try:
        t0 = time.time()
        query_vector = embed_query(query_text)
        metrics["query_embedding"] = time.time() - t0
        logger.info("[QUERY EMBEDDING] dim=%s elapsed_ms=%s", len(query_vector or []), int(metrics["query_embedding"] * 1000))
    except Exception as e:
        logger.error("[QUERY EMBEDDING] failed: %s", e)
        raise RuntimeError(f"Embedding generation failed: {e}") from e
        
    t0 = time.time()
    logger.info("[VECTOR SEARCH] top_k=%s project_id=%s", vector_top_k, project_id)
    vector_candidates = retrieve_candidates(
        db, 
        query_vector, 
        document_ids=document_ids, 
        top_k=vector_top_k,
        organization_id=organization_id,
        project_id=project_id
    )
    metrics["vector_search"] = time.time() - t0
    logger.info("[VECTOR SEARCH] candidates=%s", len(vector_candidates))
    
    candidates = vector_candidates
    
    if settings.HYBRID_SEARCH_ENABLED:
        t_bm25 = time.time()
        bm25_candidates = retrieve_bm25_candidates(
            db, 
            query_text, 
            document_ids=document_ids, 
            top_k=bm25_top_k,
            organization_id=organization_id,
            project_id=project_id
        )
        metrics["bm25_search"] = time.time() - t_bm25
        
        t_fusion = time.time()
        candidates = reciprocal_rank_fusion(vector_candidates, bm25_candidates, k=settings.HYBRID_RRF_K)
        metrics["hybrid_fusion"] = time.time() - t_fusion
        
    try:
        t0 = time.time()
        final_evidence = rerank_candidates(query_text, candidates, rerank_top_k=rerank_top_k, exhaustive=exhaustive_rerank)
        metrics["reranking"] = time.time() - t0
        logger.info("[RETRIEVED CHUNKS] count=%s", len(final_evidence))
    except Exception as e:
        logger.warning("[RERANK] failed (%s); using retrieval order", e)
        final_evidence = candidates[:rerank_top_k]
        metrics["reranking"] = 0.0
        
    return final_evidence, metrics, candidates


def expand_chunk_context(db: Session, final_evidence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not final_evidence:
        return []
    seen_ids = set()
    deduped = []
    for chunk in final_evidence:
        cid = chunk.get("chunk_id", chunk.get("id"))
        if cid and cid in seen_ids:
            continue
        if cid:
            seen_ids.add(cid)
        deduped.append(chunk)
    
    return deduped
