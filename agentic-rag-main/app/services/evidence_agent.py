import json
import logging
import re
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.services.agent_service import call_llm, extract_json
from app.services.citation_validator import (
    validate_evidence_citation, 
    consolidate_duplicates_and_conflicts
)
from app.schemas.evidence_packet import (
    EvidencePacket, 
    EvidenceItemSchema, 
    EvidenceConflictSchema, 
    EvidenceMetrics
)

logger = logging.getLogger(__name__)

EVIDENCE_EXTRACTION_SYSTEM_PROMPT = """You are the FailureOps Dedicated Evidence Intelligence Agent.
Your sole responsibility is to extract strictly verified factual evidence from project source chunks.

CRITICAL OPERATIONAL RULES:
1. FACT VS. INTERPRETATION SEPARATION:
   - Extract only established, measurable facts, recorded metrics, documented events, constraints, customer quotes, or incidents.
   - REJECT interpretations, subjective opinions, or speculation (e.g. "Pricing might be hurt by market conditions").
2. POSITIVE & NEUTRAL METRIC INTEGRITY:
   - If a project contains positive metrics (e.g., "Activation grew to 71%", "Incidents decreased by 40%"), extract them accurately!
   - NEVER force a failure narrative or assume a project is failing.
3. METRIC NORMALIZATION:
   - When a statement contains measurable quantities, normalize them into { "metric": str, "before": float or null, "after": float, "unit": str, "direction": "INCREASE"|"DECREASE"|"STABLE" }.
4. SOURCE LINEAGE:
   - Cite the exact source chunk index.
5. NO HALLUCINATION:
   - Never invent facts, dates, or numbers not present in the source text.

OUTPUT STRICTLY A VALID JSON OBJECT with this schema:
{
  "extracted_items": [
    {
      "chunk_index": 0,
      "category": "ADOPTION|CUSTOMER|PRODUCT|FINANCIAL|OPERATIONAL|TECHNICAL|DELIVERY|QUALITY|RESOURCE|TEAM|MARKET|STRATEGY|SECURITY|DEPENDENCY|PERFORMANCE|RISK|OTHER",
      "evidence_type": "METRIC|TREND|EVENT|CUSTOMER_FEEDBACK|INCIDENT|DECISION|OBSERVATION|GOAL|CONSTRAINT|COMPLAINT|MILESTONE|RESOURCE_SIGNAL|TECHNICAL_SIGNAL|RISK_STATEMENT|OTHER",
      "statement": "Verbatim or faithful factual summary directly supported by the text",
      "normalized_value": {
        "metric": "activation_rate",
        "before": 52.0,
        "after": 33.0,
        "unit": "percent",
        "direction": "DECREASE"
      },
      "time_period": {
        "start": "2026-Q2",
        "end": "2026-Q3"
      }
    }
  ]
}
"""

