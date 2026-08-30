import time
import logging
from typing import Dict, Any
from ..state import FailureOpsGraphState
from ...agents.evidence_agent import EvidenceAgent

logger = logging.getLogger(__name__)

def evidence_agent_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Evidence Agent Node: Extracts structured facts, events, claims, and metrics from retrieved chunks.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("evidence_agent")

    if state.get("status") == "failed":
        node_latencies["evidence_agent"] = 0.0
        return {"node_path": node_path, "node_latencies": node_latencies}

    query = state.get("query", "")
    retrieved_chunks = state.get("retrieved_chunks", [])
    project_id = state.get("project_id", "")
    company_id = state.get("company_id")

    warnings = list(state.get("warnings", []))

    if not retrieved_chunks:
        node_latencies["evidence_agent"] = round(time.time() - t0, 4)
        return {
            "raw_evidence": [],
            "raw_events": [],
            "raw_claims": [],
            "warnings": warnings,
            "node_latencies": node_latencies,
            "node_path": node_path
        }

    raw_evidence, raw_events, raw_claims, ext_warnings = EvidenceAgent.extract_evidence(
        query=query,
        retrieved_chunks=retrieved_chunks,
        project_id=project_id,
        company_id=company_id
    )

    from ...schemas.analysis import ValidationWarning
    for w in ext_warnings:
        warnings.append(ValidationWarning(**w))

    elapsed = round(time.time() - t0, 4)
    node_latencies["evidence_agent"] = elapsed
    logger.info(f"[EvidenceAgentNode] Extracted {len(raw_evidence)} items in {elapsed:.2f}s.")

    return {
        "raw_evidence": raw_evidence,
        "raw_events": raw_events,
        "raw_claims": raw_claims,
        "warnings": warnings,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
