from typing import Optional
from fastapi import Header
from app.core.config import settings


def get_tenant_context(
    x_organization_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> str:
    """
    Derives authenticated organization identity from server-side headers.
    Defaults to configured default organization if not supplied.
    """
    return x_organization_id or settings.DEFAULT_ORGANIZATION_ID