def extract_evidence_from_dimension_chunks(
    dimension: str,
    chunks: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Extracts raw evidence candidates from a list of candidate chunks for a specific dimension.
    """
    if not chunks:
        return []

    # Prepare chunks text with numbered references
    chunk_payloads = []
    for idx, c in enumerate(chunks[:settings.EVIDENCE_FINAL_TOP_K]):
        lineage = c.get("lineage", {})
        doc_name = lineage.get("document_name", "Unknown Document")
        meta = lineage.get("source_metadata", {})
        loc = "General"
        if lineage.get("page_numbers"):
            loc = f"Page {', '.join(map(str, lineage['page_numbers']))}"
        elif meta.get("slide"):
            loc = f"Slide {', '.join(map(str, meta['slide']))}"
        elif meta.get("sheet"):
            loc = f"Sheet {', '.join(meta['sheet'])}"
        elif meta.get("section"):
            loc = f"Section {meta['section'][0]}"

        chunk_payloads.append(
            f"--- CHUNK {idx} ---\nSource: {doc_name} ({loc})\nContent:\n{c.get('content', '')}\n"
        )

    user_prompt = f"Dimension: {dimension}\n\nCandidate Chunks:\n" + "\n".join(chunk_payloads)

    try:
        raw_resp = call_llm(
            system_prompt=EVIDENCE_EXTRACTION_SYSTEM_PROMPT,
            user_prompt=user_prompt,
            json_mode=True,
            timeout=45.0,
            max_tokens=2048
        )
        parsed = extract_json(raw_resp)
        extracted = parsed.get("extracted_items", [])
    except Exception as e:
        logger.warning(f"[evidence_agent] LLM extraction failed for dimension {dimension}: {e}. Fallback to heuristic.")
        extracted = heuristic_extract_evidence(dimension, chunks)

    # Attach source metadata to extracted items
    enriched_items = []
    for it in extracted:
        c_idx = it.get("chunk_index", 0)
        if isinstance(c_idx, int) and 0 <= c_idx < len(chunks):
            target_chunk = chunks[c_idx]
        else:
            target_chunk = chunks[0]

        lineage = target_chunk.get("lineage", {})
        doc_name = lineage.get("document_name", "Unknown Document")
        page_nums = lineage.get("page_numbers", [])
        meta = lineage.get("source_metadata", {})
        
        loc_type = "PAGE" if page_nums else ("SLIDE" if meta.get("slide") else ("SHEET" if meta.get("sheet") else "SECTION"))
        loc_val = str(page_nums[0]) if page_nums else (str(meta.get("slide", ["1"])[0]) if meta.get("slide") else (str(meta.get("sheet", ["1"])[0]) if meta.get("sheet") else "1"))

        it["source"] = {
            "document_id": target_chunk.get("document_id", "doc_default"),
            "document_name": doc_name,
            "location_type": loc_type,
            "location_value": loc_val
        }
        it["supporting_chunk_ids"] = [target_chunk.get("chunk_id", "chk_default")]
        it["rerank_score"] = target_chunk.get("rerank_score", 5.0)
        it["chunk_content"] = target_chunk.get("content", "")
        enriched_items.append(it)

    return enriched_items


def heuristic_extract_evidence(dimension: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based fallback extractor if LLM is offline or timed out.
    """
    items = []
    for idx, c in enumerate(chunks[:5]):
        content = c.get("content", "")
        lines = [line.strip() for line in content.split("\n") if len(line.strip()) > 20]
        for line in lines:
            if any(term in line.lower() for term in ["%", "rate", "declined", "increased", "dropped", "bottleneck", "delay", "incident", "complaint", "users", "week", "hours"]):
                # Extract number
                nums = re.findall(r'\b\d+(?:\.\d+)?\b', line)
                before = float(nums[0]) if len(nums) >= 2 else None
                after = float(nums[1]) if len(nums) >= 2 else (float(nums[0]) if len(nums) == 1 else None)
                direction = "DECREASE" if any(w in line.lower() for w in ["drop", "decline", "fell", "down"]) else ("INCREASE" if any(w in line.lower() for w in ["increas", "grew", "surge", "up"]) else "STABLE")
                
                items.append({
                    "chunk_index": idx,
                    "category": dimension,
                    "evidence_type": "METRIC" if nums else "OBSERVATION",
                    "statement": line[:200],
                    "normalized_value": {
                        "metric": f"{dimension.lower()}_indicator",
                        "before": before,
                        "after": after,
                        "unit": "value",
                        "direction": direction
                    } if after is not None else None,
                    "time_period": None
                })
                break
    return items


def run_evidence_agent(
    organization_id: str,
    project_id: str,
    analysis_id: str,
    dimension_chunks_map: Dict[str, List[Dict[str, Any]]],
    total_docs_count: int = 5,
    processing_time: float = 0.0
) -> EvidencePacket:
    """
    Main orchestration of the Evidence Agent:
    1. Extracts raw candidates across all dimensions.
    2. Validates citations deterministically.
    3. Consolidates duplicates and extracts conflicts.
    4. Computes coverage matrix.
    5. Returns structured EvidencePacket.
    """
    all_raw_items = []
    rejected_count = 0
    total_chunks_count = 0
    coverage_map = {}

    for dim, chunks in dimension_chunks_map.items():
        total_chunks_count += len(chunks)
        if not chunks:
            coverage_map[dim] = "NO_EVIDENCE_FOUND"
            continue

        raw_dim_items = extract_evidence_from_dimension_chunks(dim, chunks)
        
        valid_dim_items = []
        for it in raw_dim_items:
            is_valid, confidence, reason = validate_evidence_citation(
                statement=it.get("statement", ""),
                chunk_content=it.get("chunk_content", ""),
                rerank_score=it.get("rerank_score", 5.0),
                normalized_val=it.get("normalized_value")
            )
            it["evidence_confidence"] = confidence
            if is_valid and confidence >= settings.EVIDENCE_MIN_CONFIDENCE:
                it["verification_status"] = "VERIFIED"
                valid_dim_items.append(it)
            else:
                it["verification_status"] = "REJECTED"
                rejected_count += 1
                logger.info(f"[citation_validator] Rejected item: {it.get('statement')} Reason: {reason}")

        if valid_dim_items:
            coverage_map[dim] = "FOUND"
            all_raw_items.extend(valid_dim_items)
        else:
            coverage_map[dim] = "NO_EVIDENCE_FOUND"

    # Consolidate duplicates and find contradictions
    verified_items, conflicts = consolidate_duplicates_and_conflicts(all_raw_items)

    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()

    metrics = EvidenceMetrics(
        total_documents_analyzed=total_docs_count,
        total_chunks_searched=total_chunks_count,
        total_evidence_extracted=len(all_raw_items) + rejected_count,
        verified_evidence_count=len(verified_items),
        rejected_evidence_count=rejected_count,
        conflicts_count=len(conflicts),
        processing_time_seconds=round(processing_time, 2)
    )

    return EvidencePacket(
        project_id=project_id,
        analysis_id=analysis_id,
        organization_id=organization_id,
        generated_at=now_str,
        evidence=verified_items,
        conflicts=conflicts,
        coverage=coverage_map,
        metrics=metrics
    )
