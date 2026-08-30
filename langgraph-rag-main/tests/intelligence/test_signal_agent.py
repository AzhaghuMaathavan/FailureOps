import pytest
from app.intelligence.agents.signal_agent import SignalAgent
from app.intelligence.services.normalization import normalize_signal_name
from app.intelligence.services.calculations import (
    calculate_percentage_change,
    calculate_velocity,
    calculate_severity,
    calculate_risk_score,
    aggregate_dimension_risk_scores
)
from app.intelligence.schemas.evidence import EvidenceItem, FactType, Direction
from app.intelligence.schemas.signals import SignalSeverity, SignalCategory, NormalizedSignal

def test_signal_normalization_aliases():
    # Technical aliases
    name1, cat1 = normalize_signal_name("build failures in main branch")
    assert name1 == "CI_FAILURES"
    assert cat1 == SignalCategory.TECHNICAL

    name2, cat2 = normalize_signal_name("open bugs in backlog")
    assert name2 == "UNRESOLVED_BUGS"
    assert cat2 == SignalCategory.TECHNICAL

    # Operational aliases
    name3, cat3 = normalize_signal_name("weekend developer overtime")
    assert name3 == "DEVELOPER_OVERTIME"
    assert cat3 == SignalCategory.OPERATIONAL

    # Academic aliases
    name4, cat4 = normalize_signal_name("student attendance percentage drop")
    assert name4 == "ATTENDANCE_DROP"
    assert cat4 == SignalCategory.ACADEMIC

def test_deterministic_percentage_calculations():
    # Normal increase
    pct, direction = calculate_percentage_change(current=29.0, previous=20.0)
    assert pct == 45.0
    assert direction == Direction.INCREASING

    # Normal decrease
    pct, direction = calculate_percentage_change(current=70.0, previous=100.0)
    assert pct == -30.0
    assert direction == Direction.DECREASING

    # Zero baseline
    pct, direction = calculate_percentage_change(current=15.0, previous=0.0)
    assert pct == 100.0
    assert direction == Direction.INCREASING

    # Zero to zero
    pct, direction = calculate_percentage_change(current=0.0, previous=0.0)
    assert pct == 0.0
    assert direction == Direction.STABLE

    # None handling
    pct, direction = calculate_percentage_change(current=None, previous=20.0)
    assert pct is None
    assert direction == Direction.UNKNOWN

def test_deterministic_severity_calculation():
    # 1. Exact 0-100 Risk Score Threshold Boundary Rules (Strict Score-First)
    assert calculate_severity(risk_score=0.0) == SignalSeverity.LOW
    assert calculate_severity(risk_score=20.0) == SignalSeverity.LOW
    assert calculate_severity(risk_score=30.0) == SignalSeverity.LOW
    assert calculate_severity(risk_score=31.0) == SignalSeverity.MEDIUM
    assert calculate_severity(risk_score=60.0) == SignalSeverity.MEDIUM
    assert calculate_severity(risk_score=61.0) == SignalSeverity.HIGH
    assert calculate_severity(risk_score=76.0) == SignalSeverity.HIGH
    assert calculate_severity(risk_score=80.0) == SignalSeverity.HIGH
    assert calculate_severity(risk_score=81.0) == SignalSeverity.CRITICAL
    assert calculate_severity(risk_score=100.0) == SignalSeverity.CRITICAL

    # 2. Specifically test that percentage change does NOT escalate severity when risk_score is available
    assert calculate_severity(risk_score=30.0, percentage_change=66.67, canonical_name="FACILITIES_SUPPORTED") == SignalSeverity.LOW
    assert calculate_severity(risk_score=30.0, percentage_change=150.0, canonical_name="CI_FAILURES", direction=Direction.INCREASING) == SignalSeverity.LOW
    assert calculate_severity(risk_score=60.0, percentage_change=80.0, canonical_name="UNRESOLVED_BUGS") == SignalSeverity.MEDIUM

    # 3. Fallback to percentage change rules ONLY when risk_score is None
    # 45% increase in CI_FAILURES -> CRITICAL
    sev = calculate_severity(risk_score=None, percentage_change=45.0, canonical_name="CI_FAILURES", direction=Direction.INCREASING)
    assert sev == SignalSeverity.CRITICAL

    # 25% decrease in attendance -> HIGH
    sev = calculate_severity(risk_score=None, percentage_change=-25.0, canonical_name="ATTENDANCE_DROP", direction=Direction.DECREASING)
    assert sev == SignalSeverity.HIGH

    # 5% change -> LOW
    sev = calculate_severity(risk_score=None, percentage_change=5.0, canonical_name="UNRESOLVED_BUGS", direction=Direction.INCREASING)
    assert sev == SignalSeverity.LOW

