import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.db.database import get_db, VECTOR_DIMENSION
from app.core.config import settings
from app.core.object_storage import storage_health

logger = logging.getLogger(__name__)
router = APIRouter()


def probe_database(db: Session) -> dict:
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        logger.error("[HEALTH] database ping failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "disconnected", "error": str(exc)},
        ) from exc

    ext = db.execute(text("SELECT extname FROM pg_extension WHERE extname = 'vector'")).fetchone()
    if not ext:
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "connected", "pgvector": False, "error": "pgvector extension missing"},
        )

    try:
        db.execute(text("SELECT '[1,2,3]'::vector <-> '[1,2,4]'::vector"))
    except Exception as exc:
        logger.error("[HEALTH] pgvector operator failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail={"status": "error", "database": "connected", "pgvector": False, "error": str(exc)},
        ) from exc

    return {
        "status": "ok",
        "database": "connected",
        "pgvector": True,
        "vector_dimension": VECTOR_DIMENSION,
    }


@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_probe = {"status": "error", "database": "disconnected"}
    try:
        db_probe = probe_database(db)
    except HTTPException as exc:
        db_probe = exc.detail if isinstance(exc.detail, dict) else {"status": "error", "database": "disconnected"}

    rustfs = storage_health()
    embed_configured = bool(settings.get_api_key("EMBED") or settings.NVIDIA_API_KEY)
    llm_configured = bool(settings.get_api_key("LLM") or settings.NVIDIA_API_KEY)
    parse_configured = bool(settings.get_api_key("PARSE") or settings.NVIDIA_API_KEY)
    db_ok = db_probe.get("database") == "connected"

    return {
        "status": "ok" if db_ok else "degraded",
        "service": "FailureOps X RAG",
        "database": db_probe.get("database"),
        "vector_store": db_ok,
        "pgvector": db_probe.get("pgvector", False),
        "vector_dimension": VECTOR_DIMENSION,
        "rustfs": {
            "provider": rustfs.get("provider"),
            "reachable": rustfs.get("reachable"),
            "bucket": rustfs.get("bucket"),
            "endpoint_configured": rustfs.get("endpoint_configured"),
            "error": rustfs.get("error"),
        },
        "embedding_provider_configured": embed_configured,
        "llm_provider_configured": llm_configured,
        "parse_provider_configured": parse_configured,
    }


@router.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    return probe_database(db)
