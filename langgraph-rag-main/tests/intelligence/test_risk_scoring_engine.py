import pytest
from app.intelligence.services.risk_scoring_engine import (
    RiskScoringEngine,
    MetricSemanticProfiler,
    Polarity,
    RiskScoringMethod,
    DOMAIN_ARCHETYPES
)
from app.intelligence.services.calculations import calculate_severity, calculate_risk_score
from app.intelligence.schemas.signals import SignalSeverity

def test_higher_is_worse_latency_archetype_not_clamped_to_100():
    """
    Crucial regression: P95 latency of 370ms must NOT automatically become 100 simply because 370 > 100.
    With Target=200ms, Critical=500ms, 370ms is elevated but not critical -> 54.0/100 (MEDIUM).
    """
    res = RiskScoringEngine.calculate_risk_profile(
        current_value=370.0,
        baseline_value=318.0,
        baseline_to_current_change_percent=16.35,
        canonical_name="API_P95_MS",
        unit="ms",
        supporting_evidence_ids=["ev_lat_1"]
    )

    assert res.scoring_method == RiskScoringMethod.DOMAIN_ARCHETYPE
    assert res.polarity == Polarity.HIGHER_IS_WORSE
    assert res.risk_score == 54.0
    assert calculate_severity(risk_score=res.risk_score) == SignalSeverity.MEDIUM
    assert "370.0 ms" in res.explanation
    assert "ev_lat_1" in res.supporting_evidence_ids

def test_neutral_traffic_volume_not_equal_to_raw_number():
    """
    Crucial regression: 7.2 million requests must NOT become risk 7.2.
    Traffic volume represents scale, not failure risk -> 15.0/100 (LOW).
    """
    res = RiskScoringEngine.calculate_risk_profile(
        current_value=7.2,
        baseline_value=4.8,
        previous_value=7.0,
        baseline_to_current_change_percent=50.0,
        canonical_name="API_REQUESTS_MILLIONS",
        unit="millions",
        supporting_evidence_ids=["ev_req_1"]
    )

    assert res.scoring_method == RiskScoringMethod.NEUTRAL_TELEMETRY
    assert res.polarity == Polarity.NEUTRAL_INFORMATIONAL
    assert res.risk_score == 15.0
    assert calculate_severity(risk_score=res.risk_score) == SignalSeverity.LOW
    assert "7.2 millions" in res.explanation

def test_lower_is_worse_availability_archetype():
    """
    Availability of 94.2% breaches 95.0% critical threshold -> CRITICAL.
    Availability of 99.95% meets 99.9% target -> LOW.
    """
    # Healthy availability
    res_healthy = RiskScoringEngine.calculate_risk_profile(
        current_value=99.95,
        canonical_name="PLATFORM_AVAILABILITY",
        unit="%"
    )
    assert res_healthy.polarity == Polarity.LOWER_IS_WORSE
    assert res_healthy.risk_score <= 20.0
    assert calculate_severity(risk_score=res_healthy.risk_score) == SignalSeverity.LOW

    # Critical breach
    res_crit = RiskScoringEngine.calculate_risk_profile(
        current_value=94.2,
        canonical_name="PLATFORM_AVAILABILITY",
        unit="%"
    )
    assert res_crit.polarity == Polarity.LOWER_IS_WORSE
    assert res_crit.risk_score >= 80.0
    assert calculate_severity(risk_score=res_crit.risk_score) == SignalSeverity.CRITICAL

def test_explicit_in_document_sla_takes_highest_priority():
    """
    Explicit in-document SLA (Target=100ms, Critical=250ms) overrides domain default (200/500).
    """
    res = RiskScoringEngine.calculate_risk_profile(
        current_value=200.0,
        canonical_name="CUSTOM_API_LATENCY",
        unit="ms",
        explicit_target=100.0,
        explicit_critical=250.0,
        supporting_evidence_ids=["ev_sla_1"]
    )

    assert res.scoring_method == RiskScoringMethod.EXPLICIT_SLA_BENCHMARK
    assert res.benchmark_target == 100.0
    assert res.benchmark_critical == 250.0
    # 200 is in (100, 250]: 20 + (100/150)*60 = 20 + 40 = 60.0 (MEDIUM)
    assert res.risk_score == 60.0
    assert calculate_severity(risk_score=res.risk_score) == SignalSeverity.MEDIUM

