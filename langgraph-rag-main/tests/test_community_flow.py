import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.db.database import Base, get_db
import app.models.community
import app.models.custom_ai

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db
client = TestClient(fastapi_app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)
    yield


def test_community_post_creation_and_privacy():
    # 1. Create a COMMUNITY post by Alice (Org A)
    headers_org_a = {
        "x-organization-id": "org_aurora_test",
        "x-user-id": "usr_alice",
        "x-user-name": "Alice Architect"
    }

    payload = {
        "post_type": "FAILURE_REPORT",
        "title": "Onboarding Friction in B2B Trial",
        "summary": "Users dropped off during mandatory SSO setup.",
        "content": "Full root-cause analysis showing 42% abandonment at workspace invite step.",
        "product_context": "Aurora Analytics",
        "failure_dimension": "ADOPTION",
        "pattern": "Onboarding Paralysis",
        "observed_failure": "42% abandonment during trial activation",
        "recovery_strategy": "Allowed deferred SSO configuration with magic link fallback",
        "verified_outcome": "Trial activation increased by 28% within 30 days",
        "tags": ["onboarding", "adoption", "b2b-saas"],
        "visibility": "COMMUNITY"
    }

    res = client.post("/api/v1/community/posts", json=payload, headers=headers_org_a)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["title"] == "Onboarding Friction in B2B Trial"
    assert data["visibility"] == "COMMUNITY"
    assert "onboarding" in data["tags"]
    post_id = data["id"]

    # 2. Org B can see COMMUNITY post
    headers_org_b = {
        "x-organization-id": "org_competitor",
        "x-user-id": "usr_bob",
        "x-user-name": "Bob Builder"
    }
    list_res = client.get("/api/v1/community/posts", headers=headers_org_b)
    assert list_res.status_code == 200
    all_posts = list_res.json()["posts"]
    assert any(p["id"] == post_id for p in all_posts)

    # 3. Add a comment
    cmt_res = client.post(
        f"/api/v1/community/posts/{post_id}/comments",
        json={"content": "Did you notice any security compliance issues with deferred SSO?"},
        headers=headers_org_b
    )
    assert cmt_res.status_code == 200
    cmt_data = cmt_res.json()
    comment_id = cmt_data["id"]

    # 4. Author (Alice) marks comment as accepted answer
    accept_res = client.post(
        f"/api/v1/community/posts/{post_id}/accept",
        json={"comment_id": comment_id},
        headers=headers_org_a
    )
    assert accept_res.status_code == 200
    assert accept_res.json()["accepted_comment_id"] == comment_id

    # 5. Helpful toggle
    vote_res = client.post(
        f"/api/v1/community/posts/{post_id}/helpful",
        json={"comment_id": None},
        headers=headers_org_b
    )
    assert vote_res.status_code == 200
    assert vote_res.json()["voted"] is True

    # 6. Verify tags endpoint
    tags_res = client.get("/api/v1/community/tags")
    assert tags_res.status_code == 200
    tags_data = tags_res.json()
    assert any(t["name"] == "onboarding" for t in tags_data)


def test_safety_scanner_blocks_secret_leak():
    headers = {
        "x-organization-id": "org_aurora_test",
        "x-user-id": "usr_alice"
    }

    # Attempt to publish public post with leaked API Key
    unsafe_payload = {
        "post_type": "DISCUSSION",
        "title": "Debug our deployment",
        "summary": "Need help debugging our LLM prompt gateway.",
        "content": "Here is our secret key: nvapi-secretkey1234567890abcdef1234567890abcdef",
        "tags": ["deployment"],
        "visibility": "COMMUNITY"
    }

    res = client.post("/api/v1/community/posts", json=unsafe_payload, headers=headers)
    assert res.status_code == 400
    assert "Security Policy" in res.json()["detail"]
