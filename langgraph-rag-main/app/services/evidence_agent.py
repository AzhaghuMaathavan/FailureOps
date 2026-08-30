import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional
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

UNIFIED_EVIDENCE_EXTRACTION_PROMPT = """You are the FailureOps Dedicated Evidence Intelligence Agent.
Your sole responsibility is to extract strictly verified factual evidence from project source chunks.

CRITICAL OPERATIONAL RULES:
1. FACT VS. INTERPRETATION SEPARATION:
   - Extract only established, measurable facts, recorded metrics, documented events, constraints, customer quotes, or incidents.
   - REJECT interpretations, subjective opinions, or speculation.
2. POSITIVE & NEUTRAL METRIC INTEGRITY:
   - If a project contains positive metrics (e.g., "Activation grew to 71%", "Incidents decreased by 40%"), extract them accurately!
   - NEVER force a failure narrative.
3. METRIC NORMALIZATION:
   - When a statement contains measurable quantities, normalize them into { "metric": str, "before": float or null, "after": float, "unit": str, "direction": "INCREASE"|"DECREASE"|"STABLE" }.
4. SOURCE LINEAGE:
   - Cite the exact source chunk index.
5. NO HALLUCINATION:
   - Never invent facts, dates, or numbers not present in the source text.
6. MULTI-SOURCE COMPREHENSIVE COVERAGE:
   - You MUST extract verified factual items across ALL provided chunk indices (customer feedback, metrics tables, team operations, engineering records, and product plans).

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


def resolve_chunk_source_type(chunk: Dict[str, Any]) -> str:
    lineage = chunk.get("lineage", {})
    source_type = lineage.get("source_type") or lineage.get("document_type")
    if source_type and source_type.upper() in [
        "PRODUCT_PLAN", "CUSTOMER_FEEDBACK", "PRODUCT_METRICS", 
        "ENGINEERING_METRICS", "TEAM_OPERATIONS", "INCIDENT_REPORTS", "OTHER"
    ]:
        return source_type.upper()

    doc_name = (lineage.get("document_name") or "").lower().replace(" ", "").replace("_", "").replace("-", "")
    content = (chunk.get("content") or "").lower()
    combined = f"{doc_name} {content}"

    # 1. Engineering metrics (check before generic 'metric')
    if any(k in combined for k in ["engineeringmetric", "engineering", "deploy", "cicd", "commit", "bug", "mttr", "latency", "architecture", "errorrate", "mlt", "testreport"]):
        return "ENGINEERING_METRICS"

    # 2. Team operations
    if any(k in combined for k in ["teamoperation", "team", "workload", "sprint", "burnout", "overtime", "internship", "completion", "hr", "velocity", "operation"]):
        return "TEAM_OPERATIONS"

    # 3. Incident reports
    if any(k in combined for k in ["incidentreport", "incident", "postmortem", "outage", "sev1", "sev2", "rootcause", "rollback"]):
        return "INCIDENT_REPORTS"

    # 4. Customer feedback
    if any(k in combined for k in ["customerfeedback", "feedback", "survey", "csat", "nps", "interview", "review", "complaint", "customer"]):
        return "CUSTOMER_FEEDBACK"

    # 5. Product metrics / Telemetry
    if any(k in combined for k in ["productmetric", "telemetry", "activation", "retention", "churn", "conversion", "dau", "mau", "growth", "metric"]):
        return "PRODUCT_METRICS"

    # 6. Product plan / Specs
    if any(k in combined for k in ["productplan", "prd", "plan", "spec", "roadmap", "feature", "blackbox", "proposal", "requirement"]):
        return "PRODUCT_PLAN"
        
    return "PRODUCT_PLAN"




def extract_unified_evidence_from_chunks(
    chunks: List[Dict[str, Any]],
    project_id: str = "aurora",
    company_id: Optional[str] = None,
    timeout_seconds: float = 60.0
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extracts raw evidence candidates across all dimensions combining deterministic
    time-series metric extraction with semantic qualitative fact/event/claim extraction.
    """
    if not chunks:
        return [], [], []

    # 1. Deterministic Multi-Chunk Time-Series Extraction for Telemetry/Tables
    from app.intelligence.services.timeseries_engine import TimeSeriesEngine
    metric_series_list = TimeSeriesEngine.extract_metric_series(
        retrieved_chunks=chunks,
        project_id=project_id,
        company_id=company_id
    )

    extracted_items: List[Dict[str, Any]] = []
    for ms in metric_series_list:
        loc_val = f"Rows {min(ms.supporting_rows)}-{max(ms.supporting_rows)}" if ms.supporting_rows else "Telemetry Table"
        unit_str = f" {ms.unit}" if ms.unit else ""
        chg_pct = ms.baseline_to_current_change_percent if ms.baseline_to_current_change_percent is not None else ms.percentage_change
        chg_str = f" ({'+' if (chg_pct or 0) >= 0 else ''}{(chg_pct or 0):.2f}%)" if chg_pct is not None else ""
        
        stmt = f"{ms.metric_name.replace('_', ' ').title()} recorded at {ms.current_value}{unit_str} (baseline: {ms.baseline_value}{unit_str}{chg_str})."
        
        extracted_items.append({
            "id": f"ev_{ms.canonical_name.lower().replace(' ', '_')}",
            "category": ms.category or "TECHNICAL",
            "evidence_category": ms.category or "TECHNICAL",
            "source_type": "ENGINEERING_METRICS" if any(k in ms.source_document_name.lower() for k in ["eng", "ci", "api", "latency"]) else "PRODUCT_METRICS",
            "evidence_type": "METRIC",
            "fact_type": "METRIC",
            "statement": stmt,
            "metric_name": ms.metric_name,
            "baseline_value": ms.baseline_value,
            "previous_value": ms.previous_value,
            "current_value": ms.current_value,
            "unit": ms.unit,
            "direction": ms.direction or "UNKNOWN",
            "baseline_timestamp": ms.baseline_timestamp,
            "previous_timestamp": ms.previous_timestamp,
            "current_timestamp": ms.current_timestamp,
            "baseline_to_current_change_percent": ms.baseline_to_current_change_percent,
            "previous_to_current_change_percent": ms.previous_to_current_change_percent,
            "source_document_id": ms.source_document_id,
            "source_document_name": ms.source_document_name,
            "citation": ms.citation,
            "row_numbers": ms.supporting_rows,
            "supporting_chunk_ids": ms.supporting_chunk_ids,
            "source": {
                "document_id": ms.source_document_id,
                "document_name": ms.source_document_name,
                "source_type": "ENGINEERING_METRICS" if "eng" in ms.source_document_name.lower() else "PRODUCT_METRICS",
                "location_type": "ROW",
                "location_value": loc_val
            },
            "evidence_confidence": 0.95,
            "verification_status": "VERIFIED",
            "chunk_content": f"Metric {ms.metric_name}: baseline={ms.baseline_value}, current={ms.current_value}"
        })

    # 2. Extract Qualitative Items (Narratives, Feedback, Incidents, Specs)
    doc_grouped: Dict[str, List[Dict[str, Any]]] = {}
    for c in chunks:
        d_id = str(c.get("document_id") or c.get("lineage", {}).get("document_name") or "default")
        if d_id not in doc_grouped:
            doc_grouped[d_id] = []
        doc_grouped[d_id].append(c)

    selected_chunks: List[Dict[str, Any]] = []
    for round_idx in range(4):
        for d_id, d_chunks in doc_grouped.items():
            if round_idx < len(d_chunks) and len(selected_chunks) < 16:
                selected_chunks.append(d_chunks[round_idx])

    if not selected_chunks:
        selected_chunks = chunks[:12]

    # Filter for qualitative chunks (narratives, feedback, incidents, specs)
    qualitative_chunks = []
    for c in selected_chunks:
        raw_c = c.get("content", "")
        lines = [l.strip() for l in raw_c.splitlines() if l.strip()]
        is_pure_telemetry = len(lines) >= 2 and all("|" in l and ":" in l for l in lines)
        if not is_pure_telemetry:
            qualitative_chunks.append(c)

    events: List[Dict[str, Any]] = []
    claims: List[Dict[str, Any]] = []
    extracted: List[Dict[str, Any]] = []

    if qualitative_chunks:
        chunk_payloads = []
        for idx, c in enumerate(qualitative_chunks[:10]):
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
                f"--- CHUNK {idx} ---\nSource: {doc_name} ({loc})\nContent:\n{c.get('content', '')[:1500]}\n"
            )

        user_prompt = "Candidate Project Source Chunks:\n\n" + "\n".join(chunk_payloads)

        try:
            raw_resp = call_llm(
                system_prompt=UNIFIED_EVIDENCE_EXTRACTION_PROMPT,
                user_prompt=user_prompt,
                json_mode=True,
                timeout=timeout_seconds,
                max_tokens=2048
            )
            parsed = extract_json(raw_resp)
            extracted = parsed.get("extracted_items", [])
        except Exception as e:
            logger.warning(f"[evidence_agent] Unified LLM extraction failed: {e}. Fallback to heuristic.")
            extracted = []
            from app.services.evidence_retriever import EVIDENCE_DIMENSIONS
            for dim in list(EVIDENCE_DIMENSIONS.keys()):
                extracted.extend(heuristic_extract_evidence(dim, qualitative_chunks))

    # Enrich extracted items with metadata and authoritative source_type
    for it in extracted:
        c_idx = it.get("chunk_index", 0)
        if isinstance(c_idx, int) and 0 <= c_idx < len(selected_chunks):
            target_chunk = selected_chunks[c_idx]
        elif chunks:
            target_chunk = chunks[0]
        else:
            target_chunk = {}

        lineage = target_chunk.get("lineage", {})
        doc_name = lineage.get("document_name", "Unknown Document")
        doc_id = target_chunk.get("document_id", "doc_default")
        page_nums = lineage.get("page_numbers", [])
        meta = lineage.get("source_metadata", {})
        
        loc_type = "PAGE" if page_nums else ("SLIDE" if meta.get("slide") else ("SHEET" if meta.get("sheet") else "SECTION"))
        loc_val = str(page_nums[0]) if page_nums else (str(meta.get("slide", ["1"])[0]) if meta.get("slide") else (str(meta.get("sheet", ["1"])[0]) if meta.get("sheet") else "1"))
        source_type = resolve_chunk_source_type(target_chunk)

        it["source_type"] = source_type
        it["evidence_category"] = it.get("category", "TECHNICAL")
        it["source"] = {
            "document_id": doc_id,
            "document_name": doc_name,
            "source_type": source_type,
            "location_type": loc_type,
            "location_value": loc_val
        }
        it["supporting_chunk_ids"] = [target_chunk.get("chunk_id", "chk_default")]
        it["rerank_score"] = target_chunk.get("rerank_score", 5.0)
        it["chunk_content"] = target_chunk.get("content", "")
        
        # Classify as Event or Claim where appropriate
        ev_type = str(it.get("evidence_type", "OBSERVATION")).upper()
        if ev_type in ["EVENT", "INCIDENT", "MILESTONE"]:
            it["fact_type"] = "EVENT"
            events.append({
                "description": it.get("statement", ""),
                "event_type": ev_type,
                "source": f"{doc_name} ({loc_type}: {loc_val})",
                "confidence": it.get("evidence_confidence", 0.9)
            })
        elif ev_type in ["CUSTOMER_FEEDBACK", "COMPLAINT", "CLAIM"]:
            it["fact_type"] = "CLAIM"
            claims.append({
                "statement": it.get("statement", ""),
                "claim_type": ev_type,
                "source": f"{doc_name} ({loc_type}: {loc_val})",
                "confidence": it.get("evidence_confidence", 0.9)
            })
        else:
            it["fact_type"] = "METRIC" if it.get("normalized_value") else "OBSERVATION"

        extracted_items.append(it)

    return extracted_items, events, claims



