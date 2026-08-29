import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone

from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket
from app.schemas.failure_chain import (
    FailureChainPacket,
    FailurePrediction,
    ChainNode,
    ChainEdge
)

logger = logging.getLogger(__name__)

# Deterministic Knowledge Rules Registry
KNOWLEDGE_RULES = {
    "ONBOARDING_ADOPTION_COLLAPSE": {
        "pattern_name": "Onboarding & Activation Funnel Friction",
        "consequence_name": "Severe Trial User Drop-off",
        "predicted_failure": "Pre-Launch Adoption Collapse & Growth Stall",
        "keywords": ["activation", "onboarding", "signup", "abandonment", "drop-off", "trial", "setup"],
        "category": "product",
        "time_horizon": "2-3 weeks",
        "template": "Sustained setup friction and dropping activation rates form an empirical trajectory consistent with adoption collapse before the user experiences core product value."
    },
    "TECHNICAL_PIPELINE_COLLAPSE": {
        "pattern_name": "Deployment & Pipeline Instability",
        "consequence_name": "Release Queue Deadlock & Defect Compounding",
        "predicted_failure": "Missed Public Launch Deadline",
        "keywords": ["ci/cd", "pipeline", "build", "bug", "defect", "flaky", "deadlock", "incident"],
        "category": "engineering",
        "time_horizon": "3-4 weeks",
        "template": "Accelerating build failures combined with unbuffered open defects form a risk trajectory consistent with release instability and milestone slippage."
    },
    "OPERATIONAL_BURNOUT_DEBT": {
        "pattern_name": "Engineering Overload & Review Throttling",
        "consequence_name": "Cognitive Debt & Velocity Degradation",
        "predicted_failure": "Critical Production Incident Wave & Attrition",
        "keywords": ["overtime", "hours", "workweek", "pr review", "latency", "fatigue", "morale"],
        "category": "operational",
        "time_horizon": "4-6 weeks",
        "template": "Excessive team overtime and lengthened PR review cycles create acute cognitive debt, preceding secondary defect escapes and velocity stalls."
    },
    "HEALTHY_EXPANSION_TRAJECTORY": {
        "pattern_name": "Resilient Execution & Adoption Lift",
        "consequence_name": "Continuous Delivery & Stable Conversion",
        "predicted_failure": "No Major Failure Predicted (Healthy Horizon)",
        "keywords": ["growth", "increased from", "retention grew", "incidents decreased"],
        "category": "outcome",
        "time_horizon": "6+ months",
        "template": "Sustained metric lift and declining incident volumes reflect balanced engineering capacity and positive user retention."
    }
}