def test_risk_score_clamping_and_validation():
    # Within range
    assert calculate_risk_score(76.0, canonical_name="TECHNICAL_RISK") == 76.0
    # Clamping negative
    assert calculate_risk_score(-15.0, canonical_name="TECHNICAL_RISK") == 0.0
    # Clamping above 100
    assert calculate_risk_score(150.0, canonical_name="TECHNICAL_RISK") == 100.0
    # None handling
    assert calculate_risk_score(None) is None

def test_risk_score_76_serializes_as_76_not_0():
    ev = EvidenceItem(
        evidence_id="ev_test_76",
        project_id="p1",
        statement="Technical Risk score is 76",
        fact_type=FactType.METRIC,
        metric_name="Technical Risk",
        previous_value=76.0,
        current_value=76.0,
        direction=Direction.STABLE,
        source_document_id="doc_1",
        source_document_name="Report.pdf",
        source_chunk_id="chk_1",
        citation="Report.pdf (Page: 1)",
        extraction_confidence=0.95
    )
    signals, _ = SignalAgent.analyze_signals(
        evidence_items=[ev],
        events=[],
        claims=[],
        project_id="p1"
    )
    assert len(signals) == 1
    sig = signals[0]
    # Verify score is 76, change is 0%, severity is HIGH (not LOW)
    assert sig.risk_score == 76.0
    assert sig.previous_risk_score == 76.0
    assert sig.previous_score == 76.0
    assert sig.risk_change_percent == 0.0
    assert sig.metric_change_percent == 0.0
    assert sig.risk_trend == Direction.STABLE
    assert sig.metric_trend == Direction.STABLE
    assert sig.severity == SignalSeverity.HIGH
    assert sig.confidence == 0.95
    assert sig.evidence_count == 1
    assert "ev_test_76" in sig.supporting_evidence_ids

def test_increased_and_decreased_risk_calculations():
    # 50 -> 75 (+50% change, risk_score = 75, severity = HIGH)
    pct_inc, dir_inc = calculate_percentage_change(current=75.0, previous=50.0)
    assert pct_inc == 50.0
    assert dir_inc == Direction.INCREASING
    sev_inc = calculate_severity(risk_score=75.0)
    assert sev_inc == SignalSeverity.HIGH

    # 100 -> 80 (-20% change, risk_score = 80, severity = HIGH)
    pct_dec, dir_dec = calculate_percentage_change(current=80.0, previous=100.0)
    assert pct_dec == -20.0
    assert dir_dec == Direction.DECREASING
    sev_dec = calculate_severity(risk_score=80.0)
    assert sev_dec == SignalSeverity.HIGH

def test_division_by_zero_and_missing_evidence_safeguards():
    # previous = 0 handling
    pct, direction = calculate_percentage_change(current=76.0, previous=0.0)
    assert pct == 100.0
    assert direction == Direction.INCREASING

    # Empty signals produce no fabricated dimension scores
    dims = aggregate_dimension_risk_scores([])
    assert dims == []

