import time
import logging
from typing import Dict, Any, List
from ..state import FailureOpsGraphState
from ...schemas.analysis import AnalysisResponse, ProcessingMetadata, ConfidenceSummary
from ...services.calculations import aggregate_dimension_risk_scores

logger = logging.getLogger(__name__)

def finalize_output_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Finalize Output Node: Assembles the structured IntelligenceResult payload
    and populates final processing metadata.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("finalize_output")

    analysis_id = state.get("analysis_id", "")
    project_id = state.get("project_id", "")
    company_id = state.get("company_id")
    error_msg = state.get("error_message")
    current_status = state.get("status", "completed")

    validated_evidence = state.get("validated_evidence", [])
    validated_events = state.get("validated_events", [])
    validated_claims = state.get("validated_claims", [])
    signals = state.get("signals", [])
    relationships = state.get("relationships", [])
    warnings = state.get("warnings", [])
    retrieved_chunks = state.get("retrieved_chunks", [])
    conf_summary = state.get("confidence_summary") or ConfidenceSummary()

    # Aggregate dimension risk scores deterministically
    risk_dimensions = aggregate_dimension_risk_scores(signals)

    # Determine final status
    if error_msg or current_status == "failed":
        final_status = "failed"
    elif len(retrieved_chunks) == 0:
        final_status = "insufficient_evidence"
    elif len(validated_evidence) == 0:
        final_status = "insufficient_evidence"
    elif any(w.severity == "HIGH" for w in warnings):
        final_status = "partial"
    else:
        final_status = "completed"

    # Assemble deduplicated citations list
    citations_map = {}
    for c in retrieved_chunks:
        cid = c.get("chunk_id")
        if cid and cid not in citations_map:
            citations_map[cid] = {
                "document_id": c.get("document_id"),
                "document_name": c.get("document_name"),
                "citation": c.get("citation"),
                "lineage": c.get("lineage", {})
            }
    citations_list = list(citations_map.values())

    node_latencies["finalize_output"] = round(time.time() - t0, 4)
    node_latencies["total_graph_execution"] = round(sum(node_latencies.values()), 4)

    metadata = ProcessingMetadata(
        execution_latencies=node_latencies,
        node_path=node_path,
        retrieved_chunk_count=len(retrieved_chunks)
    )

    response = AnalysisResponse(
        analysis_id=analysis_id,
        project_id=project_id,
        company_id=company_id,
        status=final_status,
        evidence=validated_evidence,
        events=validated_events,
        claims=validated_claims,
        signals=signals,
        risk_dimensions=risk_dimensions,
        relationships=relationships,
        citations=citations_list,
        warnings=warnings,
        confidence_summary=conf_summary,
        processing_metadata=metadata,
        error_message=error_msg
    )

    logger.info(f"[FinalizeOutputNode] Completed Analysis {analysis_id} with status '{final_status}'.")
    return {
        "final_response": response,
        "status": final_status,
        "citations": citations_list,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
