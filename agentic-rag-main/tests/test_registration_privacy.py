import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.database import SessionLocal
from app.models.project import Project

client = TestClient(app)

def test_register_private_enclave():
    headers = {
        "x-organization-id": "org_test_tenant_a",
        "x-user-id": "usr_test_1"
    }
    payload = {
        "name": "Enclave Sentinel",
        "company": "SecureCorp",
        "description": "High security private enclave",
        "industry": "FinTech",
        "stage": "Beta",
        "targetUsers": "Security Engineers",
        "expectedLaunchDate": "2026-11-01",
        "privacyLevel": "PRIVATE",
        "sourcesUploaded": ["PRODUCT_PLAN", "CUSTOMER_FEEDBACK"]
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["privacyLevel"] == "PRIVATE"
    assert data["name"] == "Enclave Sentinel"

    # IDOR Verification: Tenant B should NOT be able to access Tenant A's private project
    proj_id = data["id"]
    tenant_b_headers = {
        "x-organization-id": "org_test_tenant_b",
        "x-user-id": "usr_test_2"
    }
    resp_idor = client.get(f"/api/v1/projects/{proj_id}", headers=tenant_b_headers)
    assert resp_idor.status_code == 403


def test_register_organization_scope():
    headers = {
        "x-organization-id": "org_test_tenant_a",
        "x-user-id": "usr_test_1"
    }
    payload = {
        "name": "Org Team Portal",
        "company": "CorpOps",
        "description": "Shared organizational project",
        "industry": "DevTools",
        "stage": "Alpha",
        "targetUsers": "Internal Teams",
        "expectedLaunchDate": "2026-10-15",
        "privacyLevel": "ORGANIZATION",
        "sourcesUploaded": ["ENGINEERING_METRICS"]
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["privacyLevel"] == "ORGANIZATION"


def test_register_anonymous_learning():
    headers = {
        "x-organization-id": "org_test_tenant_a",
        "x-user-id": "usr_test_1"
    }
    payload = {
        "name": "Anonymized Fleet",
        "company": "FleetWorks",
        "description": "Anonymized research platform",
        "industry": "Enterprise SaaS",
        "stage": "Beta",
        "targetUsers": "Fleet Admins",
        "expectedLaunchDate": "2026-12-01",
        "privacyLevel": "ANONYMOUS_LEARNING",
        "sourcesUploaded": ["PRODUCT_METRICS"]
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["privacyLevel"] == "ANONYMOUS_LEARNING"


def test_register_public_case_study():
    headers = {
        "x-organization-id": "org_test_tenant_a",
        "x-user-id": "usr_test_1"
    }
    payload = {
        "name": "Public Postmortem Case",
        "company": "OpenSystems",
        "description": "Public postmortem case study",
        "industry": "AI / ML",
        "stage": "General Availability",
        "targetUsers": "Researchers",
        "expectedLaunchDate": "2026-09-01",
        "privacyLevel": "PUBLIC_CASE_STUDY",
        "sourcesUploaded": ["INCIDENT_REPORTS"]
    }
    resp = client.post("/api/v1/projects", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["privacyLevel"] == "PUBLIC_CASE_STUDY"

    # Public case study SHOULD be accessible by other tenants
    proj_id = data["id"]
    tenant_b_headers = {
        "x-organization-id": "org_test_tenant_b",
        "x-user-id": "usr_test_2"
    }
    resp_public = client.get(f"/api/v1/projects/{proj_id}", headers=tenant_b_headers)
    assert resp_public.status_code == 200
    assert resp_public.json()["id"] == proj_id


def test_get_aurora_self_heals_when_missing():
    headers = {
        "x-organization-id": "org_aurora_technologies",
        "x-user-id": "usr_aurora_lead_881",
    }
    db = SessionLocal()
    try:
        existing = db.query(Project).filter(Project.id == "aurora").first()
        if existing:
            db.delete(existing)
            db.commit()
    finally:
        db.close()

    resp = client.get("/api/v1/projects/aurora", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "aurora"
    assert data["name"] == "ExpenseTracker"


def test_validation_missing_required_fields():
    headers = {
        "x-organization-id": "org_test_tenant_a",
        "x-user-id": "usr_test_1"
    }
    # Missing name and company
    resp = client.post("/api/v1/projects", json={"description": "No name"}, headers=headers)
    assert resp.status_code == 422