def test_signal_agent_multi_source_synthesis(sample_evidence_items):
    signals, relationships = SignalAgent.analyze_signals(
        evidence_items=sample_evidence_items,
        events=[],
        claims=[],
        project_id="proj_101",
        company_id="comp_101"
    )

    signal_names = {s.canonical_name for s in signals}
    assert "UNRESOLVED_BUGS" in signal_names
    assert "CI_FAILURES" in signal_names

    # Multi-source composite signal synthesized
    assert "TECHNICAL_RELIABILITY_STRESS" in signal_names

    # Candidate relationship detected
    rel_pairs = {(r.source_signal_name, r.target_signal_name) for r in relationships}
    assert ("UNRESOLVED_BUGS", "CI_FAILURES") in rel_pairs

    # Verify citation preservation
    ci_sig = next(s for s in signals if s.canonical_name == "CI_FAILURES")
    assert "CI_Pipeline_Metrics.docx (Pages: 2)" in ci_sig.supporting_citations
    assert "ev_002" in ci_sig.supporting_evidence_ids

# ============================================================
# PHASE 14 EXPLICIT REGRESSION TESTS: RAW METRIC vs RISK SCORE
# ============================================================

@pytest.mark.parametrize("prev_raw, curr_raw, expected_pct, expected_trend", [
    (974400.0, 1008000.0, 3.45, Direction.INCREASING),   # Raw metric increase
    (1008000.0, 974400.0, -3.33, Direction.DECREASING),  # Raw metric decrease
    (5000.0, 5000.0, 0.0, Direction.STABLE),             # Raw metric unchanged
    (0.0, 500.0, 100.0, Direction.INCREASING),           # Previous raw is 0
    (None, 500.0, None, Direction.UNKNOWN),              # Previous raw is None
])
def test_raw_metric_percentage_and_trend_calculations(prev_raw, curr_raw, expected_pct, expected_trend):
    pct, trend = calculate_percentage_change(current=curr_raw, previous=prev_raw)
    assert pct == expected_pct
    assert trend == expected_trend

@pytest.mark.parametrize("prev_risk, curr_risk, expected_risk_pct, expected_risk_trend", [
    (100.0, 100.0, 0.0, Direction.STABLE),              # Risk score unchanged (clamped upper bound)
    (50.0, 75.0, 50.0, Direction.INCREASING),            # Risk score increase
    (80.0, 60.0, -25.0, Direction.DECREASING),           # Risk score decrease
    (0.0, 50.0, 100.0, Direction.INCREASING),            # Previous risk is 0
    (None, 75.0, None, Direction.UNKNOWN),               # Previous risk is None
])
def test_risk_score_percentage_and_trend_calculations(prev_risk, curr_risk, expected_risk_pct, expected_risk_trend):
    pct, trend = calculate_percentage_change(current=curr_risk, previous=prev_risk)
    assert pct == expected_risk_pct
    assert trend == expected_risk_trend

def test_raw_metric_change_differs_from_risk_score_change():
    """
    Test scenario:
    Raw values: 974,400 -> 1,008,000 (+3.45% change, INCREASING)
    Risk scores: 100.0 -> 100.0 (0.0% change, STABLE)
    Risk score clamped to 100 does NOT modify raw values.
    """
    ev = EvidenceItem(
        evidence_id="ev_energy_01",
        project_id="proj_energy",
        statement="energy_readings_expected changed from 974400 to 1008000",
        fact_type=FactType.METRIC,
        metric_name="energy_readings_expected",
        previous_value=974400.0,
        current_value=1008000.0,
        direction=Direction.INCREASING,
        source_document_id="doc_energy",
        source_document_name="energy.csv",
        source_chunk_id="chunk_energy_1",
        citation="energy.csv (Page: 1)",
        extraction_confidence=0.98
    )

    signals, _ = SignalAgent.analyze_signals(
        evidence_items=[ev],
        events=[],
        claims=[],
        project_id="proj_energy"
    )

    assert len(signals) == 1
    sig = signals[0]

    # 1. Raw metric fields are accurately preserved and calculated
    assert sig.previous_value == 974400.0
    assert sig.current_value == 1008000.0
    assert sig.metric_change_percent == 3.45
    assert sig.metric_trend == Direction.INCREASING

    # 2. Risk score fields are separate and normalized (scale/volume telemetry scored at neutral risk)
    assert sig.risk_score == 15.0
    assert sig.previous_risk_score == 15.0
    assert sig.risk_change_percent == 0.0
    assert sig.risk_trend == Direction.STABLE
    assert sig.severity == SignalSeverity.LOW

    # 3. Raw metric change is NOT equal to risk score change
    assert sig.metric_change_percent != sig.risk_change_percent
    assert sig.metric_trend != sig.risk_trend

    # 4. Provenance intact
    assert sig.evidence_count == 1
    assert "ev_energy_01" in sig.supporting_evidence_ids

