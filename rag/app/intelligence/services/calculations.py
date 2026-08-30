from typing import Optional, List, Tuple, Dict
from ..schemas.evidence import Direction
from ..schemas.signals import SignalSeverity, SignalCategory, DimensionRiskScore, NormalizedSignal
from ..schemas.analysis import ConfidenceSummary

def calculate_risk_score(
    value: Optional[float],
    canonical_name: str = "",
    fact_type: str = "",
    unit: Optional[str] = None,
    baseline_value: Optional[float] = None,
    baseline_to_current_change_percent: Optional[float] = None
) -> Optional[float]:
    """
    Deterministic metric-aware calculation of risk scores to bounded 0-100 range.
    Uses metric polarity, domain archetypes, and baseline trajectories.
    """
    if value is None:
        return None
    try:
        from .risk_scoring_engine import RiskScoringEngine
        res = RiskScoringEngine.calculate_risk_profile(
            current_value=float(value),
            baseline_value=float(baseline_value) if baseline_value is not None else None,
            baseline_to_current_change_percent=baseline_to_current_change_percent,
            canonical_name=canonical_name,
            unit=unit
        )
        return res.risk_score
    except Exception:
        val = float(value)
        return round(max(0.0, min(100.0, val)), 2)


def calculate_percentage_change(
    current: Optional[float], 
    previous: Optional[float]
) -> Tuple[Optional[float], Direction]:
    """
    Deterministic calculation of percentage change between two numerical values.
    Handles zero denominators, negative values, and precision bounds.
    ZERO LLM ARITHMETIC.
    """
    if current is None or previous is None:
        return None, Direction.UNKNOWN
    
    try:
        current_val = float(current)
        prev_val = float(previous)
    except (ValueError, TypeError):
        return None, Direction.UNKNOWN

    if prev_val == 0.0:
        if current_val > 0.0:
            return 100.0, Direction.INCREASING
        elif current_val < 0.0:
            return -100.0, Direction.DECREASING
        else:
            return 0.0, Direction.STABLE

    pct = ((current_val - prev_val) / abs(prev_val)) * 100.0
    pct = round(pct, 2)

    if pct > 0.01:
        direction = Direction.INCREASING
    elif pct < -0.01:
        direction = Direction.DECREASING
    else:
        direction = Direction.STABLE

    return pct, direction


def calculate_velocity(
    percentage_change: Optional[float],
    time_period_days: Optional[float] = None
) -> Optional[float]:
    """
    Computes velocity (rate of change normalized per 30-day window).
    """
    if percentage_change is None:
        return None
    
    days = time_period_days if (time_period_days and time_period_days > 0) else 30.0
    velocity = (percentage_change / days) * 30.0
    return round(velocity, 2)


def calculate_severity(
    risk_score: Optional[float] = None,
    percentage_change: Optional[float] = None,
    canonical_name: str = "",
    direction: Direction = Direction.UNKNOWN,
    explicit_severity: Optional[str] = None
) -> SignalSeverity:
    """
    Deterministic rule-based severity assignment.
    
    1. Explicit Severity Override:
       Returns explicit severity if provided.
       
    2. Normalized Risk Score (0-100) Primary Rule:
       When risk_score is available, severity is determined strictly from risk_score:
       0–30   = LOW
       31–60  = MEDIUM
       61–80  = HIGH
       81–100 = CRITICAL
       
    3. Percentage Change Fallback:
       Only used when risk_score is None:
       abs_change >= 40% -> CRITICAL
       abs_change >= 20% -> HIGH
       abs_change >= 10% -> MEDIUM
       else              -> LOW
    """
    if explicit_severity:
        try:
            return SignalSeverity(explicit_severity.upper())
        except ValueError:
            pass

    # 1. Primary Rule: Strict Risk Score (0-100) Mapping
    if risk_score is not None:
        try:
            score = float(risk_score)
            if score <= 30.0:
                return SignalSeverity.LOW
            elif score <= 60.0:
                return SignalSeverity.MEDIUM
            elif score <= 80.0:
                return SignalSeverity.HIGH
            else:
                return SignalSeverity.CRITICAL
        except (ValueError, TypeError):
            pass

    # 2. Fallback Rule: Percentage-change severity when risk_score is None
    if percentage_change is not None:
        abs_change = abs(percentage_change)
        
        negative_indicators = {
            "CI_FAILURES", "UNRESOLVED_BUGS", "ERROR_RATE", "RELEASE_DELAY", 
            "DEVELOPER_OVERTIME", "SECURITY_VULNERABILITIES", "STUDENT_DROPOUT_RATE", "FEE_DEFAULT_RATE"
        }
        positive_indicators = {
            "CODE_REVIEW_VELOCITY", "DEPLOYMENT_FREQUENCY", "SPRINT_VELOCITY_DROP", "ATTENDANCE_DROP"
        }
        
        is_adverse = False
        if canonical_name in negative_indicators:
            is_adverse = (direction == Direction.INCREASING)
        elif canonical_name in positive_indicators or "DROP" in canonical_name or "VELOCITY" in canonical_name:
            is_adverse = (direction == Direction.DECREASING) or (direction == Direction.INCREASING and "DROP" in canonical_name)
        else:
            is_adverse = (abs_change >= 20.0)
        
        if is_adverse:
            if abs_change >= 40.0:
                return SignalSeverity.CRITICAL
            elif abs_change >= 20.0:
                return SignalSeverity.HIGH
            elif abs_change >= 10.0:
                return SignalSeverity.MEDIUM
            else:
                return SignalSeverity.LOW
        else:
            return SignalSeverity.LOW

    return SignalSeverity.LOW


