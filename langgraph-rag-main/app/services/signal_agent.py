import re
import logging
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timezone

from app.core.config import settings
from app.services.agent_service import call_llm, extract_json
from app.schemas.signal_input import SignalInputContext, VerifiedEvidenceContextItem
from app.schemas.evidence_group import EvidenceGroupCollection, EvidenceGroup
from app.schemas.trend import DetectedTrendCollection, DetectedTrend
from app.schemas.relationship import EvidenceRelationshipCollection, EvidenceRelationship
from app.schemas.signal_packet import SignalPacket, SignalItemSchema, OverallSignalSummary

logger = logging.getLogger(__name__)

def calculate_deterministic_signal_strength(
    evidence_count: int,
    distinct_sources_count: int,
    delta_percent: Optional[float] = None,
    has_relationship_backing: bool = False
) -> float:
    """
    Calculates deterministic signal strength (0.0 - 1.0).
    Represents how strongly the empirical evidence supports the existence of the signal.
    (NOTE: signal_strength != probability of failure).
    """
    base_weight = 0.35
    ev_weight = min(0.30, evidence_count * 0.08)
    src_weight = min(0.20, distinct_sources_count * 0.08)
    rel_bonus = 0.15 if has_relationship_backing else 0.0

    # Delta magnitude contribution
    mag_bonus = 0.0
    if delta_percent is not None:
        abs_delta = abs(delta_percent)
        if abs_delta >= 40.0:
            mag_bonus = 0.10
        elif abs_delta >= 20.0:
            mag_bonus = 0.05

    strength = round(base_weight + ev_weight + src_weight + rel_bonus + mag_bonus, 3)
    return max(0.10, min(0.99, strength))

def calculate_deterministic_signal_confidence(
    avg_evidence_confidence: float,
    distinct_sources_count: int,
    has_unresolved_conflicts: bool = False,
    is_single_observation: bool = False
) -> float:
    """
    Calculates deterministic signal confidence (0.0 - 1.0).
    Separate from strength: heavily penalized by conflicting evidence and single-source anecdotes.
    """
    conf = avg_evidence_confidence

    if distinct_sources_count >= 3:
        conf += 0.08
    elif distinct_sources_count >= 2:
        conf += 0.04

    if has_unresolved_conflicts:
        conf -= 0.25 # Significant penalty for contradiction

    if is_single_observation:
        conf -= 0.15

    return round(max(0.10, min(0.99, conf)), 3)

def validate_and_ground_signal(
    signal: SignalItemSchema,
    valid_evidence_id_set: Set[str],
    valid_rel_id_set: Set[str]
) -> bool:
    """
    Strict ground validation: checks that every supporting ID actually exists in the project context.
    """
    if not signal.supporting_evidence_ids:
        logger.warning(f"[signal_agent] Signal {signal.signal_id} rejected: no supporting evidence.")
        return False

    for eid in signal.supporting_evidence_ids:
        if eid not in valid_evidence_id_set:
            logger.warning(f"[signal_agent] Signal {signal.signal_id} rejected: hallucinated evidence ID '{eid}'.")
            return False

    for rid in signal.supporting_relationship_ids:
        if rid not in valid_rel_id_set:
            logger.warning(f"[signal_agent] Signal {signal.signal_id} rejected: invalid relationship ID '{rid}'.")
            return False

    return True