def test_risk_score_clamping_does_not_alter_raw_metric():
    """Verify baseline-relative degradation calculation does not alter raw metric magnitude."""
    ev = EvidenceItem(
        evidence_id="ev_clamp_01",
        project_id="proj_clamp",
        statement="raw count is 108 with previous 42",
        fact_type=FactType.METRIC,
        metric_name="data_quality_incidents",
        previous_value=42.0,
        current_value=108.0,
        direction=Direction.INCREASING,
        source_document_id="doc_data",
        source_document_name="data.csv",
        source_chunk_id="chunk_1",
        citation="data.csv",
        extraction_confidence=1.0
    )

    signals, _ = SignalAgent.analyze_signals(
        evidence_items=[ev],
        events=[],
        claims=[],
        project_id="proj_clamp"
    )

    sig = signals[0]
    # Raw values untouched
    assert sig.previous_value == 42.0
    assert sig.current_value == 108.0
    assert sig.metric_change_percent == 157.14
    assert sig.metric_trend == Direction.INCREASING

    # Risk score calculated via trajectory degradation (157.14% surge -> CRITICAL)
    assert sig.risk_score == 100.0
    assert sig.previous_risk_score == 20.0
    assert sig.risk_change_percent == 400.0
    assert sig.risk_trend == Direction.INCREASING
    assert sig.severity == SignalSeverity.CRITICAL

def test_signal_serialization_contract():
    """Verify NormalizedSignal serializes all distinct fields cleanly into dictionary/JSON."""
    sig = NormalizedSignal(
        signal_id="sig_test_serial",
        project_id="proj_serial",
        canonical_name="ENERGY_READINGS_EXPECTED",
        category=SignalCategory.OPERATIONAL,
        risk_score=100.0,
        previous_risk_score=100.0,
        risk_change_percent=0.0,
        risk_trend=Direction.STABLE,
        previous_value=974400.0,
        current_value=1008000.0,
        metric_change_percent=3.45,
        metric_trend=Direction.INCREASING,
        severity=SignalSeverity.CRITICAL,
        confidence=0.99,
        supporting_evidence_ids=["ev_1"],
        supporting_citations=["energy.csv"]
    )

    data = sig.model_dump()
    assert data["canonical_name"] == "ENERGY_READINGS_EXPECTED"
    assert data["risk_score"] == 100.0
    assert data["previous_risk_score"] == 100.0
    assert data["risk_change_percent"] == 0.0
    assert data["risk_trend"] == "STABLE"
    assert data["previous_value"] == 974400.0
    assert data["current_value"] == 1008000.0
    assert data["metric_change_percent"] == 3.45
    assert data["metric_trend"] == "INCREASING"
    assert data["severity"] == "CRITICAL"
    assert data["confidence"] == 0.99

