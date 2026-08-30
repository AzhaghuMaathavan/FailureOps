import time
import logging
from typing import Dict, Any, List
from ..state import FailureOpsGraphState
from ...services.validation import validate_evidence_items
from ...schemas.events import EventItem
from ...schemas.claims import ClaimItem

logger = logging.getLogger(__name__)

def validate_evidence_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Evidence Validation Node: Verifies citations, non-hallucination, and metric consistency.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("validate_evidence")
    warnings = list(state.get("warnings", []))

    if state.get("status") == "failed":
        node_latencies["validate_evidence"] = 0.0
        return {"node_path": node_path, "node_latencies": node_latencies}

    raw_evidence = state.get("raw_evidence", [])
    raw_events = state.get("raw_events", [])
    raw_claims = state.get("raw_claims", [])
    retrieved_chunks = state.get("retrieved_chunks", [])

    # 1. Validate Evidence Items
    validated_evidence, ev_warnings = validate_evidence_items(
        raw_evidence_items=raw_evidence,
        retrieved_chunks=retrieved_chunks
    )
    warnings.extend(ev_warnings)

    # 2. Validate Events
    validated_events: List[EventItem] = []
    for evt_data in raw_events:
        try:
            validated_events.append(EventItem(**evt_data))
        except Exception as e:
            logger.warning(f"[ValidateEvidenceNode] Dropping invalid event: {e}")

    # 3. Validate Claims
    validated_claims: List[ClaimItem] = []
    for clm_data in raw_claims:
        try:
            validated_claims.append(ClaimItem(**clm_data))
        except Exception as e:
            logger.warning(f"[ValidateEvidenceNode] Dropping invalid claim: {e}")

    elapsed = round(time.time() - t0, 4)
    node_latencies["validate_evidence"] = elapsed
    logger.info(f"[ValidateEvidenceNode] Validated {len(validated_evidence)} evidence items in {elapsed:.2f}s.")

    return {
        "validated_evidence": validated_evidence,
        "validated_events": validated_events,
        "validated_claims": validated_claims,
        "warnings": warnings,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
