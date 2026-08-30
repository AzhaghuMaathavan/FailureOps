import pytest
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.core.security_crypto import encrypt_secret, decrypt_secret, mask_secret
from app.core.ssrf_guard import validate_custom_endpoint_url
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


def test_aes_gcm_secret_encryption():
    secret = "sk-super-secret-production-ai-token-123456"
    encrypted = encrypt_secret(secret)
    assert encrypted != secret
    assert len(encrypted) > 20

    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret

    masked = mask_secret(secret)
    assert masked == "••••••••••••3456"
    assert "super-secret" not in masked


def test_ssrf_guard_blocks_internal_and_metadata_ips():
    # 1. Localhost / Loopback
    is_safe, code, msg = validate_custom_endpoint_url("http://127.0.0.1:8000/v1")
    assert not is_safe
    assert code in ("INSECURE_SCHEME", "RESTRICTED_IP", "RESTRICTED_HOST")

    # 2. Cloud metadata service
    is_safe, code, msg = validate_custom_endpoint_url("https://169.254.169.254/latest/meta-data")
    assert not is_safe
    assert code in ("RESTRICTED_IP", "RESTRICTED_HOST")

    # 3. Private RFC 1918 subnets
    is_safe, code, msg = validate_custom_endpoint_url("https://10.0.0.5:8080/v1/chat")
    assert not is_safe
    assert code in ("RESTRICTED_IP", "RESTRICTED_HOST")

    is_safe, code, msg = validate_custom_endpoint_url("https://192.168.1.100/v1")
    assert not is_safe
    assert code in ("RESTRICTED_IP", "RESTRICTED_HOST")

    # 4. Valid external HTTPS URL with mock DNS resolution
    with patch("socket.getaddrinfo", return_value=[(2, 1, 6, "", ("93.184.216.34", 443))]):
        is_safe, code, msg = validate_custom_endpoint_url("https://api.external-ai.com/v1/chat/completions")
        assert is_safe
        assert code is None


def test_custom_ai_config_never_exposes_secret_key():
    headers = {
        "x-organization-id": "org_secure_corp",
        "x-user-id": "usr_sec_lead"
    }

    # SSRF test payload fails safely without leaking anything
    res = client.post(
        "/api/v1/ai/custom",
        json={
            "endpoint_url": "http://127.0.0.1:8000/v1",
            "model_name": "llama-3.3-70b",
            "api_key": "sk-unauthorized-key-attempt"
        },
        headers=headers
    )
    assert res.status_code == 400
    assert "Invalid or unsafe endpoint URL" in res.json()["detail"]

    # Check GET /config
    get_res = client.get("/api/v1/ai/config", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert "api_key" not in data
    assert "encrypted_api_key" not in data
    assert data["provider"] == "default"