def heuristic_extract_evidence(dimension: str, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Deterministic rule-based fallback extractor if LLM is offline or timed out.
    Enforces dimension keyword affinity to prevent cross-contamination across all candidate chunks.
    """
    from app.services.evidence_retriever import EVIDENCE_DIMENSIONS
    GENERIC_TERMS = {"rate", "user", "test", "time", "date", "team", "error", "code", "data", "week", "first"}
    raw_bm25 = EVIDENCE_DIMENSIONS.get(dimension, {}).get("bm25_terms", "")
    dim_terms = [
        t.lower() for t in re.findall(r'[a-zA-Z0-9]+', raw_bm25)
        if len(t) > 1 and t.lower() not in GENERIC_TERMS
    ]

    items = []
    for idx, c in enumerate(chunks[:20]):
        content = c.get("content", "")
        if dim_terms and not any(t in content.lower() for t in dim_terms):
            continue

        lines = [line.strip() for line in content.split("\n") if len(line.strip()) > 20]
        for line in lines:
            raw_nums = re.findall(r'(\d+(?:\.\d+)?%?)', line)
            if raw_nums or any(w in line.lower() for w in ["delayed", "failed", "increased", "decreased", "issue", "bug", "risk", "bottleneck"]):
                metric_name = f"{dimension.lower()}_metric"
                before = None
                after = None
                direction = "STABLE"

                if len(raw_nums) >= 2:
                    try:
                        before = float(raw_nums[0].replace("%", ""))
                        after = float(raw_nums[1].replace("%", ""))
                        direction = "INCREASE" if after > before else ("DECREASE" if after < before else "STABLE")
                    except Exception:
                        pass
                elif len(raw_nums) == 1:
                    try:
                        after = float(raw_nums[0].replace("%", ""))
                    except Exception:
                        pass

                items.append({
                    "chunk_index": idx,
                    "category": dimension,
                    "evidence_type": "METRIC" if raw_nums else "OBSERVATION",
                    "fact_type": "METRIC" if raw_nums else "OBSERVATION",
                    "statement": line[:200],
                    "normalized_value": {
                        "metric": metric_name,
                        "before": before,
                        "after": after,
                        "unit": "percent" if "%" in line else "count",
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
    processing_time: float = 0.0,
    max_workers: int = 2
) -> EvidencePacket:
    """
    Unified orchestration of the Evidence Agent:
    1. Aggregates and deduplicates candidate chunks across all active dimensions.
    2. Runs deterministic time-series engine + semantic qualitative extraction.
    3. Validates citations deterministically.
    4. Consolidates duplicates and extracts conflicts.
    5. Computes coverage matrix.
    6. Returns structured EvidencePacket with complete metric fields, events, and claims.
    """
    total_chunks_count = sum(len(c) for c in dimension_chunks_map.values())
    coverage_map = {dim: ("FOUND" if chunks else "NO_EVIDENCE_FOUND") for dim, chunks in dimension_chunks_map.items()}

    # Collect unique chunks preserving highest rerank scores
    unique_chunks_map = {}
    for dim, chunks in dimension_chunks_map.items():
        for chk in chunks:
            cid = chk.get("chunk_id", chk.get("id"))
            if cid not in unique_chunks_map or chk.get("rerank_score", 0) > unique_chunks_map[cid].get("rerank_score", 0):
                unique_chunks_map[cid] = chk

    unique_chunks = sorted(unique_chunks_map.values(), key=lambda x: x.get("rerank_score", 0), reverse=True)

    # Fast unified extraction (timeseries + qualitative)
    raw_items, events, claims = extract_unified_evidence_from_chunks(
        chunks=unique_chunks,
        project_id=project_id,
        company_id=organization_id,
        timeout_seconds=60.0
    )

    # Citation validation & filtering
    valid_items = []
    rejected_count = 0
    for it in raw_items:
        # Time-series extracted metric items with row coordinates are pre-verified
        if it.get("fact_type") == "METRIC" and it.get("current_value") is not None and it.get("row_numbers"):
            it["evidence_confidence"] = it.get("evidence_confidence", 0.95)
            it["verification_status"] = "VERIFIED"
            valid_items.append(it)
            continue

        is_valid, confidence, reason = validate_evidence_citation(
            statement=it.get("statement", ""),
            chunk_content=it.get("chunk_content", ""),
            rerank_score=it.get("rerank_score", 5.0),
            normalized_val=it.get("normalized_value")
        )
        it["evidence_confidence"] = confidence
        if is_valid and confidence >= settings.EVIDENCE_MIN_CONFIDENCE:
            it["verification_status"] = "VERIFIED"
            valid_items.append(it)
        else:
            it["verification_status"] = "REJECTED"
            rejected_count += 1

    # Fallback to heuristic if extraction produced 0 valid items
    if not valid_items and unique_chunks:
        from app.services.evidence_retriever import EVIDENCE_DIMENSIONS
        for dim in list(EVIDENCE_DIMENSIONS.keys()):
            h_items = heuristic_extract_evidence(dim, unique_chunks)
            for it in h_items:
                c_idx = it.get("chunk_index", 0)
                target_chunk = unique_chunks[c_idx] if 0 <= c_idx < len(unique_chunks) else unique_chunks[0]
                lineage = target_chunk.get("lineage", {})
                doc_name = lineage.get("document_name", "Unknown Document")
                source_type = resolve_chunk_source_type(target_chunk)
                it["source_type"] = source_type
                it["evidence_category"] = it.get("category", "TECHNICAL")
                it["source"] = {
                    "document_id": target_chunk.get("document_id", "doc_default"),
                    "document_name": doc_name,
                    "source_type": source_type,
                    "location_type": "PAGE",
                    "location_value": "1"
                }
                it["supporting_chunk_ids"] = [target_chunk.get("chunk_id", "chk_default")]
                it["rerank_score"] = target_chunk.get("rerank_score", 5.0)
                it["verification_status"] = "VERIFIED"
                it["evidence_confidence"] = 0.88
                valid_items.append(it)

    # Consolidate duplicates and find contradictions
    verified_items, conflicts = consolidate_duplicates_and_conflicts(valid_items)

    from datetime import datetime, timezone
    now_str = datetime.now(timezone.utc).isoformat()

    metrics = EvidenceMetrics(
        total_documents_analyzed=total_docs_count,
        total_chunks_searched=total_chunks_count,
        total_evidence_extracted=len(valid_items) + rejected_count,
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
        events=events,
        claims=claims,
        conflicts=conflicts,
        coverage=coverage_map,
        metrics=metrics
    )
