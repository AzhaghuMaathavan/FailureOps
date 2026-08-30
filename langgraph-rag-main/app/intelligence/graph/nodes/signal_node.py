import time
import logging
from typing import Dict, Any
from ..state import FailureOpsGraphState
from ...agents.signal_agent import SignalAgent

logger = logging.getLogger(__name__)

def signal_agent_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Signal Agent Node: Normalizes metrics, calculates deterministic changes,
    and detects cross-source signal correlations.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("signal_agent")

    if state.get("status") == "failed":
        node_latencies["signal_agent"] = 0.0
        return {"node_path": node_path, "node_latencies": node_latencies}

    validated_evidence = state.get("validated_evidence", [])
    validated_events = state.get("validated_events", [])
    validated_claims = state.get("validated_claims", [])
    project_id = state.get("project_id", "")
    company_id = state.get("company_id")

    warnings = list(state.get("warnings", []))

    if not validated_evidence:
        node_latencies["signal_agent"] = round(time.time() - t0, 4)
        from ...schemas.analysis import ValidationWarning
        warnings.append(ValidationWarning(
            code="SIGNAL_AGENT_SKIPPED",
            message="Signal synthesis skipped: no validated evidence items available.",
            field="signal_agent",
            severity="INFO"
        ))
        return {
            "signals": [],
            "relationships": [],
            "warnings": warnings,
            "node_latencies": node_latencies,
            "node_path": node_path
        }

    signals, relationships = SignalAgent.analyze_signals(
        evidence_items=validated_evidence,
        events=validated_events,
        claims=validated_claims,
        project_id=project_id,
        company_id=company_id
    )

    elapsed = round(time.time() - t0, 4)
    node_latencies["signal_agent"] = elapsed
    logger.info(f"[SignalAgentNode] Synthesized {len(signals)} signals, {len(relationships)} relationships in {elapsed:.2f}s.")

    return {
        "signals": signals,
        "relationships": relationships,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
