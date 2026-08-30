import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.schemas.evidence_packet import (
    EvidenceItemSchema, 
    EvidenceConflictSchema, 
    ConflictClaim, 
    EvidenceSource, 
    SupportingSource
)

logger = logging.getLogger(__name__)

def clean_text_for_matching(text: str) -> str:
    return re.sub(r'[^\w\s%.-]', ' ', text.lower()).strip()

def validate_evidence_citation(
    statement: str, 
    chunk_content: str, 
    rerank_score: float = 5.0,
    normalized_val: Optional[Dict[str, Any]] = None
) -> Tuple[bool, float, str]:
    """
    Deterministically validates whether the source chunk content actually supports the statement.
    Returns (is_valid, computed_confidence, reason)
    """
    if not chunk_content or not statement:
        return False, 0.0, "MISSING_CONTENT"

    stmt_clean = clean_text_for_matching(statement)
    chunk_clean = clean_text_for_matching(chunk_content)

    # 1. Number & Metric Verification
    # Extract numerical tokens (e.g. "52%", "33", "28.6", "4 weeks")
    stmt_numbers = re.findall(r'\b\d+(?:\.\d+)?%?\b', statement)
    matched_numbers = 0
    for num in stmt_numbers:
        if num.lower() in chunk_content.lower():
            matched_numbers += 1

    number_score = (matched_numbers / len(stmt_numbers)) if stmt_numbers else 1.0

    # 2. Keyword overlap score
    stmt_words = [w for w in stmt_clean.split() if len(w) > 3 and w not in {
        "from", "that", "this", "with", "have", "been", "were", "what", "which", "about", "project"
    }]
    if not stmt_words:
        keyword_score = 0.8
    else:
        matched_words = sum(1 for w in stmt_words if w in chunk_clean)
        keyword_score = matched_words / len(stmt_words)

    # 3. Reranker logit normalization (mapping logit -10..+10 to 0.5..1.0)
    norm_rerank = max(0.0, min(1.0, (rerank_score + 10.0) / 20.0))

    # Composite Confidence Calculation:
    # 40% Keyword Grounding + 35% Numerical Accuracy + 25% Reranker Score
    confidence = round(0.40 * keyword_score + 0.35 * number_score + 0.25 * norm_rerank, 3)
    confidence = max(0.10, min(0.99, confidence))

    # Verification threshold
    # If the statement mentions specific numbers but NONE exist in the source chunk -> REJECT
    if stmt_numbers and matched_numbers == 0:
        return False, confidence, "NUMERICAL_MISMATCH"

    if keyword_score < 0.25:
        return False, confidence, "INSUFFICIENT_KEYWORD_GROUNDING"

    return True, confidence, "SUPPORTED"


def consolidate_duplicates_and_conflicts(
    raw_evidence_items: List[Dict[str, Any]]
) -> Tuple[List[EvidenceItemSchema], List[EvidenceConflictSchema]]:
    """
    Consolidates identical facts across multiple documents and detects contradictions.
    """
    consolidated_items: List[EvidenceItemSchema] = []
    conflicts: List[EvidenceConflictSchema] = []
    
    # Map topics to extracted items for deduplication & conflict detection
    topic_map: Dict[str, List[Dict[str, Any]]] = {}

    for item in raw_evidence_items:
        metric_name = (item.get("normalized_value") or {}).get("metric")
        category = item.get("category", "OTHER")
        stmt_lower = item.get("statement", "").lower().strip()
        
        # Deduplication key: metric name if present, else first 60 chars of statement
        key = f"{category}:{metric_name}" if metric_name else f"{category}:{stmt_lower[:60]}"
        topic_map.setdefault(key, []).append(item)

    conflict_counter = 1
    evidence_counter = 1

    for key, items in topic_map.items():
        if not items:
            continue

        # Check for numerical value contradictions
        metric_values = []
        for it in items:
            norm = it.get("normalized_value")
            if norm and norm.get("after") is not None:
                metric_values.append((norm.get("after"), it))

        # If distinct metric values exist for the exact same metric, record a conflict!
        distinct_vals = set(v[0] for v in metric_values)
        if len(distinct_vals) > 1:
            claims = []
            for val, it in metric_values:
                src = it.get("source", {})
                loc = f"{src.get('location_type', 'LOC')}: {src.get('location_value', 'N/A')}"
                claims.append(ConflictClaim(
                    value=f"{val} {it.get('normalized_value', {}).get('unit', '')}".strip(),
                    source=f"{src.get('document_name', 'Doc')} ({loc})",
                    chunk_id=it.get("supporting_chunk_ids", [None])[0]
                ))
            
            conflicts.append(EvidenceConflictSchema(
                id=f"conf_{conflict_counter:03d}",
                topic=key.split(":")[-1],
                category=items[0].get("category", "OTHER"),
                claims=claims,
                status="UNRESOLVED"
            ))
            conflict_counter += 1

        # Consolidate into single primary evidence item with multiple supporting sources
        primary = items[0]
        supporting_sources = []
        all_chunk_ids = []

        for it in items:
            src = it.get("source", {})
            supporting_sources.append(SupportingSource(
                document_id=src.get("document_id", "unknown"),
                document_name=src.get("document_name", "Unknown Document"),
                location=f"{src.get('location_type', 'Loc')}: {src.get('location_value', 'N/A')}"
            ))
            for cid in it.get("supporting_chunk_ids", []):
                if cid not in all_chunk_ids:
                    all_chunk_ids.append(cid)

        # Average confidence among supporting sources
        avg_conf = round(sum(it.get("evidence_confidence", 0.85) for it in items) / len(items), 3)

        src_dict = dict(primary.get("source", {
            "document_id": "doc_default",
            "document_name": "Source Document"
        }))
        item_source_type = primary.get("source_type") or src_dict.get("source_type", "PRODUCT_PLAN")
        src_dict["source_type"] = item_source_type

        consolidated_items.append(EvidenceItemSchema(
            id=f"ev_{evidence_counter:03d}",
            category=primary.get("category", "OTHER"),
            source_type=item_source_type,
            evidence_category=primary.get("evidence_category") or primary.get("category", "OTHER"),
            evidence_type=primary.get("evidence_type", "OBSERVATION"),
            statement=primary.get("statement", ""),
            normalized_value=primary.get("normalized_value"),
            time_period=primary.get("time_period"),
            source=EvidenceSource(**src_dict),
            supporting_sources=supporting_sources,
            supporting_chunk_ids=all_chunk_ids,
            evidence_confidence=avg_conf,
            verification_status=primary.get("verification_status", "VERIFIED"),
            privacy=primary.get("privacy", {"visibility": "PRIVATE", "global_learning_allowed": False})
        ))
        evidence_counter += 1


    return consolidated_items, conflicts