def generate_failure_chain_and_prediction(
    signal_packet: SignalPacket,
    dna_packet: Optional[FailureDNAPacket] = None
) -> FailureChainPacket:
    """
    Builds a deterministic, explainable Failure Chain and predictive risk trajectory
    from verified Member 2 signals.
    """
    signals = signal_packet.signals
    nodes: List[ChainNode] = []
    edges: List[ChainEdge] = []

    if not signals:
        empty_pred = FailurePrediction(
            predicted_failure="Insufficient Telemetry for Trajectory Modeling",
            risk_score=20,
            confidence=0.50,
            status="UNLIKELY",
            time_horizon="N/A",
            explanation="No active operational signals exist to construct a causal failure chain.",
            supporting_evidence_ids=[]
        )
        return FailureChainPacket(
            project_id=signal_packet.project_id,
            analysis_id=signal_packet.analysis_id,
            organization_id=signal_packet.organization_id,
            prediction=empty_pred,
            nodes=[],
            edges=[],
            explanation="No signals available."
        )

    # 1. Match dominant rule from knowledge registry
    matched_rule_id = "TECHNICAL_PIPELINE_COLLAPSE" # default
    max_matched_kws = 0

    all_signal_text = " ".join([f"{s.name} {s.summary}".lower() for s in signals])

    for rule_id, rule_def in KNOWLEDGE_RULES.items():
        match_count = sum(1 for kw in rule_def["keywords"] if kw in all_signal_text)
        if match_count > max_matched_kws:
            max_matched_kws = match_count
            matched_rule_id = rule_id

    # Check if healthy project
    is_healthy = all(s.polarity == "POSITIVE" for s in signals) or (dna_packet and dna_packet.overall.status == "HEALTHY")
    if is_healthy:
        matched_rule_id = "HEALTHY_EXPANSION_TRAJECTORY"

    active_rule = KNOWLEDGE_RULES[matched_rule_id]

    # 2. Build Signal Nodes
    all_ev_ids: Set[str] = set()
    signal_node_ids = []

    for idx, sig in enumerate(signals[:4]):
        node_id = f"node_sig_{idx+1}"
        signal_node_ids.append(node_id)
        all_ev_ids.update(sig.supporting_evidence_ids)

        severity_map = {
            "CRITICAL": "CRITICAL",
            "HIGH": "WARNING",
            "MEDIUM": "WARNING",
            "LOW": "HEALTHY",
            "HEALTHY": "HEALTHY"
        }
        node_sev = severity_map.get(sig.severity, "WARNING")

        cat_map = {
            "ADOPTION": "product",
            "CUSTOMER": "product",
            "TECHNICAL": "engineering",
            "QUALITY": "engineering",
            "OPERATIONAL": "operational",
            "TEAM": "operational",
            "DELIVERY": "outcome"
        }
        node_cat = cat_map.get(sig.category.upper(), "operational")

        label = f"{sig.name} ({sig.metric_change})" if sig.metric_change else sig.name

        nodes.append(
            ChainNode(
                id=node_id,
                type="SIGNAL",
                label=label,
                severity=node_sev,
                category=node_cat,
                evidence_ids=sig.supporting_evidence_ids,
                confidence=sig.signal_confidence
            )
        )

    # 3. Build Pattern Node
    pattern_node_id = "node_pattern"
    nodes.append(
        ChainNode(
            id=pattern_node_id,
            type="PATTERN",
            label=active_rule["pattern_name"],
            severity="CRITICAL" if not is_healthy else "HEALTHY",
            category=active_rule["category"],
            evidence_ids=list(all_ev_ids),
            confidence=0.91
        )
    )

    # Connect signals to pattern
    for sn_id in signal_node_ids:
        edges.append(
            ChainEdge(
                source=sn_id,
                target=pattern_node_id,
                relationship_type="CORROBORATES"
            )
        )

    # 4. Build Consequence Node
    consequence_node_id = "node_consequence"
    nodes.append(
        ChainNode(
            id=consequence_node_id,
            type="CONSEQUENCE",
            label=active_rule["consequence_name"],
            severity="CRITICAL" if not is_healthy else "HEALTHY",
            category="operational",
            evidence_ids=list(all_ev_ids),
            confidence=0.88
        )
    )

    edges.append(
        ChainEdge(
            source=pattern_node_id,
            target=consequence_node_id,
            relationship_type="LEADS_TO"
        )
    )

    # 5. Build Predicted Failure Node
    predicted_node_id = "node_predicted_failure"
    nodes.append(
        ChainNode(
            id=predicted_node_id,
            type="PREDICTED_FAILURE",
            label=active_rule["predicted_failure"],
            severity="CRITICAL" if not is_healthy else "HEALTHY",
            category="outcome",
            evidence_ids=list(all_ev_ids),
            confidence=0.85
        )
    )

    edges.append(
        ChainEdge(
            source=consequence_node_id,
            target=predicted_node_id,
            relationship_type="CONSISTENT_WITH"
        )
    )

    # 6. Compute Prediction Score & Confidence
    if is_healthy:
        pred_risk = 18
        pred_conf = 0.92
        pred_status = "HEALTHY"
    else:
        # Weighted by signal count and strengths
        avg_strength = sum(s.signal_strength or 0.80 for s in signals) / len(signals)
        dna_risk = dna_packet.overall.risk_score if dna_packet else 75
        pred_risk = int(min(95, max(45, (dna_risk * 0.6) + (avg_strength * 100 * 0.4))))
        
        # Confidence calculation
        avg_conf = sum(s.signal_confidence for s in signals) / len(signals)
        pred_conf = round(min(0.95, avg_conf + (0.05 if len(signals) >= 3 else 0.0)), 2)
        pred_status = "IMMINENT" if pred_risk >= 80 else ("ACTIVE" if pred_risk >= 65 else "EMERGING")

    # Build prediction object
    prediction = FailurePrediction(
        predicted_failure=active_rule["predicted_failure"],
        risk_score=pred_risk,
        confidence=pred_conf,
        status=pred_status,
        time_horizon=active_rule["time_horizon"],
        explanation=active_rule["template"],
        supporting_evidence_ids=list(all_ev_ids)
    )

    return FailureChainPacket(
        project_id=signal_packet.project_id,
        analysis_id=signal_packet.analysis_id,
        organization_id=signal_packet.organization_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        prediction=prediction,
        nodes=nodes,
        edges=edges,
        explanation=active_rule["template"]
    )
