import re
import uuid
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
from app.intelligence.services.risk_scoring_engine import RiskScoringEngine
from app.intelligence.services.normalization import normalize_signal_name
from app.intelligence.services.calculations import (
    calculate_percentage_change,
    calculate_velocity,
    calculate_severity
)

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

def _enrich_signal_telemetry_and_risk(
    evidence_items: List[VerifiedEvidenceContextItem],
    fallback_name: str,
    trend_delta_pct: Optional[float] = None,
    trend_dir: Optional[str] = None
) -> Dict[str, Any]:
    """
    Extracts deterministic telemetry (baseline, previous, current, changes, dates, unit)
    and computes metric-aware risk scoring (0-100 scale, risk movements, severity, scoring method).
    """
    metric_items = [
        it for it in evidence_items 
        if it.current_value is not None 
        or it.baseline_value is not None 
        or (it.normalized_value and (it.normalized_value.after is not None or it.normalized_value.before is not None))
        or it.metric_name is not None
    ]

    if not metric_items:
        # Qualitative signal (no numerical time series)
        return {
            "canonical_name": fallback_name,
            "baseline_value": None,
            "previous_value": None,
            "current_value": None,
            "baseline_timestamp": None,
            "previous_timestamp": None,
            "current_timestamp": None,
            "baseline_to_current_change_percent": trend_delta_pct,
            "previous_to_current_change_percent": None,
            "metric_change_percent": trend_delta_pct,
            "metric_trend": trend_dir or "STABLE",
            "risk_score": None,
            "previous_risk_score": None,
            "baseline_risk_score": None,
            "risk_change_percent": None,
            "risk_trend": "STABLE",
            "scoring_method": None,
            "polarity": "NEGATIVE",
            "benchmark_target": None,
            "benchmark_critical": None,
            "unit": None,
            "explanation": None,
        }

    # Find the primary metric item with the richest data
    primary = metric_items[0]
    raw_metric_name = primary.metric_name or (primary.normalized_value.metric if primary.normalized_value else fallback_name)
    canonical_name, _ = normalize_signal_name(raw_metric_name)

    base_val = primary.baseline_value if primary.baseline_value is not None else (primary.normalized_value.before if primary.normalized_value else None)
    prev_val = primary.previous_value
    curr_val = primary.current_value if primary.current_value is not None else (primary.normalized_value.after if primary.normalized_value else None)
    unit = primary.unit or (primary.normalized_value.unit if primary.normalized_value else None)

    b_ts = primary.baseline_timestamp or (primary.time_period.start if primary.time_period else None)
    p_ts = primary.previous_timestamp
    c_ts = primary.current_timestamp or (primary.time_period.end if primary.time_period else None)

    # 1. Total Change (Baseline to Current)
    b_to_c_pct = primary.baseline_to_current_change_percent
    if b_to_c_pct is None and base_val is not None and curr_val is not None and base_val != 0:
        b_to_c_pct = round(((curr_val - base_val) / base_val) * 100, 2)
    elif b_to_c_pct is None and trend_delta_pct is not None:
        b_to_c_pct = trend_delta_pct

    # 2. Period Change (Previous to Current)
    p_to_c_pct = primary.previous_to_current_change_percent
    if p_to_c_pct is None and prev_val is not None and curr_val is not None and prev_val != 0:
        p_to_c_pct = round(((curr_val - prev_val) / prev_val) * 100, 2)

    canonical_change_pct = b_to_c_pct if b_to_c_pct is not None else p_to_c_pct

    # 3. Metric Trend
    metric_trend = primary.direction or (primary.normalized_value.direction if primary.normalized_value else None)
    if not metric_trend or metric_trend == "UNKNOWN":
        if canonical_change_pct is not None:
            if canonical_change_pct > 0:
                metric_trend = "INCREASING"
            elif canonical_change_pct < 0:
                metric_trend = "DECREASING"
            else:
                metric_trend = "STABLE"
        else:
            metric_trend = trend_dir or "STABLE"

    # 4. Metric-Aware Risk Calculation (0-100 scale)
    current_risk_profile = RiskScoringEngine.calculate_risk_profile(
        current_value=curr_val,
        baseline_value=base_val,
        previous_value=prev_val,
        baseline_to_current_change_percent=b_to_c_pct,
        canonical_name=canonical_name,
        unit=unit,
        supporting_evidence_ids=[primary.evidence_id]
    )
    previous_risk_profile = RiskScoringEngine.calculate_risk_profile(
        current_value=prev_val,
        baseline_value=base_val,
        canonical_name=canonical_name,
        unit=unit
    ) if prev_val is not None else None

    baseline_risk_profile = RiskScoringEngine.calculate_risk_profile(
        current_value=base_val,
        canonical_name=canonical_name,
        unit=unit
    ) if base_val is not None else None

    curr_risk = current_risk_profile.risk_score
    prev_risk = previous_risk_profile.risk_score if previous_risk_profile else None
    base_risk = baseline_risk_profile.risk_score if baseline_risk_profile else None

    risk_pct_change, risk_trend_val = calculate_percentage_change(
        current=curr_risk,
        previous=prev_risk
    )
    risk_trend = risk_trend_val.value if hasattr(risk_trend_val, 'value') else str(risk_trend_val)

    return {
        "canonical_name": canonical_name,
        "baseline_value": base_val,
        "previous_value": prev_val,
        "current_value": curr_val,
        "baseline_timestamp": b_ts,
        "previous_timestamp": p_ts,
        "current_timestamp": c_ts,
        "baseline_to_current_change_percent": b_to_c_pct,
        "previous_to_current_change_percent": p_to_c_pct,
        "metric_change_percent": canonical_change_pct,
        "metric_trend": metric_trend,
        "risk_score": curr_risk,
        "previous_risk_score": prev_risk,
        "baseline_risk_score": base_risk,
        "risk_change_percent": risk_pct_change,
        "risk_trend": risk_trend,
        "scoring_method": current_risk_profile.scoring_method.value if hasattr(current_risk_profile.scoring_method, 'value') else str(current_risk_profile.scoring_method),
        "polarity": current_risk_profile.polarity.value if hasattr(current_risk_profile.polarity, 'value') else str(current_risk_profile.polarity),
        "benchmark_target": current_risk_profile.benchmark_target,
        "benchmark_critical": current_risk_profile.benchmark_critical,
        "unit": unit,
        "explanation": current_risk_profile.explanation,
    }

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

        # Enrich with real telemetry and risk scoring from supporting evidence
        telemetry = _enrich_signal_telemetry_and_risk(
            evidence_items=rel_ev_items,
            fallback_name=sig_name,
            trend_delta_pct=delta_pct,
            trend_dir=trend_dir
        )

        # Adjust severity if risk_score is available
        if telemetry.get("risk_score") is not None:
            r_score = telemetry["risk_score"]
            severity = "CRITICAL" if r_score >= 80 else ("HIGH" if r_score >= 60 else ("MEDIUM" if r_score >= 30 else "LOW"))

        # Build comprehensive summary
        summary = (
            f"{rel.explanation} Corroborated across {len(distinct_docs)} independent artifact sources "
            f"({', '.join(list(distinct_docs)[:3])})."
        )

        sig_item = SignalItemSchema(
            signal_id=f"sig-{uuid.uuid4().hex[:8]}",
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            name=sig_name,
            canonical_name=telemetry.get("canonical_name", sig_name),
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
            supporting_relationship_ids=[rel.relationship_id],
            baseline_value=telemetry.get("baseline_value"),
            previous_value=telemetry.get("previous_value"),
            current_value=telemetry.get("current_value"),
            baseline_timestamp=telemetry.get("baseline_timestamp"),
            previous_timestamp=telemetry.get("previous_timestamp"),
            current_timestamp=telemetry.get("current_timestamp"),
            baseline_to_current_change_percent=telemetry.get("baseline_to_current_change_percent"),
            previous_to_current_change_percent=telemetry.get("previous_to_current_change_percent"),
            metric_change_percent=telemetry.get("metric_change_percent"),
            metric_trend=telemetry.get("metric_trend"),
            risk_score=telemetry.get("risk_score"),
            previous_risk_score=telemetry.get("previous_risk_score"),
            baseline_risk_score=telemetry.get("baseline_risk_score"),
            risk_change_percent=telemetry.get("risk_change_percent"),
            risk_trend=telemetry.get("risk_trend"),
            scoring_method=telemetry.get("scoring_method"),
            benchmark_target=telemetry.get("benchmark_target"),
            benchmark_critical=telemetry.get("benchmark_critical"),
            unit=telemetry.get("unit"),
            explanation=telemetry.get("explanation")
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
        trend_dir = "STABLE"
        
        if grp_trends:
            t = grp_trends[0]
            delta_pct = t.delta_percent
            trend_dir = t.direction
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

        # Enrich with telemetry
        telemetry = _enrich_signal_telemetry_and_risk(
            evidence_items=unconsumed_in_group,
            fallback_name=grp.group_name,
            trend_delta_pct=delta_pct,
            trend_dir=trend_dir
        )

        if telemetry.get("risk_score") is not None:
            r_score = telemetry["risk_score"]
            severity = "CRITICAL" if r_score >= 80 else ("HIGH" if r_score >= 60 else ("MEDIUM" if r_score >= 30 else "LOW"))

        sig_item = SignalItemSchema(
            signal_id=f"sig-{uuid.uuid4().hex[:8]}",
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            name=f"{grp.group_name}",
            canonical_name=telemetry.get("canonical_name", grp.group_name),
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
            supporting_relationship_ids=[],
            baseline_value=telemetry.get("baseline_value"),
            previous_value=telemetry.get("previous_value"),
            current_value=telemetry.get("current_value"),
            baseline_timestamp=telemetry.get("baseline_timestamp"),
            previous_timestamp=telemetry.get("previous_timestamp"),
            current_timestamp=telemetry.get("current_timestamp"),
            baseline_to_current_change_percent=telemetry.get("baseline_to_current_change_percent"),
            previous_to_current_change_percent=telemetry.get("previous_to_current_change_percent"),
            metric_change_percent=telemetry.get("metric_change_percent"),
            metric_trend=telemetry.get("metric_trend"),
            risk_score=telemetry.get("risk_score"),
            previous_risk_score=telemetry.get("previous_risk_score"),
            baseline_risk_score=telemetry.get("baseline_risk_score"),
            risk_change_percent=telemetry.get("risk_change_percent"),
            risk_trend=telemetry.get("risk_trend"),
            scoring_method=telemetry.get("scoring_method"),
            benchmark_target=telemetry.get("benchmark_target"),
            benchmark_critical=telemetry.get("benchmark_critical"),
            unit=telemetry.get("unit"),
            explanation=telemetry.get("explanation")
        )

        if validate_and_ground_signal(sig_item, valid_ev_ids, valid_rel_ids):
            signals.append(sig_item)
            sig_counter += 1
            consumed_ev_ids.update(grp_ev_ids)

    # 3. Synthesize direct metric signals for any standalone/remaining metric evidence items
    for ev in context.verified_evidence:
        if ev.evidence_id in consumed_ev_ids:
            continue
        has_metric_val = (
            ev.current_value is not None 
            or ev.baseline_value is not None 
            or (ev.normalized_value and (ev.normalized_value.after is not None or ev.normalized_value.before is not None))
            or ev.metric_name is not None
        )
        if not has_metric_val:
            continue

        telemetry = _enrich_signal_telemetry_and_risk(
            evidence_items=[ev],
            fallback_name=ev.metric_name or ev.statement
        )

        canonical_name = telemetry.get("canonical_name", ev.metric_name or ev.statement)
        unit_suffix = f" {telemetry['unit']}" if telemetry.get("unit") else ""
        delta_str = (
            f"{telemetry['baseline_value']} -> {telemetry['current_value']}{unit_suffix} "
            f"({'+' if (telemetry['baseline_to_current_change_percent'] or 0) > 0 else ''}{telemetry['baseline_to_current_change_percent']}%)"
            if telemetry.get("baseline_value") is not None and telemetry.get("current_value") is not None
            else None
        )

        r_score = telemetry.get("risk_score") or 0.0
        severity = "CRITICAL" if r_score >= 80 else ("HIGH" if r_score >= 60 else ("MEDIUM" if r_score >= 30 else "LOW"))
        sig_pol = "POSITIVE" if r_score <= 30 else ("NEGATIVE" if r_score >= 60 else "NEUTRAL")

        sig_item = SignalItemSchema(
            signal_id=f"sig-{uuid.uuid4().hex[:8]}",
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            name=canonical_name,
            canonical_name=canonical_name,
            category=ev.category,
            signal_type="METRIC_ANOMALY" if r_score >= 60 else "METRIC_SERIES",
            polarity=sig_pol,
            status="WORSENING" if r_score >= 60 else "STABLE",
            severity=severity,
            summary=telemetry.get("explanation") or ev.statement,
            metric_change=delta_str,
            signal_strength=0.90,
            signal_confidence=ev.confidence,
            historical_prevalence=0,
            supporting_evidence_ids=[ev.evidence_id],
            supporting_relationship_ids=[],
            baseline_value=telemetry.get("baseline_value"),
            previous_value=telemetry.get("previous_value"),
            current_value=telemetry.get("current_value"),
            baseline_timestamp=telemetry.get("baseline_timestamp"),
            previous_timestamp=telemetry.get("previous_timestamp"),
            current_timestamp=telemetry.get("current_timestamp"),
            baseline_to_current_change_percent=telemetry.get("baseline_to_current_change_percent"),
            previous_to_current_change_percent=telemetry.get("previous_to_current_change_percent"),
            metric_change_percent=telemetry.get("metric_change_percent"),
            metric_trend=telemetry.get("metric_trend"),
            risk_score=telemetry.get("risk_score"),
            previous_risk_score=telemetry.get("previous_risk_score"),
            baseline_risk_score=telemetry.get("baseline_risk_score"),
            risk_change_percent=telemetry.get("risk_change_percent"),
            risk_trend=telemetry.get("risk_trend"),
            scoring_method=telemetry.get("scoring_method"),
            benchmark_target=telemetry.get("benchmark_target"),
            benchmark_critical=telemetry.get("benchmark_critical"),
            unit=telemetry.get("unit"),
            explanation=telemetry.get("explanation")
        )

        if validate_and_ground_signal(sig_item, valid_ev_ids, valid_rel_ids):
            signals.append(sig_item)
            sig_counter += 1
            consumed_ev_ids.add(ev.evidence_id)

    # 4. Overall Signal Summary
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
