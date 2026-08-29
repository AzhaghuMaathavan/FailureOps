import pytest
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.evidence_packet import EvidencePacket, EvidenceMetrics
from app.schemas.failure_dna import FailureDNAPacket
from app.schemas.failure_chain import FailureChainPacket
from app.schemas.historical_memory import HistoricalCase, HistoricalMemoryPacket
from app.schemas.simulation import SimulationComparisonPacket

from app.services.dna_engine import calculate_failure_dna
from app.services.failure_chain_engine import generate_failure_chain_and_prediction
from app.services.memory_engine import search_historical_failure_cases, BENCHMARK_HISTORICAL_CASES
from app.services.simulation_engine import run_what_if_simulations

@pytest.fixture
def sample_risky_signal_packet():
    return SignalPacket(
        project_id="proj_aurora",
        analysis_id="anl_aurora_01",
        organization_id="org_demo",
        signals=[
            SignalItemSchema(
                signal_id="sig_act_01",
                project_id="proj_aurora",
                analysis_id="anl_aurora_01",
                organization_id="org_demo",
                name="Activation Velocity Decline",
                category="ADOPTION",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="CRITICAL",
                summary="User activation rate dropped from 52% to 33%",
                metric_change="52% -> 33%",
                signal_strength=0.92,
                signal_confidence=0.95,
                historical_prevalence=74,
                supporting_evidence_ids=["ev_101", "ev_102"]
            ),
            SignalItemSchema(
                signal_id="sig_ci_02",
                project_id="proj_aurora",
                analysis_id="anl_aurora_01",
                organization_id="org_demo",
                name="CI Pipeline Build Failure Surge",
                category="TECHNICAL",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="CRITICAL",
                summary="CI build failure rate surged from 5% to 34%",
                metric_change="5% -> 34%",
                signal_strength=0.88,
                signal_confidence=0.92,
                historical_prevalence=81,
                supporting_evidence_ids=["ev_201"]
            ),
            SignalItemSchema(
                signal_id="sig_ot_03",
                project_id="proj_aurora",
                analysis_id="anl_aurora_01",
                organization_id="org_demo",
                name="Engineering Overtime & Review Drag",
                category="OPERATIONAL",
                signal_type="CORRELATION",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="HIGH",
                summary="Team averaged 58 hours/week with 3.4 days PR review latency",
                metric_change="3.4 days latency",
                signal_strength=0.78,
                signal_confidence=0.89,
                historical_prevalence=67,
                supporting_evidence_ids=["ev_301"]
            )
        ]
    )

@pytest.fixture
def sample_healthy_signal_packet():
    return SignalPacket(
        project_id="proj_healthy",
        analysis_id="anl_h01",
        organization_id="org_demo",
        signals=[
            SignalItemSchema(
                signal_id="sig_growth",
                project_id="proj_healthy",
                analysis_id="anl_h01",
                organization_id="org_demo",
                name="Sustained Conversion Growth",
                category="ADOPTION",
                signal_type="TREND",
                polarity="POSITIVE",
                status="IMPROVING",
                severity="HEALTHY",
                summary="Conversion increased from 3% to 7%",
                metric_change="+4%",
                signal_strength=0.85,
                signal_confidence=0.94,
                historical_prevalence=90,
                supporting_evidence_ids=["ev_h1"]
            ),
            SignalItemSchema(
                signal_id="sig_rel",
                project_id="proj_healthy",
                analysis_id="anl_h01",
                organization_id="org_demo",
                name="Zero Outage Uptime",
                category="TECHNICAL",
                signal_type="TREND",
                polarity="POSITIVE",
                status="IMPROVING",
                severity="HEALTHY",
                summary="99.99% availability sustained",
                metric_change="99.99%",
                signal_strength=0.90,
                signal_confidence=0.96,
                historical_prevalence=95,
                supporting_evidence_ids=["ev_h2"]
            )
        ]
    )

# -------------------------------------------------------------
# FEATURE 4 TESTS: FAILURE DNA & PROJECT HEALTH
# -------------------------------------------------------------
def test_failure_dna_calculation_risky(sample_risky_signal_packet):
    dna = calculate_failure_dna(sample_risky_signal_packet)
    assert dna.overall.status in ["ELEVATED", "CRITICAL"]
    assert dna.overall.trend == "DETERIORATING"
    assert dna.overall.risk_score >= 60

    # Adoption & Technical must have measured high risk
    ad_dim = next(d for d in dna.dimensions if d.dimension == "Adoption")
    assert ad_dim.status == "MEASURED"
    assert ad_dim.risk_score >= 60
    assert "ev_101" in ad_dim.evidence_ids

    # Financial must strictly be NO_EVIDENCE (None, not 0 or 50)
    fin_dim = next(d for d in dna.dimensions if d.dimension == "Financial")
    assert fin_dim.status == "NO_EVIDENCE"
    assert fin_dim.risk_score is None
    assert fin_dim.severity == "NO_EVIDENCE"