def generate_signal_packet(
    context: SignalInputContext,
    groups: EvidenceGroupCollection,
    trends: DetectedTrendCollection,
    relationships: EvidenceRelationshipCollection
) -> SignalPacket:
    """
    Synthesizes meaningful, consolidated project-level signals from verified inputs.
    """
    valid_ev_map = {it.evidence_id: it for it in context.verified_evidence}
    valid_ev_ids = set(valid_ev_map.keys())
    valid_rel_map = {r.relationship_id: r for r in relationships.relationships}
    valid_rel_ids = set(valid_rel_map.keys())

    conflicted_metrics = {c.topic for c in context.conflicts}

    signals: List[SignalItemSchema] = []
    sig_counter = 1
    consumed_ev_ids: Set[str] = set()

    # 1. Synthesize signals backed by cross-source relationships
    for rel in relationships.relationships:
        rel_ev_items = [valid_ev_map[eid] for eid in rel.supporting_evidence_ids if eid in valid_ev_map]
        if not rel_ev_items:
            continue

        distinct_docs = set(it.source.document_name for it in rel_ev_items)
        avg_conf = sum(it.confidence for it in rel_ev_items) / len(rel_ev_items)
        
        # Check associated trends
        matching_trends = [
            t for t in trends.trends 
            if any(eid in t.evidence_ids for eid in rel.supporting_evidence_ids)
        ]
        
        delta_str = None
        delta_pct = None
        trend_dir = "STABLE"
        polarity = "NEGATIVE"

        if matching_trends:
            first_t = matching_trends[0]
            delta_pct = first_t.delta_percent
            trend_dir = first_t.direction
            polarity = first_t.polarity if first_t.polarity != "UNKNOWN" else "NEGATIVE"
            if first_t.delta_percent is not None:
                sign = "+" if first_t.delta_percent > 0 else ""
                delta_str = f"{sign}{first_t.delta_percent}% shift"

        # Check for conflict
        has_conflict = any(it.normalized_value and it.normalized_value.metric in conflicted_metrics for it in rel_ev_items)
        status = "CONFLICTED" if has_conflict else ("WORSENING" if polarity == "NEGATIVE" else "IMPROVING")
        severity = "CRITICAL" if polarity == "NEGATIVE" and (delta_pct and abs(delta_pct) >= 30) else ("HIGH" if polarity == "NEGATIVE" else "HEALTHY")

        strength = calculate_deterministic_signal_strength(
            evidence_count=len(rel_ev_items),
            distinct_sources_count=len(distinct_docs),
            delta_percent=delta_pct,
            has_relationship_backing=True
        )
        confidence = calculate_deterministic_signal_confidence(
            avg_evidence_confidence=avg_conf,
            distinct_sources_count=len(distinct_docs),
            has_unresolved_conflicts=has_conflict
        )

        # Mapping relationship types to structured names
        name_map = {
            "ONBOARDING_FRICTION": ("Adoption & Activation Collapse", "Product & User Experience", "ADOPTION"),
            "TECHNICAL_RELIABILITY_STRESS": ("Deployment Pipeline Instability", "Engineering & Infrastructure", "TECHNICAL"),
            "OPERATIONAL_OVERLOAD_DRAG": ("Engineering Overload & Review Throttling", "Team Operations", "OPERATIONAL"),
            "DELIVERY_PRESSURE": ("Scope Evolution & Milestone Compression", "Execution & Delivery", "DELIVERY"),
            "PRICING_NON_CORRELATION": ("Onboarding Friction Resonance", "Customer Experience", "CUSTOMER"),
            "POSITIVE_ADOPTION_MOMENTUM": ("Positive Adoption & Reliability Momentum", "Product Growth", "ADOPTION")
        }

        sig_name, sig_domain, sig_cat = name_map.get(
            rel.relationship_type, 
            (f"{rel.relationship_type.replace('_', ' ').title()}", "Operational Intelligence", "OTHER")
        )

        # Build comprehensive summary
        summary = (
            f"{rel.explanation} Corroborated across {len(distinct_docs)} independent artifact sources "
            f"({', '.join(list(distinct_docs)[:3])})."
        )

        sig_item = SignalItemSchema(
            signal_id=f"sig-{sig_counter:02d}",
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            name=sig_name,
            category=sig_cat,
            signal_type="CROSS_SOURCE_PATTERN",
            polarity=polarity,
            status=status,
            severity=severity,
            summary=summary,
            metric_change=delta_str,
            signal_strength=strength,
            signal_confidence=confidence,
            historical_prevalence=0,
            supporting_evidence_ids=rel.supporting_evidence_ids,
            supporting_relationship_ids=[rel.relationship_id]
        )

        if validate_and_ground_signal(sig_item, valid_ev_ids, valid_rel_ids):
            signals.append(sig_item)
            sig_counter += 1
            consumed_ev_ids.update(rel.supporting_evidence_ids)

    # 2. Synthesize signals from remaining unconsumed groups
    for grp in groups.groups:
        unconsumed_in_group = [it for it in grp.evidence_items if it.evidence_id not in consumed_ev_ids]
        if not unconsumed_in_group:
            continue

        distinct_docs = set(it.source.document_name for it in unconsumed_in_group)
        avg_conf = sum(it.confidence for it in unconsumed_in_group) / len(unconsumed_in_group)
        is_single = len(unconsumed_in_group) == 1

        # Check trend for this group
        grp_trends = [t for t in trends.trends if any(it.evidence_id in t.evidence_ids for it in unconsumed_in_group)]
        delta_str = None
        delta_pct = None
        polarity = "NEUTRAL"
        
        if grp_trends:
            t = grp_trends[0]
            delta_pct = t.delta_percent
            polarity = t.polarity if t.polarity != "UNKNOWN" else "NEUTRAL"
            if t.delta_percent is not None:
                sign = "+" if t.delta_percent > 0 else ""
                delta_str = f"{sign}{t.delta_percent}% shift"

        sig_type = "WEAK_SIGNAL" if is_single else "TREND"
        severity = "LOW" if is_single else ("HIGH" if polarity == "NEGATIVE" else "MEDIUM")
        status = "EMERGING" if is_single else "PERSISTENT"

        strength = calculate_deterministic_signal_strength(
            evidence_count=len(unconsumed_in_group),
            distinct_sources_count=len(distinct_docs),
            delta_percent=delta_pct,
            has_relationship_backing=False
        )
        confidence = calculate_deterministic_signal_confidence(
            avg_evidence_confidence=avg_conf,
            distinct_sources_count=len(distinct_docs),
            is_single_observation=is_single
        )

        grp_ev_ids = [it.evidence_id for it in unconsumed_in_group]
        summary = f"Observed {grp.group_name.lower()} grounded in {len(unconsumed_in_group)} verified evidence items."

        sig_item = SignalItemSchema(
            signal_id=f"sig-{sig_counter:02d}",
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            name=f"{grp.group_name}",
            category=grp.primary_category,
            signal_type=sig_type,
            polarity=polarity,
            status=status,
            severity=severity,
            summary=summary,
            metric_change=delta_str,
            signal_strength=strength,
            signal_confidence=confidence,
            historical_prevalence=0,
            supporting_evidence_ids=grp_ev_ids,
            supporting_relationship_ids=[]
        )

        if validate_and_ground_signal(sig_item, valid_ev_ids, valid_rel_ids):
            signals.append(sig_item)
            sig_counter += 1
            consumed_ev_ids.update(grp_ev_ids)

    # 3. Overall Signal Summary
    pos_count = sum(1 for s in signals if s.polarity == "POSITIVE")
    neg_count = sum(1 for s in signals if s.polarity == "NEGATIVE")
    neu_count = sum(1 for s in signals if s.polarity == "NEUTRAL")
    mix_count = sum(1 for s in signals if s.polarity == "MIXED")
    crit_count = sum(1 for s in signals if s.severity == "CRITICAL")
    high_count = sum(1 for s in signals if s.severity == "HIGH")
    med_count = sum(1 for s in signals if s.severity == "MEDIUM")
    low_count = sum(1 for s in signals if s.severity in ["LOW", "HEALTHY"])

    # Health score (100 = completely healthy, 0 = critical collapse)
    if signals:
        health_penalty = (crit_count * 25) + (high_count * 15) + (med_count * 5)
        health_score = max(5.0, min(95.0, 100.0 - health_penalty + (pos_count * 10)))
    else:
        health_score = 50.0

    summary_obj = OverallSignalSummary(
        total_signals=len(signals),
        positive_count=pos_count,
        negative_count=neg_count,
        neutral_count=neu_count,
        mixed_count=mix_count,
        critical_count=crit_count,
        high_count=high_count,
        medium_count=med_count,
        low_count=low_count,
        health_score=round(health_score, 1)
    )

    return SignalPacket(
        project_id=context.project_id,
        analysis_id=context.analysis_id,
        organization_id=context.organization_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        signals=signals,
        summary=summary_obj
    )
