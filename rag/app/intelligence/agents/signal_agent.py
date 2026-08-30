import uuid
import logging
from typing import List, Dict, Any, Tuple, Optional
from ..schemas.evidence import EvidenceItem, Direction
from ..schemas.events import EventItem
from ..schemas.claims import ClaimItem
from ..schemas.signals import NormalizedSignal, SignalRelationship, SignalCategory, SignalSeverity
from ..services.calculations import (
    calculate_percentage_change, 
    calculate_velocity, 
    calculate_severity
)
from ..services.risk_scoring_engine import RiskScoringEngine
from ..services.normalization import normalize_signal_name

logger = logging.getLogger(__name__)

class SignalAgent:
    """
    Signal Agent analyzes validated structured evidence, normalizes metric names,
    performs deterministic arithmetic, and calculates separated baseline-to-current change,
    previous-period change, and metric-aware normalized risk score movement.
    """

    @classmethod
    def analyze_signals(
        cls,
        evidence_items: List[EvidenceItem],
        events: List[EventItem],
        claims: List[ClaimItem],
        project_id: str,
        company_id: Optional[str] = None
    ) -> Tuple[List[NormalizedSignal], List[SignalRelationship]]:
        """
        Transforms validated EvidenceItems into NormalizedSignals and Candidate Relationships.
        """
        if not evidence_items:
            logger.info("[SignalAgent] No evidence items provided; returning empty signals.")
            return [], []

        signals_map: Dict[str, NormalizedSignal] = {}
        relationships: List[SignalRelationship] = []

        # 1. Process Individual Evidence Metrics into Canonical Signals
        for ev in evidence_items:
            raw_name = ev.metric_name or ev.statement
            canonical_name, category = normalize_signal_name(raw_name)

            # -------------------------------------------------------------
            # A. RAW METRIC CALCULATIONS (Source Telemetry)
            # -------------------------------------------------------------
            base_val = ev.baseline_value if ev.baseline_value is not None else ev.previous_value
            prev_val = ev.previous_value
            curr_val = ev.current_value

            # 1. Baseline to Current Change (Total change across full series)
            if ev.baseline_to_current_change_percent is not None:
                base_to_curr_pct = ev.baseline_to_current_change_percent
            elif ev.baseline_to_current_change is not None:
                base_to_curr_pct = ev.baseline_to_current_change
            else:
                base_to_curr_pct, _ = calculate_percentage_change(current=curr_val, previous=base_val)

            # 2. Previous to Current Change (Immediate period change)
            if ev.previous_to_current_change_percent is not None:
                prev_to_curr_pct = ev.previous_to_current_change_percent
            elif ev.previous_to_current_change is not None:
                prev_to_curr_pct = ev.previous_to_current_change
            else:
                prev_to_curr_pct, _ = calculate_percentage_change(current=curr_val, previous=prev_val)

            # 3. Metric Trend
            _, raw_metric_trend = calculate_percentage_change(
                current=curr_val,
                previous=prev_val if prev_val is not None else base_val
            )
            if raw_metric_trend == Direction.UNKNOWN and ev.direction != Direction.UNKNOWN:
                raw_metric_trend = ev.direction

            canonical_metric_change = base_to_curr_pct if base_to_curr_pct is not None else prev_to_curr_pct
            velocity = calculate_velocity(canonical_metric_change)

            # -------------------------------------------------------------
            # B. METRIC-AWARE RISK SCORE CALCULATIONS (FailureOps 0-100 Scale)
            # -------------------------------------------------------------
            current_risk_profile = RiskScoringEngine.calculate_risk_profile(
                current_value=ev.current_value,
                baseline_value=base_val,
                previous_value=prev_val,
                baseline_to_current_change_percent=base_to_curr_pct,
                canonical_name=canonical_name,
                unit=ev.unit,
                supporting_evidence_ids=[ev.evidence_id]
            )
            previous_risk_profile = RiskScoringEngine.calculate_risk_profile(
                current_value=prev_val,
                baseline_value=base_val,
                canonical_name=canonical_name,
                unit=ev.unit
            ) if prev_val is not None else None

            baseline_risk_profile = RiskScoringEngine.calculate_risk_profile(
                current_value=base_val,
                canonical_name=canonical_name,
                unit=ev.unit
            ) if base_val is not None else None

            current_risk_score = current_risk_profile.risk_score
            previous_risk_score = previous_risk_profile.risk_score if previous_risk_profile else None
            baseline_risk_score = baseline_risk_profile.risk_score if baseline_risk_profile else None

            # -------------------------------------------------------------
            # C. RISK SCORE MOVEMENT (Movement between Risk Scores)
            # -------------------------------------------------------------
            risk_pct_change, risk_trend = calculate_percentage_change(
                current=current_risk_score,
                previous=previous_risk_score
            )

            # Severity derived strictly from normalized risk score (0-30 LOW, 31-60 MED, 61-80 HIGH, 81-100 CRIT)
            severity = calculate_severity(
                risk_score=current_risk_score,
                percentage_change=canonical_metric_change,
                canonical_name=canonical_name,
                direction=raw_metric_trend
            )

            sig_id = f"sig_{str(uuid.uuid4())[:8]}"
            explanation = current_risk_profile.explanation

            if canonical_name in signals_map:
                # Merge into existing signal to consolidate cross-source evidence
                existing_sig = signals_map[canonical_name]
                if ev.evidence_id not in existing_sig.supporting_evidence_ids:
                    existing_sig.supporting_evidence_ids.append(ev.evidence_id)
                if ev.evidence_id not in existing_sig.evidence_ids:
                    existing_sig.evidence_ids.append(ev.evidence_id)
                existing_sig.evidence_count = len(existing_sig.supporting_evidence_ids)
                if ev.citation and ev.citation not in existing_sig.supporting_citations:
                    existing_sig.supporting_citations.append(ev.citation)
                if existing_sig.risk_score is None and current_risk_score is not None:
                    existing_sig.risk_score = current_risk_score
                    existing_sig.previous_risk_score = previous_risk_score
                    existing_sig.baseline_risk_score = baseline_risk_score
                    existing_sig.risk_change_percent = risk_pct_change
                    existing_sig.risk_trend = risk_trend
                    existing_sig.severity = severity
                    existing_sig.scoring_method = current_risk_profile.scoring_method.value
                    existing_sig.polarity = current_risk_profile.polarity.value
                    existing_sig.benchmark_target = current_risk_profile.benchmark_target
                    existing_sig.benchmark_critical = current_risk_profile.benchmark_critical
                    existing_sig.explanation = explanation
            else:
                signals_map[canonical_name] = NormalizedSignal(
                    signal_id=sig_id,
                    project_id=project_id,
                    company_id=company_id,
                    canonical_name=canonical_name,
                    category=category,
                    
                    # 1. Risk Score Fields
                    risk_score=current_risk_score,
                    previous_risk_score=previous_risk_score,
                    baseline_risk_score=baseline_risk_score,
                    risk_change_percent=risk_pct_change,
                    risk_trend=risk_trend,
                    scoring_method=current_risk_profile.scoring_method.value,
                    polarity=current_risk_profile.polarity.value,
                    benchmark_target=current_risk_profile.benchmark_target,
                    benchmark_critical=current_risk_profile.benchmark_critical,
                    unit=ev.unit,
                    
                    # 2. Raw Metric Fields
                    baseline_value=base_val,
                    previous_value=prev_val,
                    current_value=curr_val,
                    baseline_timestamp=ev.baseline_timestamp,
                    previous_timestamp=ev.previous_timestamp,
                    current_timestamp=ev.current_timestamp or ev.timestamp,
                    baseline_to_current_change_percent=base_to_curr_pct,
                    previous_to_current_change_percent=prev_to_curr_pct,
                    metric_change_percent=canonical_metric_change,
                    metric_trend=raw_metric_trend,
                    
                    # 3. Backwards Compatibility Aliases
                    baseline_score=baseline_risk_score,
                    previous_score=previous_risk_score,
                    baseline_to_current_change=base_to_curr_pct,
                    previous_to_current_change=prev_to_curr_pct,
                    percentage_change=canonical_metric_change,
                    change_percent=canonical_metric_change,
                    direction=raw_metric_trend,
                    trend=raw_metric_trend,
                    
                    # 4. Provenance & Severity
                    velocity=velocity,
                    persistence="OBSERVED_IN_CURRENT_RELEASE",
                    severity=severity,
                    confidence=current_risk_profile.confidence,
                    evidence_count=1,
                    supporting_evidence_ids=[ev.evidence_id],
                    evidence_ids=[ev.evidence_id],
                    supporting_citations=[ev.citation] if ev.citation else [],
                    explanation=explanation
                )

        # 2. Multi-Source Signal Synthesis: Check for Composite Patterns
        signal_names = set(signals_map.keys())

        # Technical Reliability Stress Pattern (e.g. Bugs + CI Failures + Overtime / Review drop)
        tech_degradation_indicators = {"UNRESOLVED_BUGS", "OPEN_BUGS", "CI_FAILURES", "DEVELOPER_OVERTIME", "CODE_REVIEW_VELOCITY"}
        matching_tech = tech_degradation_indicators.intersection(signal_names)
        
        if len(matching_tech) >= 2:
            composite_name = "TECHNICAL_RELIABILITY_STRESS"
            if composite_name not in signals_map:
                all_evidence_ids = []
                all_citations = []
                scores = []
                for name in matching_tech:
                    all_evidence_ids.extend(signals_map[name].supporting_evidence_ids)
                    all_citations.extend(signals_map[name].supporting_citations)
                    if signals_map[name].risk_score is not None:
                        scores.append(signals_map[name].risk_score)
                
                comp_risk_score = round(sum(scores) / len(scores), 2) if scores else 75.0
                comp_severity = calculate_severity(risk_score=comp_risk_score)
                unique_ev_ids = list(dict.fromkeys(all_evidence_ids))

                signals_map[composite_name] = NormalizedSignal(
                    signal_id=f"sig_{str(uuid.uuid4())[:8]}",
                    project_id=project_id,
                    company_id=company_id,
                    canonical_name=composite_name,
                    category=SignalCategory.TECHNICAL,
                    risk_score=comp_risk_score,
                    previous_risk_score=comp_risk_score,
                    risk_change_percent=0.0,
                    risk_trend=Direction.STABLE,
                    scoring_method="COMPOSITE_SYNTHESIS",
                    polarity="HIGHER_IS_WORSE",
                    baseline_value=comp_risk_score,
                    current_value=comp_risk_score,
                    previous_value=comp_risk_score,
                    baseline_to_current_change_percent=0.0,
                    previous_to_current_change_percent=0.0,
                    metric_change_percent=0.0,
                    metric_trend=Direction.STABLE,
                    percentage_change=None,
                    change_percent=None,
                    direction=Direction.INCREASING,
                    trend=Direction.INCREASING,
                    severity=comp_severity,
                    confidence=0.85,
                    evidence_count=len(unique_ev_ids),
                    supporting_evidence_ids=unique_ev_ids,
                    evidence_ids=unique_ev_ids,
                    supporting_citations=list(dict.fromkeys(all_citations)),
                    explanation="Multi-source correlation: Simultaneous increase in technical defects, pipeline failures, and team workload."
                )

        # 3. Detect Grounded Candidate Relationships
        detected_signals = list(signals_map.values())
        
        # Rule: UNRESOLVED_BUGS -> CI_FAILURES
        bug_key = "UNRESOLVED_BUGS" if "UNRESOLVED_BUGS" in signals_map else ("OPEN_BUGS" if "OPEN_BUGS" in signals_map else None)
        if bug_key and "CI_FAILURES" in signals_map:
            relationships.append(SignalRelationship(
                source_signal_name=bug_key,
                target_signal_name="CI_FAILURES",
                relationship_type="ASSOCIATED_WITH",
                strength=0.75,
                confidence=0.80,
                supporting_evidence_ids=signals_map[bug_key].supporting_evidence_ids + signals_map["CI_FAILURES"].supporting_evidence_ids,
                explanation="Elevated bug backlog is associated with increased build and test pipeline failures."
            ))

        # Rule: CI_FAILURES -> RELEASE_DELAY
        if "CI_FAILURES" in signals_map and "RELEASE_DELAY" in signals_map:
            relationships.append(SignalRelationship(
                source_signal_name="CI_FAILURES",
                target_signal_name="RELEASE_DELAY",
                relationship_type="POTENTIAL_DRIVER",
                strength=0.85,
                confidence=0.85,
                supporting_evidence_ids=signals_map["CI_FAILURES"].supporting_evidence_ids + signals_map["RELEASE_DELAY"].supporting_evidence_ids,
                explanation="Persistent pipeline failures represent a potential driver for scheduled release delays."
            ))

        # Rule: DEVELOPER_OVERTIME -> CODE_REVIEW_VELOCITY
        if "DEVELOPER_OVERTIME" in signals_map and "CODE_REVIEW_VELOCITY" in signals_map:
            relationships.append(SignalRelationship(
                source_signal_name="DEVELOPER_OVERTIME",
                target_signal_name="CODE_REVIEW_VELOCITY",
                relationship_type="CORRELATED",
                strength=0.70,
                confidence=0.75,
                supporting_evidence_ids=signals_map["DEVELOPER_OVERTIME"].supporting_evidence_ids + signals_map["CODE_REVIEW_VELOCITY"].supporting_evidence_ids,
                explanation="High overtime hours correlate with decreased code review turnaround."
            ))

        logger.info(f"[SignalAgent] Synthesized {len(detected_signals)} normalized signals and {len(relationships)} relationships.")
        return detected_signals, relationships
