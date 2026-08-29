from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db
from app.core.config import settings
from app.core.object_storage import storage_health

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"disconnected: {e}"

    rustfs = storage_health()
    embed_configured = bool(settings.get_api_key("EMBED") or settings.NVIDIA_API_KEY)
    llm_configured = bool(settings.get_api_key("LLM") or settings.NVIDIA_API_KEY)
    parse_configured = bool(settings.get_api_key("PARSE") or settings.NVIDIA_API_KEY)

    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "service": "FailureOps X RAG",
        "database": db_status,
        "vector_store": db_status,
        "rustfs": {
            "provider": rustfs.get("provider"),
            "reachable": rustfs.get("reachable"),
            "bucket": rustfs.get("bucket"),
            "endpoint_configured": rustfs.get("endpoint_configured"),
        },
        "embedding_provider_configured": embed_configured,
        "llm_provider_configured": llm_configured,
        "parse_provider_configured": parse_configured,
    }
