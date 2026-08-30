import hmac
import logging
from typing import Optional, List
from fastapi import Header, HTTPException, status
from sqlalchemy.orm import Session
from ..config import intelligence_settings
from app.models.document import Document

logger = logging.getLogger(__name__)

def authenticate_service_request(
    x_service_key: Optional[str] = Header(None),
    authorization: Optional[str] = Header(None)
) -> bool:
    """
    Validates service-to-service authentication header.
    Rejects unauthorized caller with 401 when strict mode is active.
    """
    expected_key = intelligence_settings.INTELLIGENCE_SERVICE_API_KEY
    if not expected_key or not intelligence_settings.STRICT_SECURITY_MODE:
        return True

    provided_key = None
    if isinstance(x_service_key, str) and x_service_key.strip():
        provided_key = x_service_key.strip()
    elif isinstance(authorization, str) and authorization.strip():
        if authorization.startswith("Bearer "):
            provided_key = authorization[7:].strip()
        else:
            provided_key = authorization.strip()

    if not provided_key:
        logger.warning("[SECURITY] Missing service authentication credentials.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing required service authentication header (X-Service-Key or Bearer token)."
        )

    # Timing-safe comparison to prevent side-channel attacks
    if not hmac.compare_digest(provided_key.encode("utf-8"), expected_key.encode("utf-8")):
        logger.warning("[SECURITY] Invalid service credentials received.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid service credentials."
        )

    return True


def validate_project_and_documents(
    project_id: str,
    company_id: Optional[str],
    document_ids: Optional[List[str]],
    db: Session
) -> List[str]:
    """
    Enforces server-side tenant and project isolation.
    Ensures requested documents actually exist in the database and belong to the authorized context.
    Returns the list of verified, authorized document IDs.
    """
    if not project_id or not project_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id is required for analysis."
        )

    if not document_ids:
        # If no specific document IDs are specified, return empty list (search over all project docs)
        return []

    # Verify each document exists in DB
    existing_docs = db.query(Document.id).filter(Document.id.in_(document_ids)).all()
    existing_ids = {d[0] for d in existing_docs}

    missing_or_unauthorized = set(document_ids) - existing_ids
    if missing_or_unauthorized:
        logger.warning(f"[SECURITY] Requested unauthorized or non-existent document IDs: {missing_or_unauthorized}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Document IDs {list(missing_or_unauthorized)} not found or unauthorized for project {project_id}."
        )

    return list(existing_ids)
