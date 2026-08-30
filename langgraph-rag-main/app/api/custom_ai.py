import uuid
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, HttpUrl, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.tenant import get_tenant_context
from app.core.security_crypto import encrypt_secret
from app.core.ssrf_guard import validate_custom_endpoint_url
from app.models.custom_ai import CustomAIConfig
from app.services.ai_provider import OpenAICompatibleCustomProvider, NvidiaRotaryProvider

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI Configuration"])


class CustomAIConfigRequest(BaseModel):
    endpoint_url: str = Field(..., description="HTTPS endpoint for OpenAI-compatible chat completions API")
    model_name: str = Field(..., description="Target model name")
    api_key: str = Field(..., description="API Key or Bearer Token")


class CustomAITestRequest(BaseModel):
    endpoint_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None


class CustomAIConfigResponse(BaseModel):
    provider: str
    is_active: bool
    endpoint_url: Optional[str] = None
    model_name: Optional[str] = None
    has_api_key: bool = False
    status: str
    latency_ms: Optional[int] = None
    last_tested_at: Optional[str] = None
    error_message: Optional[str] = None


class CustomAITestResponse(BaseModel):
    success: bool
    provider: str
    model: Optional[str] = None
    latency_ms: Optional[float] = None
    code: Optional[str] = None
    message: Optional[str] = None


@router.get("/config", response_model=CustomAIConfigResponse)
def get_ai_config(
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves current active AI provider status. Never exposes stored API key.
    """
    custom = db.query(CustomAIConfig).filter(CustomAIConfig.organization_id == org_id).first()
    if not custom or not custom.is_active:
        return CustomAIConfigResponse(
            provider="default",
            is_active=False,
            endpoint_url=None,
            model_name=None,
            has_api_key=False,
            status="NOT_CONFIGURED"
        )

    return CustomAIConfigResponse(
        provider="custom",
        is_active=custom.is_active,
        endpoint_url=custom.endpoint_url,
        model_name=custom.model_name,
        has_api_key=bool(custom.encrypted_api_key),
        status=custom.status,
        latency_ms=custom.latency_ms,
        last_tested_at=custom.last_tested_at.isoformat() if custom.last_tested_at else None,
        error_message=custom.error_message
    )


@router.post("/custom", response_model=CustomAIConfigResponse)
def save_custom_ai_config(
    payload: CustomAIConfigRequest,
    org_id: str = Depends(get_tenant_context),
    x_user_id: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Saves an external custom AI provider configuration with AES-GCM-256 encrypted secret storage.
    """
    user_id = x_user_id or "usr_admin"

    # 1. SSRF & URL Validation
    is_safe, code, msg = validate_custom_endpoint_url(payload.endpoint_url)
    if not is_safe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid or unsafe endpoint URL: {msg} ({code})"
        )

    if not payload.model_name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Model name cannot be empty.")

    if not payload.api_key.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="API key cannot be empty.")

    # 2. Encrypt API Key at Rest
    encrypted_key = encrypt_secret(payload.api_key.strip())

    # 3. Test Connection
    test_adapter = OpenAICompatibleCustomProvider(
        endpoint_url=payload.endpoint_url.strip(),
        model_name=payload.model_name.strip(),
        encrypted_api_key=encrypted_key
    )
    test_result = test_adapter.test_connection(timeout=15.0)

    is_connected = test_result.get("success", False)
    conn_status = "CONNECTED" if is_connected else "ERROR"
    latency = int(test_result.get("latency_ms", 0)) if is_connected else None
    err_msg = None if is_connected else test_result.get("message")

    # 4. Upsert Database Record
    existing = db.query(CustomAIConfig).filter(CustomAIConfig.organization_id == org_id).first()
    if existing:
        existing.endpoint_url = payload.endpoint_url.strip()
        existing.model_name = payload.model_name.strip()
        existing.encrypted_api_key = encrypted_key
        existing.is_active = True
        existing.status = conn_status
        existing.latency_ms = latency
        existing.error_message = err_msg
        existing.last_tested_at = datetime.now(timezone.utc)
        existing.user_id = user_id
    else:
        new_config = CustomAIConfig(
            id=f"cfg_ai_{uuid.uuid4().hex[:10]}",
            organization_id=org_id,
            user_id=user_id,
            endpoint_url=payload.endpoint_url.strip(),
            model_name=payload.model_name.strip(),
            encrypted_api_key=encrypted_key,
            is_active=True,
            status=conn_status,
            latency_ms=latency,
            error_message=err_msg,
            last_tested_at=datetime.now(timezone.utc)
        )
        db.add(new_config)

    db.commit()

    return CustomAIConfigResponse(
        provider="custom",
        is_active=True,
        endpoint_url=payload.endpoint_url.strip(),
        model_name=payload.model_name.strip(),
        has_api_key=True,
        status=conn_status,
        latency_ms=latency,
        last_tested_at=datetime.now(timezone.utc).isoformat(),
        error_message=err_msg
    )


@router.post("/custom/test", response_model=CustomAITestResponse)
def test_custom_ai_connection(
    payload: CustomAITestRequest,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Tests connectivity to a custom AI provider without persisting changes.
    Can test either newly supplied parameters or the existing saved configuration.
    """
    # Case A: Testing newly provided credentials in form
    if payload.endpoint_url and payload.api_key and payload.model_name:
        is_safe, code, msg = validate_custom_endpoint_url(payload.endpoint_url)
        if not is_safe:
            return CustomAITestResponse(
                success=False,
                provider="custom",
                code=code,
                message=f"SSRF Security Violation: {msg}"
            )

        encrypted_key = encrypt_secret(payload.api_key.strip())
        adapter = OpenAICompatibleCustomProvider(
            endpoint_url=payload.endpoint_url.strip(),
            model_name=payload.model_name.strip(),
            encrypted_api_key=encrypted_key
        )
        result = adapter.test_connection(timeout=15.0)
        return CustomAITestResponse(**result)

    # Case B: Testing existing saved configuration
    existing = db.query(CustomAIConfig).filter(CustomAIConfig.organization_id == org_id).first()
    if not existing or not existing.encrypted_api_key:
        return CustomAITestResponse(
            success=False,
            provider="custom",
            code="NOT_CONFIGURED",
            message="No custom AI provider is currently configured."
        )

    adapter = OpenAICompatibleCustomProvider(
        endpoint_url=existing.endpoint_url,
        model_name=existing.model_name,
        encrypted_api_key=existing.encrypted_api_key
    )
    result = adapter.test_connection(timeout=15.0)

    # Update status in DB
    existing.status = "CONNECTED" if result.get("success") else "ERROR"
    existing.latency_ms = int(result.get("latency_ms", 0)) if result.get("success") else None
    existing.last_tested_at = datetime.now(timezone.utc)
    existing.error_message = None if result.get("success") else result.get("message")
    db.commit()

    return CustomAITestResponse(**result)


@router.delete("/custom")
def delete_custom_ai_config(
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Deactivates and removes custom AI provider configuration, safely reverting to default provider.
    """
    existing = db.query(CustomAIConfig).filter(CustomAIConfig.organization_id == org_id).first()
    if existing:
        db.delete(existing)
        db.commit()

    return {"success": True, "message": "Custom AI provider removed. Reverted to default intelligence provider."}