def test_baseline_relative_trajectory_for_custom_metric():
    """
    For custom metric with no known SLA (e.g. data_quality_incidents),
    +66.67% increase from baseline produces severe degradation risk (HIGH).
    """
    res = RiskScoringEngine.calculate_risk_profile(
        current_value=30.0,
        baseline_value=18.0,
        previous_value=29.0,
        baseline_to_current_change_percent=66.67,
        canonical_name="DATA_QUALITY_DISCREPANCIES",
        unit="count"
    )

    assert res.scoring_method == RiskScoringMethod.BASELINE_RELATIVE_DELTA
    assert res.polarity == Polarity.HIGHER_IS_WORSE
    # 66.67% delta in [30, 75]: 55 + (36.67)*0.55 = 75.17
    assert 70.0 <= res.risk_score <= 80.0
    assert calculate_severity(risk_score=res.risk_score) == SignalSeverity.HIGH

def test_unknown_metric_single_point_does_not_fabricate_high_risk():
    """
    Completely unknown metric (e.g. quantum_qubit_dwell_time = 840) with no history or SLA
    must NEVER be clamped to 100 or hallucinate high risk -> neutral 20.0 (LOW).
    """
    res = RiskScoringEngine.calculate_risk_profile(
        current_value=840.0,
        canonical_name="QUANTUM_QUBIT_DWELL_TIME",
        unit="seconds"
    )

    assert res.scoring_method == RiskScoringMethod.NEUTRAL_TELEMETRY
    assert res.risk_score <= 20.0
    assert calculate_severity(risk_score=res.risk_score) == SignalSeverity.LOW
    assert "uncalibrated operational telemetry" in res.explanation

def test_target_band_polarity():
    """
    Target band metric (e.g. Battery SOC target 20-80%):
    50% is safe (10.0 risk), 95% is high risk.
    """
    # Safe within band
    res_safe = RiskScoringEngine._score_against_benchmarks(
        val=50.0, target=20.0, critical=80.0, polarity=Polarity.TARGET_BAND
    )
    assert res_safe == 10.0

    # Over safe limit
    res_high = RiskScoringEngine._score_against_benchmarks(
        val=95.0, target=20.0, critical=80.0, polarity=Polarity.TARGET_BAND
    )
    assert res_high > 30.0

@pytest.mark.parametrize("val,expected_bounded", [
    (-500.0, 0.0),
    (0.0, 0.0),
    (100.0, 20.0),   # At target (200) -> 10.0
    (200.0, 20.0),   # At target -> 20.0
    (500.0, 80.0),   # At critical -> 80.0
    (1000.0, 100.0), # Extreme surge -> capped at 100.0
    (1000000.0, 100.0)
])
def test_higher_is_worse_piecewise_invariants(val, expected_bounded):
    score = RiskScoringEngine._score_against_benchmarks(
        val=val, target=200.0, critical=500.0, polarity=Polarity.HIGHER_IS_WORSE
    )
    assert 0.0 <= score <= 100.0
    if val <= 0:
        assert score == 0.0
    elif val == 200.0:
        assert score == 20.0
    elif val == 500.0:
        assert score == 80.0
    elif val >= 1000.0:
        assert score == 100.0

def test_calculations_calculate_risk_score_delegation():
    """
    Ensures calculations.calculate_risk_score delegates to RiskScoringEngine properly.
    """
    score = calculate_risk_score(
        value=370.0,
        canonical_name="API_P95_MS",
        unit="ms"
    )
    assert score == 54.0
