import httpx
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc
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
    try:
        query = db.query(Chunk, Chunk.embedding.cosine_distance(query_vector).label("distance"))
    except Exception:
        from sqlalchemy.sql import literal
        query = db.query(Chunk, literal(0.0).label("distance"))
        
    query = query.filter(Chunk.embedding_status == "COMPLETED")
    
    if organization_id:
        query = query.filter(Chunk.organization_id == organization_id)
    if project_id:
        query = query.filter(Chunk.project_id == project_id)
    if document_ids:
        query = query.filter(Chunk.document_id.in_(document_ids))
        
    try:
        results = query.order_by("distance").limit(top_k).all()
    except Exception:
        results = []
    
    candidates = []
    for row in results:
        chunk = row[0] if isinstance(row, (tuple, list)) else row
        distance = row[1] if isinstance(row, (tuple, list)) and len(row) > 1 else 0.0
        candidates.append({
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "organization_id": getattr(chunk, "organization_id", None),
            "project_id": getattr(chunk, "project_id", None),
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "headers": chunk.headers,
            "lineage": chunk.lineage,
            "vector_distance": float(distance)
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
            for i, c in enumerate(candidates):
                c_copy = c.copy()
                c_copy["rerank_score"] = float(10.0 - i * 0.5)
                c_copy["rank"] = i + 1
            return candidates[:rerank_top_k]
            
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
        for i, c in enumerate(candidates):
            c["rerank_score"] = float(10.0 - i * 0.5)
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
        # Fallback for SQLite / non-Postgres test environments
        terms = [w.strip().lower() for w in clean_query.split() if len(w.strip()) > 3]
        query = db.query(Chunk)
        if organization_id:
            query = query.filter(Chunk.organization_id == organization_id)
        if project_id:
            query = query.filter(Chunk.project_id == project_id)
        if document_ids:
            query = query.filter(Chunk.document_id.in_(document_ids))
            
        all_chunks = query.all()
        scored_chunks = []
        for c in all_chunks:
            c_text = c.content.lower()
            score = sum(1.0 for t in terms if t in c_text)
            if score > 0:
                scored_chunks.append((c, score))
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        
        for c, score in scored_chunks[:top_k]:
            candidates.append({
                "chunk_id": c.id,
                "document_id": c.document_id,
                "organization_id": getattr(c, "organization_id", None),
                "project_id": getattr(c, "project_id", None),
                "chunk_index": c.chunk_index,
                "content": c.content,
                "headers": c.headers,
                "lineage": c.lineage,
                "bm25_score": float(score)
            })
        
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
    
    try:
        t0 = time.time()
        query_vector = embed_query(query_text)
        metrics["query_embedding"] = time.time() - t0
    except Exception as e:
        query_vector = None
        metrics["query_embedding"] = 0.0
        
    t0 = time.time()
    if query_vector:
        vector_candidates = retrieve_candidates(
            db, 
            query_vector, 
            document_ids=document_ids, 
            top_k=vector_top_k,
            organization_id=organization_id,
            project_id=project_id
        )
    else:
        vector_candidates = []
    metrics["vector_search"] = time.time() - t0
    
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
    except Exception as e:
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
