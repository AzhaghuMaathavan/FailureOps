import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.services.intelligence_provider import FixtureProvider, get_intelligence_provider
from app.services.dna_engine import calculate_failure_dna
from app.services.failure_chain_engine import generate_failure_chain_and_prediction
from app.services.intervention_engine import generate_intervention_plan
from app.services.radar_engine import synthesize_failure_radar_snapshot

client = TestClient(app)

def test_fixture_provider_schema():
    provider = FixtureProvider(fixture_version="1.0")
    result = provider.get_intelligence_result(
        project_id="test_proj_fixture",
        organization_id="org_test_fixture",
        analysis_id="anl_test_fixture"
    )

    assert result.is_simulated is True
    assert result.source == "INTELLIGENCE_FIXTURE"
    assert result.fixture_version == "1.0"

    # Evidence Validation
    ev_packet = result.evidence_packet
    assert len(ev_packet.evidence) == 5
    for item in ev_packet.evidence:
        assert item.verification_status == "VERIFIED"
        assert item.source.document_name == "FIXTURE: Engineering & Release Telemetry"
        assert any(c.startswith("fixture://") for c in item.supporting_chunk_ids)
        assert item.normalized_value is not None
        assert item.evidence_confidence >= 0.90

    # Signal Validation
    sig_packet = result.signal_packet
    assert len(sig_packet.signals) == 5
    assert sig_packet.summary.total_signals == 5
    assert sig_packet.summary.critical_count >= 1
    assert sig_packet.summary.high_count >= 3
    for sig in sig_packet.signals:
        assert sig.polarity == "NEGATIVE"
        assert len(sig.supporting_evidence_ids) >= 1


def test_fixture_downstream_real_engines():
    """
    CRITICAL: Verifies that real downstream engines consume the fixture without error
    and produce mathematically calculated Failure DNA, Causal Chains, and Radar.
    """
    provider = FixtureProvider(fixture_version="1.0")
    result = provider.get_intelligence_result(
        project_id="test_proj_e2e",
        organization_id="org_test_e2e",
        analysis_id="anl_test_e2e"
    )

    # 1. Real Failure DNA Calculation
    dna = calculate_failure_dna(
        signal_packet=result.signal_packet,
        evidence_packet=result.evidence_packet
    )
    assert dna.overall.risk_score > 0
    assert dna.overall.status in ["CRITICAL", "AT_RISK", "ELEVATED", "HEALTHY"]
    assert len(dna.dimensions) == 8

    # 2. Real Causal Chain & Prediction
    chain = generate_failure_chain_and_prediction(
        signal_packet=result.signal_packet,
        dna_packet=dna
    )
    assert len(chain.nodes) >= 2
    assert chain.prediction.predicted_failure is not None
    assert chain.prediction.confidence > 0.0

    # 3. Real Interventions
    interventions = generate_intervention_plan(
        signal_packet=result.signal_packet,
        dna_packet=dna,
        chain_packet=chain
    )
    assert len(interventions.interventions) >= 1
    assert interventions.total_potential_risk_reduction > 0

    # 4. Real Radar Snapshot
    radar = synthesize_failure_radar_snapshot(
        signal_packet=result.signal_packet,
        dna_packet=dna,
        chain_packet=chain,
        intervention_plan=interventions
    )
    assert radar.overall_project_risk == dna.overall.risk_score
    assert radar.active_signal_count == len(result.signal_packet.signals)


def test_simulate_intelligence_endpoint_success():
    headers = {
        "x-organization-id": "org_fixture_test",
        "x-user-id": "usr_fixture_1"
    }
    # Create project first
    proj_payload = {
        "name": "Fixture Integration Test Suite",
        "company": "TestCorp",
        "description": "Validating fixture execution against real backend engines",
        "industry": "DevTools",
        "stage": "Alpha",
        "expectedLaunchDate": "2026-12-01",
        "privacyLevel": "PRIVATE",
        "sourcesUploaded": ["PRODUCT_PLAN"]
    }
    proj_resp = client.post("/api/v1/projects", json=proj_payload, headers=headers)
    assert proj_resp.status_code == 200
    proj_id = proj_resp.json()["id"]

    # Call fixture test endpoint
    sim_payload = {
        "project_id": proj_id,
        "fixture_version": "1.0"
    }
    resp = client.post("/api/v1/test/intelligence/fixture", json=sim_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["is_simulated"] is True
    assert data["source"] == "INTELLIGENCE_FIXTURE"
    assert data["status"] == "COMPLETED"
    assert data["metrics"]["total_evidence_extracted"] == 5
    assert data["metrics"]["total_signals"] == 5

    # Check project-scoped simulate route
    resp_scoped = client.post(f"/api/v1/projects/{proj_id}/simulate-intelligence", headers=headers)
    assert resp_scoped.status_code == 200
    assert resp_scoped.json()["is_simulated"] is True


def test_simulate_intelligence_idor_protection():
    tenant_a_headers = {
        "x-organization-id": "org_tenant_alpha",
        "x-user-id": "usr_alpha_1"
    }
    tenant_b_headers = {
        "x-organization-id": "org_tenant_beta",
        "x-user-id": "usr_beta_1"
    }

    # Tenant A creates a private project
    proj_payload = {
        "name": "Alpha Confidential Project",
        "company": "Alpha Corp",
        "privacyLevel": "PRIVATE",
        "sourcesUploaded": ["PRODUCT_PLAN"]
    }
    proj_resp = client.post("/api/v1/projects", json=proj_payload, headers=tenant_a_headers)
    assert proj_resp.status_code == 200
    alpha_proj_id = proj_resp.json()["id"]

    # Tenant B attempts to run simulation on Tenant A's private project -> Must fail with 404 (or 403)
    sim_payload = {"project_id": alpha_proj_id}
    resp_idor = client.post("/api/v1/test/intelligence/fixture", json=sim_payload, headers=tenant_b_headers)
    assert resp_idor.status_code == 404


def test_simulate_intelligence_disabled_guard(monkeypatch):
    monkeypatch.setattr(settings, "INTELLIGENCE_FIXTURE_ENABLED", False)

    headers = {
        "x-organization-id": "org_fixture_guard",
        "x-user-id": "usr_guard_1"
    }
    sim_payload = {"project_id": "any_project"}
    resp = client.post("/api/v1/test/intelligence/fixture", json=sim_payload, headers=headers)
    assert resp.status_code == 403
    assert "disabled" in resp.json()["detail"].lower()
