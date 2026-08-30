import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.models.signal import SignalItem

from app.schemas.evidence_packet import (
    EvidencePacket,
    EvidenceItemSchema,
    EvidenceConflictSchema,
    ConflictClaim,
    EvidenceSource,
    NormalizedMetric,
    PrivacyMetadata,
    EvidenceMetrics
)

from app.schemas.signal_input import SignalInputContext, VerifiedEvidenceContextItem
from app.schemas.signal_packet import SignalPacket, SignalItemSchema, OverallSignalSummary

from app.services.signal_consumer import consume_evidence_packet
from app.services.evidence_grouper import group_verified_evidence
from app.services.trend_detector import (
    calculate_numerical_trend,
    evaluate_metric_polarity,
    detect_trends_from_groups
)
from app.services.relationship_detector import detect_evidence_relationships
from app.services.signal_agent import (
    calculate_deterministic_signal_strength,
    calculate_deterministic_signal_confidence,
    validate_and_ground_signal,
    generate_signal_packet
)

# Test in-memory SQLite fixture
@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def create_sample_item(
    ev_id: str,
    category: str,
    statement: str,
    doc_name: str = "doc_alpha.pdf",
    metric_name: str = None,
    before: float = None,
    after: float = None,
    conf: float = 0.90,
    status: str = "VERIFIED"
) -> EvidenceItemSchema:
    norm = None
    if metric_name or after is not None:
        norm = NormalizedMetric(
            metric=metric_name or "test_metric",
            before=before,
            after=after,
            unit="percent",
            direction="DECREASE" if before and after and after < before else "INCREASE"
        )
    return EvidenceItemSchema(
        id=ev_id,
        category=category,
        evidence_type="METRIC" if norm else "OBSERVATION",
        statement=statement,
        normalized_value=norm,
        time_period=None,
        source=EvidenceSource(
            document_id=f"doc_{doc_name}",
            document_name=doc_name,
            page_number=1,
            block_id="blk_001",
            content_snippet=statement,
            lineage={"document_name": doc_name}
        ),
        supporting_sources=[],
        supporting_chunk_ids=["chk_001"],
        evidence_confidence=conf,
        verification_status=status,
        privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
    )