def calculate_confidence_summary(
    evidence_confidences: List[float],
    signal_confidences: List[float],
    total_chunks: int
) -> ConfidenceSummary:
    """
    Computes statistical confidence summary across extracted items.
    """
    ev_count = len(evidence_confidences)
    sig_count = len(signal_confidences)

    if ev_count == 0:
        return ConfidenceSummary(
            overall_confidence=0.0,
            evidence_count=0,
            signal_count=0,
            grounded_ratio=0.0
        )

    avg_ev = sum(evidence_confidences) / ev_count
    avg_sig = (sum(signal_confidences) / sig_count) if sig_count > 0 else avg_ev
    overall = round((avg_ev * 0.6) + (avg_sig * 0.4), 2)
    grounded = 1.0 if total_chunks > 0 else 0.0

    return ConfidenceSummary(
        overall_confidence=overall,
        evidence_count=ev_count,
        signal_count=sig_count,
        grounded_ratio=grounded
    )


def aggregate_dimension_risk_scores(
    signals: List[NormalizedSignal]
) -> List[DimensionRiskScore]:
    """
    Aggregates signals into deterministic dimension risk scores.
    Preserves evidence lineage and statistical confidence.
    ZERO FABRICATED SCORES.
    """
    if not signals:
        return []

    dimension_map: Dict[SignalCategory, List[NormalizedSignal]] = {}
    for sig in signals:
        if sig.category not in dimension_map:
            dimension_map[sig.category] = []
        dimension_map[sig.category].append(sig)

    results: List[DimensionRiskScore] = []

    for dim, dim_signals in dimension_map.items():
        scored_signals = [s for s in dim_signals if s.risk_score is not None]
        if not scored_signals:
            continue

        avg_score = round(sum(s.risk_score for s in scored_signals) / len(scored_signals), 2)
        avg_score = max(0.0, min(100.0, avg_score))
        
        prev_scores = [
            s.previous_risk_score if s.previous_risk_score is not None else s.previous_score 
            for s in scored_signals 
            if (s.previous_risk_score is not None or s.previous_score is not None)
        ]
        avg_prev = round(sum(prev_scores) / len(prev_scores), 2) if prev_scores else None

        pct_change, trend = calculate_percentage_change(current=avg_score, previous=avg_prev)
        severity = calculate_severity(risk_score=avg_score)
        
        all_ev_ids = []
        for s in dim_signals:
            all_ev_ids.extend(s.supporting_evidence_ids)
            all_ev_ids.extend(s.evidence_ids)
        unique_ev_ids = list(dict.fromkeys([e for e in all_ev_ids if e]))

        avg_conf = round(sum(s.confidence for s in dim_signals) / len(dim_signals), 2)

        results.append(DimensionRiskScore(
            dimension=dim,
            risk_score=avg_score,
            severity=severity,
            previous_risk_score=avg_prev,
            previous_score=avg_prev,
            risk_change_percent=pct_change,
            change_percent=pct_change,
            risk_trend=trend,
            trend=trend,
            confidence=avg_conf,
            evidence_count=len(unique_ev_ids),
            evidence_ids=unique_ev_ids
        ))

    return results