def test_failure_dna_calculation_healthy(sample_healthy_signal_packet):
    dna = calculate_failure_dna(sample_healthy_signal_packet)
    assert dna.overall.status == "HEALTHY"
    assert dna.overall.trend == "IMPROVING"
    assert dna.overall.risk_score <= 35

def test_failure_dna_insufficient_evidence():
    empty_packet = SignalPacket(project_id="p1", analysis_id="a1", organization_id="o1", signals=[])
    dna = calculate_failure_dna(empty_packet)
    assert dna.overall.status == "INSUFFICIENT_EVIDENCE"
    assert dna.overall.trend == "UNKNOWN"

# -------------------------------------------------------------
# FEATURE 1 TESTS: FAILURE CHAIN & PREDICTION
# -------------------------------------------------------------
def test_failure_chain_generation_risky(sample_risky_signal_packet):
    dna = calculate_failure_dna(sample_risky_signal_packet)
    chain = generate_failure_chain_and_prediction(sample_risky_signal_packet, dna)
    
    assert chain.prediction.status in ["ACTIVE", "IMMINENT"]
    assert chain.prediction.risk_score >= 65
    assert len(chain.nodes) >= 4
    assert len(chain.edges) >= 3

    # Check node types
    node_types = {n.type for n in chain.nodes}
    assert "SIGNAL" in node_types
    assert "PATTERN" in node_types
    assert "CONSEQUENCE" in node_types
    assert "PREDICTED_FAILURE" in node_types

    # Ensure evidence IDs are preserved
    assert "ev_101" in chain.prediction.supporting_evidence_ids

def test_failure_chain_healthy(sample_healthy_signal_packet):
    dna = calculate_failure_dna(sample_healthy_signal_packet)
    chain = generate_failure_chain_and_prediction(sample_healthy_signal_packet, dna)
    assert chain.prediction.status == "HEALTHY"
    assert chain.prediction.risk_score <= 30

# -------------------------------------------------------------
# FEATURE 2 TESTS: HISTORICAL FAILURE MEMORY
# -------------------------------------------------------------
def test_historical_memory_matching(sample_risky_signal_packet):
    dna = calculate_failure_dna(sample_risky_signal_packet)
    memory = search_historical_failure_cases(
        project_id="proj_aurora",
        organization_id="org_demo",
        signal_packet=sample_risky_signal_packet,
        dna_packet=dna
    )
    assert memory.total_matches >= 3
    assert len(memory.matched_cases) >= 3
    top_case = memory.matched_cases[0]
    assert top_case.similarity >= 80
    assert top_case.intervention is not None
    assert top_case.outcome is not None
    assert top_case.visibility in ["GLOBAL_ANONYMIZED", "ORGANIZATION", "PRIVATE"]

def test_historical_memory_privacy_isolation(sample_risky_signal_packet):
    # Add a mock private case to repo for test
    test_case = HistoricalCase(
        id="case_private_test",
        name="Confidential Project",
        company_alias="Secret Corp",
        industry="SaaS",
        pattern="TECHNICAL_PIPELINE_COLLAPSE",
        signals=["ci_failures_increasing"],
        failure="Private disaster",
        intervention="Private fix",
        outcome="Resolved",
        similarity=99,
        visibility="PRIVATE",
        organization_id="org_other_tenant",
        source_project_id="proj_other_secret"
    )
    BENCHMARK_HISTORICAL_CASES.append(test_case)

    # Search as org_demo -> test_case MUST NOT be returned
    memory = search_historical_failure_cases(
        project_id="proj_aurora",
        organization_id="org_demo",
        signal_packet=sample_risky_signal_packet,
        caller_org_id="org_demo"
    )
    matched_ids = [c.id for c in memory.matched_cases]
    assert "case_private_test" not in matched_ids

    # Clean up
    BENCHMARK_HISTORICAL_CASES.remove(test_case)

# -------------------------------------------------------------
# FEATURE 3 TESTS: WHAT-IF FAILURE SIMULATION
# -------------------------------------------------------------
def test_what_if_simulations(sample_risky_signal_packet):
    dna = calculate_failure_dna(sample_risky_signal_packet)
    sims = run_what_if_simulations(
        project_id="proj_aurora",
        organization_id="org_demo",
        signal_packet=sample_risky_signal_packet,
        dna_packet=dna
    )
    assert len(sims.scenarios) == 4
    
    # 1. Do Nothing scenario should increase risk
    do_nothing = next(s for s in sims.scenarios if s.scenario_id == "do_nothing")
    assert do_nothing.risk_change > 0
    assert do_nothing.simulated_risk > do_nothing.baseline_risk

    # 2. Interventions should reduce risk
    simplify_onb = next(s for s in sims.scenarios if s.scenario_id == "simplify_onboarding")
    assert simplify_onb.risk_change < 0
    assert simplify_onb.simulated_risk < simplify_onb.baseline_risk
    assert len(simplify_onb.propagation_steps) >= 3

    # 3. Recommended scenario should be identified
    assert sims.recommended_scenario is not None
