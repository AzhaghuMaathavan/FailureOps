import time
import logging
from typing import Dict, Any
from ..state import FailureOpsGraphState
from ...services.validation import validate_signals
from ...services.calculations import calculate_confidence_summary

logger = logging.getLogger(__name__)

def validate_signals_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Signal Validation Node: Validates signal references against evidence items
    and calculates statistical confidence summaries.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("validate_signals")
    warnings = list(state.get("warnings", []))

    if state.get("status") == "failed":
        node_latencies["validate_signals"] = 0.0
        return {"node_path": node_path, "node_latencies": node_latencies}

    raw_signals = state.get("signals", [])
    validated_evidence = state.get("validated_evidence", [])
    retrieved_chunks = state.get("retrieved_chunks", [])

    validated_signals, sig_warnings = validate_signals(
        signals=raw_signals,
        evidence_items=validated_evidence
    )
    warnings.extend(sig_warnings)

    # Compute confidence summary
    ev_confs = [e.extraction_confidence for e in validated_evidence]
    sig_confs = [s.confidence for s in validated_signals]
    conf_summary = calculate_confidence_summary(
        evidence_confidences=ev_confs,
        signal_confidences=sig_confs,
        total_chunks=len(retrieved_chunks)
    )

    elapsed = round(time.time() - t0, 4)
    node_latencies["validate_signals"] = elapsed
    logger.info(f"[ValidateSignalsNode] Validated {len(validated_signals)} signals in {elapsed:.2f}s.")

    return {
        "signals": validated_signals,
        "confidence_summary": conf_summary,
        "warnings": warnings,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
