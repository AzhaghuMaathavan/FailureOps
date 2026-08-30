import pytest
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket, DimensionRisk, OverallProjectHealth
from app.schemas.failure_chain import FailureChainPacket, FailurePrediction, ChainNode, ChainEdge
from app.schemas.historical_memory import HistoricalMemoryPacket, HistoricalCase
from app.schemas.simulation import SimulationComparisonPacket, ScenarioResult

from app.schemas.intervention import InterventionPlanPacket, InterventionItem, PriorityCalculationBreakdown
from app.schemas.experiment import ExperimentListPacket, ExperimentItem, ExperimentTargetMetric
from app.schemas.outcome import OutcomeVerificationPacket, ExperimentOutcomeReport
from app.schemas.org_memory import OrganizationalMemoryPacket, OrganizationalMemoryItem
from app.schemas.radar import RadarExecutiveSnapshotPacket

from app.services.intervention_engine import calculate_deterministic_priority_score, generate_intervention_plan
from app.services.experiment_engine import create_experiment_from_intervention, generate_initial_experiments_from_plan
from app.services.outcome_engine import verify_experiment_outcome, verify_all_project_experiments
from app.services.org_memory_engine import convert_outcome_to_memory, query_organizational_memory, BENCHMARK_ORGANIZATIONAL_MEMORIES
from app.services.radar_engine import synthesize_failure_radar_snapshot

@pytest.fixture
def sample_member_3_context():
    sig_1 = SignalItemSchema(
        signal_id="sig_ci_101", project_id="proj_aurora", analysis_id="anl_aurora_01", organization_id="org_aurora",
        name="CI Failures Spiking", category="TECHNICAL", signal_type="TREND", polarity="NEGATIVE",
        status="WORSENING", severity="CRITICAL", summary="Build failure rate surged to 34%",
        signal_strength=0.92, signal_confidence=0.94, supporting_evidence_ids=["ev_ci_101"]
    )
    sig_2 = SignalItemSchema(
        signal_id="sig_ad_102", project_id="proj_aurora", analysis_id="anl_aurora_01", organization_id="org_aurora",
        name="Activation Drop", category="ADOPTION", signal_type="TREND", polarity="NEGATIVE",
        status="WORSENING", severity="CRITICAL", summary="User activation collapsed from 52% to 33%",
        signal_strength=0.88, signal_confidence=0.90, supporting_evidence_ids=["ev_ad_102"]
    )
    sig_packet = SignalPacket(
        project_id="proj_aurora", analysis_id="anl_aurora_01", organization_id="org_aurora",
        signals=[sig_1, sig_2]
    )

    dna = FailureDNAPacket(
        project_id="proj_aurora", analysis_id="anl_aurora_01", organization_id="org_aurora",
        overall=OverallProjectHealth(risk_score=78, status="CRITICAL", trend="DETERIORATING"),
        dimensions=[
            DimensionRisk(dimension="Technical", risk_score=82, status="CRITICAL", confidence=0.94, evidence_ids=["ev_ci_101"]),
            DimensionRisk(dimension="Adoption", risk_score=85, status="CRITICAL", confidence=0.90, evidence_ids=["ev_ad_102"]),
            DimensionRisk(dimension="Financial", risk_score=None, status="NO_EVIDENCE", confidence=0.0)
        ]
    )

    chain = FailureChainPacket(
        project_id="proj_aurora", analysis_id="anl_aurora_01", organization_id="org_aurora",
        nodes=[ChainNode(id="n1", label="CI Spikes", type="SIGNAL", severity="CRITICAL")],
        edges=[ChainEdge(source="n1", target="n2", relationship="AMPLIFIES", weight=0.9)],
        prediction=FailurePrediction(
            predicted_failure="Missed Release Milestone",
            status="IMMINENT",
            risk_score=85,
            confidence=0.91,
            time_horizon_days=21,
            corroborating_signals=["sig_ci_101"],
            explanation="Unresolved build instability leads to missed milestone"
        ),
        explanation="Trajectory consistent with technical reliability collapse."
    )

    return sig_packet, dna, chain

def test_intervention_prioritization_and_formula():
    breakdown = calculate_deterministic_priority_score(
        risk_severity=85.0,
        prediction_confidence=0.90,
        chain_impact=0.88,
        expected_risk_reduction=25.0,
        effort="MEDIUM"
    )
    assert 10 <= breakdown.calculated_score <= 99
    assert breakdown.effort_weight == 1.35
    assert "severity" in breakdown.formula_explanation