# 1. Grouping by Category
def test_evidence_grouping_by_category():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation dropped to 33%."),
        create_sample_item("ev_2", "TECHNICAL", "CI build failure increased to 34%.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "TECHNICAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    assert groups.total_groups == 2
    cats = {g.primary_category for g in groups.groups}
    assert "ADOPTION" in cats
    assert "TECHNICAL" in cats

# 2. Grouping by Topic
def test_evidence_grouping_by_topic():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Signup abandonment rate rose to 76% in onboarding."),
        create_sample_item("ev_2", "CUSTOMER", "Customer feedback: onboarding steps are confusing.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "CUSTOMER": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    assert any("Onboarding" in g.group_name for g in groups.groups)

# 3. No Evidence Lost in Grouping
def test_no_evidence_lost_in_grouping():
    items = [create_sample_item(f"ev_{i}", "TECHNICAL", f"Statement {i} regarding latency.") for i in range(5)]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"TECHNICAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=5, verified_count=5, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    grouped_ids = set()
    for g in groups.groups:
        grouped_ids.update(g.evidence_ids)
    assert grouped_ids == {f"ev_{i}" for i in range(5)}

# 4. Trend Decreasing Series
def test_trend_decreasing_series():
    direction, delta_val, delta_pct = calculate_numerical_trend([52, 47, 41, 33])
    assert direction == "DECREASE" or direction == "DECREASING"
    assert delta_val == -19.0

# 5. Trend Increasing Series
def test_trend_increasing_series():
    direction, delta_val, delta_pct = calculate_numerical_trend([33, 41, 52, 71])
    assert direction == "INCREASE" or direction == "INCREASING"
    assert delta_val == 38.0

# 6. Trend Stable Series
def test_trend_stable_series():
    direction, delta_val, delta_pct = calculate_numerical_trend([50, 50, 51, 49])
    assert direction == "STABLE"

# 7. Trend Insufficient Data on Single Point
def test_trend_insufficient_data_single_point():
    direction, delta_val, delta_pct = calculate_numerical_trend([33])
    assert direction == "INSUFFICIENT_DATA"
    assert delta_val is None

# 8. Metric Semantics: Activation
def test_trend_metric_semantics_activation():
    polarity = evaluate_metric_polarity("activation_rate", "DECREASING")
    assert polarity == "NEGATIVE"

# 9. Metric Semantics: Incidents
def test_trend_metric_semantics_incidents():
    polarity = evaluate_metric_polarity("incident_count", "DECREASING")
    assert polarity == "POSITIVE"

# 10. Metric Semantics: Unknown
def test_trend_metric_semantics_unknown():
    polarity = evaluate_metric_polarity("arbitrary_metric_foo", "INCREASING")
    assert polarity == "UNKNOWN"

# 11. Cross-Evidence Relationship: Onboarding Friction
def test_relationship_onboarding_friction():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation dropped from 52% to 33%."),
        create_sample_item("ev_2", "CUSTOMER", "Customer feedback: multi-step onboarding setup causes drop-off.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "CUSTOMER": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    types = [r.relationship_type for r in rels.relationships]
    assert "ONBOARDING_FRICTION" in types

# 12. Cross-Evidence Relationship: Technical Stress
def test_relationship_technical_stress():
    items = [
        create_sample_item("ev_1", "TECHNICAL", "CI build failure rate increased to 34%."),
        create_sample_item("ev_2", "QUALITY", "P1 bug backlog increased to 42 open defects.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"TECHNICAL": "HIGH", "QUALITY": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    types = [r.relationship_type for r in rels.relationships]
    assert "TECHNICAL_RELIABILITY_STRESS" in types

# 13. Cross-Evidence Relationship: Operational Overload
def test_relationship_operational_overload():
    items = [
        create_sample_item("ev_1", "OPERATIONAL", "Engineering team logged 58 hours workweek overtime."),
        create_sample_item("ev_2", "OPERATIONAL", "PR review latency lengthened to 3.4 days.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"OPERATIONAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    types = [r.relationship_type for r in rels.relationships]
    assert "OPERATIONAL_OVERLOAD_DRAG" in types

# 14. Cross-Evidence Relationship: Positive Momentum
def test_relationship_positive_momentum():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation increased from 52% to 71%."),
        create_sample_item("ev_2", "TECHNICAL", "Production incidents decreased by 40%.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "TECHNICAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    types = [r.relationship_type for r in rels.relationships]
    assert "POSITIVE_ADOPTION_MOMENTUM" in types

# 15. Epistemic Safety
def test_relationship_epistemic_safety():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation dropped from 52% to 33%."),
        create_sample_item("ev_2", "CUSTOMER", "Customer feedback: onboarding setup has too many steps.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "CUSTOMER": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    for r in rels.relationships:
        assert "cause" not in r.explanation.lower() or "consistent with" in r.explanation.lower()

# 16. Signal Agent Consolidates Micro-Facts
def test_signal_agent_consolidates_evidence():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation dropped from 52% to 33%."),
        create_sample_item("ev_2", "ADOPTION", "Signup abandonment rate rose to 76%."),
        create_sample_item("ev_3", "CUSTOMER", "Customer interview: Setup takes 4 hours and fails.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "CUSTOMER": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=3, verified_count=3, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)
    
    # Check that signals consolidate multiple items rather than 1-to-1 micro items
    assert len(sig_packet.signals) >= 1
    top_sig = sig_packet.signals[0]
    assert len(top_sig.supporting_evidence_ids) >= 2

# 17. Signal Strength Calculation
def test_signal_strength_calculation():
    s1 = calculate_deterministic_signal_strength(evidence_count=4, distinct_sources_count=3, delta_percent=-40.0, has_relationship_backing=True)
    s2 = calculate_deterministic_signal_strength(evidence_count=1, distinct_sources_count=1, delta_percent=None, has_relationship_backing=False)
    assert s1 > s2
    assert 0.0 <= s1 <= 1.0
    assert 0.0 <= s2 <= 1.0

# 18. Signal Confidence Penalizes Conflicts
def test_signal_confidence_penalizes_conflicts():
    c_clean = calculate_deterministic_signal_confidence(avg_evidence_confidence=0.90, distinct_sources_count=2, has_unresolved_conflicts=False)
    c_conflicted = calculate_deterministic_signal_confidence(avg_evidence_confidence=0.90, distinct_sources_count=2, has_unresolved_conflicts=True)
    assert c_clean > c_conflicted
    assert (c_clean - c_conflicted) >= 0.20

# 19. Weak Signal Handling
def test_weak_signal_handling():
    items = [create_sample_item("ev_1", "CUSTOMER", "One customer noted minor UI color contrast preference.")]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"CUSTOMER": "LOW"},
        metrics=EvidenceMetrics(total_evidence_extracted=1, verified_count=1, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)
    assert sig_packet.signals[0].signal_type == "WEAK_SIGNAL"
    assert sig_packet.signals[0].severity in ["LOW", "HEALTHY"]

# 20. Healthy Project Signal Generation
def test_healthy_project_signal_generation():
    items = [
        create_sample_item("ev_1", "ADOPTION", "Activation increased from 52% to 71%."),
        create_sample_item("ev_2", "TECHNICAL", "Production incidents decreased by 40%.")
    ]
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_1",
        analysis_id="anl_1",
        evidence=items,
        coverage={"ADOPTION": "HIGH", "TECHNICAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=2, verified_count=2, rejected_count=0, processing_time_seconds=1.0)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_1")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)
    assert sig_packet.summary.health_score > 70.0
    assert any(s.polarity == "POSITIVE" for s in sig_packet.signals)

# 21. Insufficient Data Project
def test_insufficient_data_project():
    packet = EvidencePacket(
        organization_id="org_1",
        project_id="proj_empty",
        analysis_id="anl_1",
        evidence=[],
        coverage={"ADOPTION": "NO_EVIDENCE_FOUND"},
        metrics=EvidenceMetrics(total_evidence_extracted=0, verified_count=0, rejected_count=0, processing_time_seconds=0.1)
    )
    context = consume_evidence_packet(packet, "org_1", "proj_empty")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)
    assert len(sig_packet.signals) == 0
    assert sig_packet.summary.total_signals == 0

# 22. Hallucinated Evidence Rejection
def test_hallucinated_evidence_rejection():
    signal = SignalItemSchema(
        signal_id="sig_test",
        project_id="proj_1",
        analysis_id="anl_1",
        organization_id="org_1",
        name="Test",
        category="TECHNICAL",
        signal_type="TREND",
        polarity="NEGATIVE",
        status="EMERGING",
        summary="Test summary",
        supporting_evidence_ids=["ev_fake_999"]
    )
    valid_ids = {"ev_real_001", "ev_real_002"}
    is_valid = validate_and_ground_signal(signal, valid_ids, set())
    assert is_valid is False

# 23. Signal Packet Schema Compliance
def test_signal_packet_schema_compliance():
    sig = SignalItemSchema(
        signal_id="sig_01",
        project_id="proj_1",
        analysis_id="anl_1",
        organization_id="org_1",
        name="Pipeline Breakdown",
        category="TECHNICAL",
        signal_type="TREND",
        polarity="NEGATIVE",
        status="WORSENING",
        summary="Build failure rates increasing.",
        supporting_evidence_ids=["ev_01"]
    )
    packet = SignalPacket(
        project_id="proj_1",
        analysis_id="anl_1",
        organization_id="org_1",
        signals=[sig],
        summary=OverallSignalSummary(total_signals=1, negative_count=1, health_score=75.0)
    )
    json_data = packet.model_dump()
    reconstructed = SignalPacket(**json_data)
    assert reconstructed.project_id == "proj_1"
    assert len(reconstructed.signals) == 1

# 24. Tenant Isolation in Signals
def test_tenant_isolation_signals(db_session):
    # Create Analysis for Org A
    analysis_a = ProjectAnalysis(
        id="anl_org_a",
        organization_id="org_alpha",
        project_id="proj_alpha",
        status="COMPLETED"
    )
    sig_a = SignalItem(
        id="sig_a",
        analysis_id="anl_org_a",
        organization_id="org_alpha",
        project_id="proj_alpha",
        name="Org A Signal",
        category="TECHNICAL",
        signal_type="TREND",
        polarity="NEGATIVE",
        status="EMERGING",
        summary="Org A secret telemetry",
        supporting_evidence_ids=["ev_1"]
    )
    db_session.add(analysis_a)
    db_session.add(sig_a)
    db_session.commit()

    # Query with Org B credentials
    org_b_results = db_session.query(SignalItem).filter(
        SignalItem.organization_id == "org_beta",
        SignalItem.project_id == "proj_alpha"
    ).all()
    assert len(org_b_results) == 0

# 25. Signal Persistence and Cascade Delete
def test_signal_persistence_and_cascade_delete(db_session):
    analysis = ProjectAnalysis(
        id="anl_cascade_test",
        organization_id="org_1",
        project_id="proj_1",
        status="COMPLETED"
    )
    sig = SignalItem(
        id="sig_cascade",
        analysis_id="anl_cascade_test",
        organization_id="org_1",
        project_id="proj_1",
        name="Cascade Test Signal",
        category="ADOPTION",
        signal_type="TREND",
        polarity="NEGATIVE",
        status="EMERGING",
        summary="Testing relational cascade.",
        supporting_evidence_ids=["ev_1"]
    )
    db_session.add(analysis)
    db_session.add(sig)
    db_session.commit()

    # Verify saved
    assert db_session.query(SignalItem).filter(SignalItem.id == "sig_cascade").first() is not None

    # Delete parent analysis
    db_session.delete(analysis)
    db_session.commit()

    # Verify child signal was deleted
    assert db_session.query(SignalItem).filter(SignalItem.id == "sig_cascade").first() is None


# 26. Real Telemetry Time-Series & Risk Movement Retention
def test_signal_telemetry_and_risk_movement_retention():
    """
    Asserts that real numerical telemetry (baseline: 100, previous: 130, current: 160)
    survives from Evidence Packet -> Signal Agent -> Signal Item Schema with exact
    mathematical changes, dates, trend, unit, and metric-aware risk movements.
    """
    ev_metric = EvidenceItemSchema(
        id="ev_api_p95",
        category="TECHNICAL",
        evidence_type="METRIC",
        statement="API P95 latency increased from 100ms baseline to 160ms current.",
        fact_type="METRIC_OBSERVATION",
        metric_name="API_P95_MS",
        baseline_value=100.0,
        previous_value=130.0,
        current_value=160.0,
        unit="ms",
        direction="INCREASING",
        baseline_timestamp="2026-06-01",
        previous_timestamp="2026-08-17",
        current_timestamp="2026-08-24",
        baseline_to_current_change_percent=60.0,
        previous_to_current_change_percent=23.08,
        source=EvidenceSource(
            document_id="doc_metrics_csv",
            document_name="engineeringmetrics.csv",
            page_number=1,
            block_id="blk_001",
            content_snippet="API_P95_MS: 100 -> 130 -> 160",
            lineage={"document_name": "engineeringmetrics.csv"}
        ),
        supporting_sources=[],
        supporting_chunk_ids=["chk_001"],
        evidence_confidence=0.95,
        verification_status="VERIFIED",
        privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
    )

    packet = EvidencePacket(
        organization_id="org_test",
        project_id="proj_telemetry",
        analysis_id="anl_telemetry",
        evidence=[ev_metric],
        coverage={"TECHNICAL": "HIGH"},
        metrics=EvidenceMetrics(total_evidence_extracted=1, verified_count=1, rejected_count=0, processing_time_seconds=0.5)
    )

    context = consume_evidence_packet(packet, "org_test", "proj_telemetry")
    assert len(context.verified_evidence) == 1
    v_item = context.verified_evidence[0]
    assert v_item.baseline_value == 100.0
    assert v_item.previous_value == 130.0
    assert v_item.current_value == 160.0
    assert v_item.baseline_timestamp == "2026-06-01"
    assert v_item.current_timestamp == "2026-08-24"

    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)

    assert len(sig_packet.signals) >= 1
    metric_sig = next(s for s in sig_packet.signals if s.canonical_name == "API_P95_MS" or "API" in s.name or "Instability" in s.name)
    
    # Assert real telemetry values are preserved
    assert metric_sig.baseline_value == 100.0
    assert metric_sig.previous_value == 130.0
    assert metric_sig.current_value == 160.0
    assert metric_sig.unit == "ms"
    assert metric_sig.baseline_timestamp == "2026-06-01"
    assert metric_sig.previous_timestamp == "2026-08-17"
    assert metric_sig.current_timestamp == "2026-08-24"
    assert metric_sig.baseline_to_current_change_percent == 60.0
    assert metric_sig.previous_to_current_change_percent == 23.08
    assert metric_sig.metric_trend == "INCREASING"

    # Assert risk movement is calculated
    assert metric_sig.risk_score is not None
    assert metric_sig.previous_risk_score is not None
    assert metric_sig.risk_change_percent is not None
    assert metric_sig.risk_trend in ["INCREASING", "WORSENING", "ESCALATING", "STABLE"]
    assert metric_sig.scoring_method is not None
    assert metric_sig.explanation is not None


# 27. Qualitative Negative Test (No Fake Metric Values)
def test_qualitative_signal_no_fake_metrics():
    """
    Asserts that a purely qualitative signal (e.g. user complaint / feedback)
    does NOT receive synthetic or hallucinated metric numbers.
    """
    ev_qual = EvidenceItemSchema(
        id="ev_feedback",
        category="CUSTOMER",
        evidence_type="CUSTOMER_FEEDBACK",
        statement="Users reported confusion during the workspace invitation step.",
        fact_type="CUSTOMER_CLAIM",
        metric_name=None,
        baseline_value=None,
        previous_value=None,
        current_value=None,
        unit=None,
        direction="UNKNOWN",
        source=EvidenceSource(
            document_id="doc_interviews",
            document_name="customer_notes.md",
            page_number=2,
            block_id="blk_002",
            content_snippet="Users reported confusion during invitation step.",
            lineage={"document_name": "customer_notes.md"}
        ),
        supporting_sources=[],
        supporting_chunk_ids=["chk_002"],
        evidence_confidence=0.88,
        verification_status="VERIFIED",
        privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
    )

    packet = EvidencePacket(
        organization_id="org_test",
        project_id="proj_qual",
        analysis_id="anl_qual",
        evidence=[ev_qual],
        coverage={"CUSTOMER": "MEDIUM"},
        metrics=EvidenceMetrics(total_evidence_extracted=1, verified_count=1, rejected_count=0, processing_time_seconds=0.2)
    )

    context = consume_evidence_packet(packet, "org_test", "proj_qual")
    groups = group_verified_evidence(context)
    trends = detect_trends_from_groups(groups)
    rels = detect_evidence_relationships(groups, trends)
    sig_packet = generate_signal_packet(context, groups, trends, rels)

    assert len(sig_packet.signals) >= 1
    qual_sig = sig_packet.signals[0]
    # Assert no fake numbers
    assert qual_sig.baseline_value is None
    assert qual_sig.previous_value is None
    assert qual_sig.current_value is None
    assert qual_sig.unit is None


# 28. Database Persistence with Full Telemetry Schema
def test_signal_persistence_with_all_telemetry_fields(db_session):
    """
    Asserts that SignalItem model in PostgreSQL / SQLite stores and restores
    all telemetry and risk scoring fields.
    """
    sig = SignalItem(
        id="sig_full_telemetry",
        analysis_id="anl_1",
        organization_id="org_1",
        project_id="proj_1",
        name="API Latency Spike",
        canonical_name="API_P95_MS",
        category="TECHNICAL",
        signal_type="METRIC_ANOMALY",
        polarity="NEGATIVE",
        status="WORSENING",
        severity="HIGH",
        summary="P95 escalated by 60%.",
        metric_change="+60%",
        risk_score=75.0,
        previous_risk_score=50.0,
        baseline_risk_score=25.0,
        risk_change_percent=50.0,
        risk_trend="INCREASING",
        scoring_method="DOMAIN_ARCHETYPE",
        benchmark_target=200.0,
        benchmark_critical=500.0,
        unit="ms",
        baseline_value=100.0,
        previous_value=130.0,
        current_value=160.0,
        baseline_timestamp="2026-06-01",
        previous_timestamp="2026-08-17",
        current_timestamp="2026-08-24",
        baseline_to_current_change_percent=60.0,
        previous_to_current_change_percent=23.08,
        metric_change_percent=60.0,
        metric_trend="INCREASING",
        explanation="Latency exceeds standard SLA.",
        signal_strength=0.95,
        signal_confidence=0.90,
        historical_prevalence=80,
        supporting_evidence_ids=["ev_api_p95"],
        supporting_relationship_ids=[]
    )
    analysis = ProjectAnalysis(
        id="anl_1",
        organization_id="org_1",
        project_id="proj_1",
        status="COMPLETED"
    )
    db_session.add(analysis)
    db_session.add(sig)
    db_session.commit()

    loaded = db_session.query(SignalItem).filter(SignalItem.id == "sig_full_telemetry").first()
    assert loaded is not None
    assert loaded.canonical_name == "API_P95_MS"
    assert loaded.baseline_value == 100.0
    assert loaded.previous_value == 130.0
    assert loaded.current_value == 160.0
    assert loaded.risk_score == 75.0
    assert loaded.previous_risk_score == 50.0
    assert loaded.risk_change_percent == 50.0
    assert loaded.metric_trend == "INCREASING"
    assert loaded.unit == "ms"