def test_dimension_risk_score_aggregation_preserves_separated_fields():
    signals = [
        NormalizedSignal(
            signal_id="s1",
            project_id="p1",
            canonical_name="UNRESOLVED_BUGS",
            category=SignalCategory.TECHNICAL,
            risk_score=80.0,
            previous_risk_score=60.0,
            risk_change_percent=33.33,
            risk_trend=Direction.INCREASING,
            previous_value=15.0,
            current_value=20.0,
            metric_change_percent=33.33,
            metric_trend=Direction.INCREASING,
            severity=SignalSeverity.HIGH,
            confidence=0.95,
            supporting_evidence_ids=["ev_1"]
        ),
        NormalizedSignal(
            signal_id="s2",
            project_id="p1",
            canonical_name="CI_FAILURES",
            category=SignalCategory.TECHNICAL,
            risk_score=70.0,
            previous_risk_score=70.0,
            risk_change_percent=0.0,
            risk_trend=Direction.STABLE,
            previous_value=10.0,
            current_value=10.0,
            metric_change_percent=0.0,
            metric_trend=Direction.STABLE,
            severity=SignalSeverity.HIGH,
            confidence=0.90,
            supporting_evidence_ids=["ev_2"]
        )
    ]

    dims = aggregate_dimension_risk_scores(signals)
    assert len(dims) == 1
    dim = dims[0]
    assert dim.dimension == SignalCategory.TECHNICAL
    assert dim.risk_score == 75.0 # (80 + 70) / 2
    assert dim.previous_risk_score == 65.0 # (60 + 70) / 2
    assert dim.risk_change_percent == 15.38
    assert dim.risk_trend == Direction.INCREASING
    assert dim.severity == SignalSeverity.HIGH
    assert dim.evidence_count == 2

def test_signal_agent_baseline_and_period_change_preservation():
    """
    Verifies SignalAgent preserves baseline, previous, current values,
    and both baseline_to_current_change_percent (+50%) and previous_to_current_change_percent (+2.86%).
    """
    ev = EvidenceItem(
        evidence_id="ev_api_01",
        project_id="proj_eng",
        statement="api_requests_millions increased from 4.8 to 7.2 (+50.00% total change, previous: 7.0, +2.86% period change)",
        fact_type=FactType.METRIC,
        metric_name="api_requests_millions",
        baseline_value=4.8,
        previous_value=7.0,
        current_value=7.2,
        baseline_timestamp="2026-06-01",
        previous_timestamp="2026-08-17",
        current_timestamp="2026-08-24",
        baseline_to_current_change=50.0,
        previous_to_current_change=2.86,
        baseline_to_current_change_percent=50.0,
        previous_to_current_change_percent=2.86,
        direction=Direction.INCREASING,
        source_document_id="doc_eng",
        source_document_name="engineeringmetrics.csv",
        source_chunk_id="chunk_1",
        citation="engineeringmetrics.csv (Page: 1)",
        extraction_confidence=0.99
    )

    signals, _ = SignalAgent.analyze_signals(
        evidence_items=[ev],
        events=[],
        claims=[],
        project_id="proj_eng"
    )

    assert len(signals) == 1
    sig = signals[0]

    # Raw telemetry values
    assert sig.baseline_value == 4.8
    assert sig.previous_value == 7.0
    assert sig.current_value == 7.2
    assert sig.baseline_timestamp == "2026-06-01"
    assert sig.previous_timestamp == "2026-08-17"
    assert sig.current_timestamp == "2026-08-24"

    # Both explicit percentage changes are populated accurately
    assert sig.baseline_to_current_change_percent == 50.0
    assert sig.previous_to_current_change_percent == 2.86
    assert sig.metric_change_percent == 50.0 # Canonical total change
    assert sig.metric_trend == Direction.INCREASING

    # Risk score movement is separate (scale metric evaluated at neutral risk)
    assert sig.risk_score == 15.0
    assert sig.previous_risk_score == 15.0
    assert sig.risk_change_percent == 0.0
    assert sig.risk_trend == Direction.STABLE
    assert sig.severity == SignalSeverity.LOW