def test_intervention_plan_generation(sample_member_3_context):
    sig_packet, dna, chain = sample_member_3_context
    plan = generate_intervention_plan(sig_packet, dna, chain)

    assert len(plan.interventions) >= 2
    assert plan.interventions[0].priority_score >= plan.interventions[1].priority_score
    assert plan.interventions[0].epistemic_level == "RECOMMENDED"
    assert len(plan.interventions[0].evidence_ids) >= 1
    assert len(plan.interventions[0].action_steps) >= 2

def test_experiment_engine_immutable_baseline(sample_member_3_context):
    sig_packet, dna, chain = sample_member_3_context
    plan = generate_intervention_plan(sig_packet, dna, chain)
    top = plan.interventions[0]
    exp = create_experiment_from_intervention(
        top, "proj_aurora", "org_aurora",
        baseline_metrics={
            "ci_failure_rate": 34.0,
            "defect_backlog": 42.0,
            "signup_abandonment": 76.0,
            "activation_rate": 33.0,
            "weekly_overtime_hours": 18.0,
            "pr_review_latency_days": 3.4,
        },
    )
    assert exp.status == "DRAFT"
    assert exp.baseline_snapshot.is_immutable is True
    assert len(exp.target_metrics) >= 1
    assert len(exp.success_criteria) >= 1

def test_outcome_verification_metric_polarity():
    int_item = InterventionItem(
        intervention_id="int_1", project_id="p1", analysis_id="a1", organization_id="o1",
        title="Stabilize CI", problem_addressed="CI failures", target_dimension="Technical",
        expected_effect="Drop failures", rationale="CI stabilization is high impact",
        priority_breakdown=PriorityCalculationBreakdown(
            risk_severity=80, prediction_confidence=0.9, chain_impact=0.9,
            expected_risk_reduction=20, effort_weight=1.0, calculated_score=85
        )
    )
    exp = create_experiment_from_intervention(
        int_item, "p1", "o1",
        baseline_metrics={"ci_failure_rate": 34.0, "defect_backlog": 42.0},
    )
    for tm in exp.target_metrics:
        if tm.metric_name == "ci_failure_rate":
            tm.target_value = 12.0
        if tm.metric_name == "defect_backlog":
            tm.target_value = 20.0

    report = verify_experiment_outcome(
        experiment=exp,
        measured_metrics={"ci_failure_rate": 12.0, "defect_backlog": 15.0},
        has_concurrent_unrelated_changes=False
    )
    assert report.status == "SUCCESS"
    assert report.attribution_confidence == "HIGH"
    ci_delta = next(d for d in report.metric_deltas if d.metric_name == "ci_failure_rate")
    assert ci_delta.is_improved is True
    assert ci_delta.percent_improvement > 50.0

def test_outcome_attribution_safety():
    int_item = InterventionItem(
        intervention_id="int_1", project_id="p1", analysis_id="a1", organization_id="o1",
        title="Stabilize CI", problem_addressed="CI failures", target_dimension="Technical",
        expected_effect="Drop failures", rationale="CI stabilization is high impact",
        priority_breakdown=PriorityCalculationBreakdown(
            risk_severity=80, prediction_confidence=0.9, chain_impact=0.9,
            expected_risk_reduction=20, effort_weight=1.0, calculated_score=85
        )
    )
    exp = create_experiment_from_intervention(
        int_item, "p1", "o1",
        baseline_metrics={"ci_failure_rate": 34.0},
    )

    report = verify_experiment_outcome(
        experiment=exp,
        measured_metrics={"ci_failure_rate": 12.0},
        has_concurrent_unrelated_changes=True
    )
    assert report.attribution_confidence == "LOW"
    assert "concurrent" in report.attribution_reasoning.lower()

def test_organizational_memory_closed_loop(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "DEMO_MODE", True)
    memories = query_organizational_memory(organization_id="org_aurora", caller_org_id="org_aurora")
    assert memories.total_memories >= 3
    assert all(m.is_synthetic_demo for m in memories.memories if m.visibility == "GLOBAL_ANONYMIZED")


def test_organizational_memory_empty_without_demo(monkeypatch):
    from app.core.config import settings
    monkeypatch.setattr(settings, "DEMO_MODE", False)
    memories = query_organizational_memory(organization_id="org_aurora", caller_org_id="org_aurora")
    assert memories.total_memories == 0
    assert memories.memories == []

def test_failure_radar_snapshot_aggregation(sample_member_3_context):
    sig_packet, dna, chain = sample_member_3_context
    plan = generate_intervention_plan(sig_packet, dna, chain)
    exp_list = generate_initial_experiments_from_plan(plan)
    radar = synthesize_failure_radar_snapshot(sig_packet, dna, chain, plan, exp_list)

    assert radar.overall_risk_score == 78
    assert radar.overall_health == "CRITICAL"
    assert len(radar.top_failure_risks) >= 2
    assert radar.primary_action_priority >= 75
    assert len(radar.risk_trajectory_history) >= 1
