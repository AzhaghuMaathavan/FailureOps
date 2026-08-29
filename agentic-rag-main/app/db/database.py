import time
import logging
from urllib.parse import urlparse, urlunparse

from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from fastapi import HTTPException
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

engine = None
SessionLocal = None
VECTOR_DIMENSION = 2048


def redact_database_url(url: str) -> str:
    try:
        parsed = urlparse(url)
        if not parsed.password:
            return url
        host = parsed.hostname or ""
        netloc = f"{parsed.username}:***@{host}"
        if parsed.port:
            netloc += f":{parsed.port}"
        return urlunparse((parsed.scheme, netloc, parsed.path, "", "", ""))
    except Exception:
        return "<redacted>"


def init_engine(retries: int = 15, delay_seconds: float = 2.0):
    global engine, SessionLocal
    url = (settings.DATABASE_URL or "").strip()
    if not url:
        raise RuntimeError("DATABASE_URL is not configured. PostgreSQL + pgvector is required.")
    if url.startswith("sqlite"):
        raise RuntimeError(
            "SQLite is not supported for the FailureOps foundation. "
            "Set DATABASE_URL to PostgreSQL with pgvector."
        )

    last_error = None
    for attempt in range(1, retries + 1):
        try:
            test_engine = create_engine(
                url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 5},
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logger.info("[DB] Connected to PostgreSQL: %s", redact_database_url(url))
            return
        except Exception as exc:
            last_error = exc
            logger.warning(
                "[DB] PostgreSQL unavailable (attempt %s/%s): %s",
                attempt,
                retries,
                exc,
            )
            time.sleep(delay_seconds)

    raise RuntimeError(f"Could not connect to PostgreSQL at {redact_database_url(url)}: {last_error}")


init_engine()


def get_db():
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database connection is not initialized.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
