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


def migrate_schema(target_engine):
    """
    Safely executes non-destructive ALTER TABLE ... ADD COLUMN IF NOT EXISTS statements
    to ensure database tables stay in sync with latest models on startup.
    """
    if not target_engine or "sqlite" in str(target_engine.url):
        return

    migrations = [
        ("signal_items", "canonical_name", "VARCHAR"),
        ("signal_items", "baseline_value", "DOUBLE PRECISION"),
        ("signal_items", "previous_value", "DOUBLE PRECISION"),
        ("signal_items", "current_value", "DOUBLE PRECISION"),
        ("signal_items", "baseline_timestamp", "VARCHAR"),
        ("signal_items", "previous_timestamp", "VARCHAR"),
        ("signal_items", '"current_timestamp"', "VARCHAR"),
        ("signal_items", "baseline_to_current_change_percent", "DOUBLE PRECISION"),
        ("signal_items", "previous_to_current_change_percent", "DOUBLE PRECISION"),
        ("signal_items", "metric_change_percent", "DOUBLE PRECISION"),
        ("signal_items", "metric_trend", "VARCHAR"),
        ("signal_items", "risk_score", "DOUBLE PRECISION"),
        ("signal_items", "previous_risk_score", "DOUBLE PRECISION"),
        ("signal_items", "baseline_risk_score", "DOUBLE PRECISION"),
        ("signal_items", "risk_change_percent", "DOUBLE PRECISION"),
        ("signal_items", "risk_trend", "VARCHAR"),
        ("signal_items", "scoring_method", "VARCHAR"),
        ("signal_items", "benchmark_target", "DOUBLE PRECISION"),
        ("signal_items", "benchmark_critical", "DOUBLE PRECISION"),
        ("signal_items", "unit", "VARCHAR"),
        ("signal_items", "explanation", "TEXT"),
        ("signal_items", "metric_change", "VARCHAR"),
        ("signal_items", "signal_strength", "DOUBLE PRECISION DEFAULT 0.85"),
        ("signal_items", "signal_confidence", "DOUBLE PRECISION DEFAULT 0.90"),
        ("signal_items", "historical_prevalence", "INTEGER DEFAULT 85"),
        ("signal_items", "supporting_evidence_ids", "JSONB DEFAULT '[]'::jsonb"),
        ("signal_items", "supporting_relationship_ids", "JSONB DEFAULT '[]'::jsonb"),
        ("signal_items", "signal_data", "JSONB DEFAULT '{}'::jsonb"),
        ("evidence_items", "normalized_value", "JSONB"),
        ("evidence_items", "time_period", "JSONB"),
        ("evidence_items", "source_lineage", "JSONB DEFAULT '[]'::jsonb"),
        ("evidence_items", "supporting_sources", "JSONB DEFAULT '[]'::jsonb"),
        ("evidence_items", "supporting_chunk_ids", "JSONB DEFAULT '[]'::jsonb"),
        ("evidence_items", "evidence_confidence", "DOUBLE PRECISION DEFAULT 0.90"),
        ("evidence_items", "verification_status", "VARCHAR DEFAULT 'VERIFIED'"),
        ("evidence_items", "visibility", "VARCHAR DEFAULT 'PRIVATE'"),
        ("evidence_items", "global_learning_allowed", "BOOLEAN DEFAULT FALSE"),
        ("documents", "file_size", "BIGINT DEFAULT 0"),
        ("documents", "page_count", "INTEGER DEFAULT 0"),
        ("documents", "chunk_count", "INTEGER DEFAULT 0"),
        ("documents", "embedded_count", "INTEGER DEFAULT 0"),
        ("documents", "storage_provider", "VARCHAR DEFAULT 'rustfs'"),
        ("documents", "storage_path", "VARCHAR"),
        ("documents", "storage_bucket", "VARCHAR DEFAULT 'failureops-documents'"),
        ("documents", "extracted_metadata", "JSONB DEFAULT '{}'::jsonb"),
        ("documents", "error_message", "TEXT"),
        ("chunks", "embedding_status", "VARCHAR DEFAULT 'PENDING'"),
        ("chunks", "embedding_model", "VARCHAR"),
        ("chunks", "embedding_error", "TEXT"),
        ("chunks", "is_table", "BOOLEAN DEFAULT FALSE"),
        ("chunks", "lineage", "JSONB DEFAULT '{}'::jsonb"),
        ("chunks", "headers", "JSONB DEFAULT '{}'::jsonb"),
        ("chunks", "previous_chunk_id", "VARCHAR"),
        ("chunks", "next_chunk_id", "VARCHAR"),
    ]

    for table_name, col_name, col_type in migrations:
        try:
            with target_engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type};"))
                conn.commit()
        except Exception:
            pass


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

    for attempt in range(1, retries + 1):
        try:
            test_engine = create_engine(
                url,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3},
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            migrate_schema(engine)
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
            if attempt < retries:
                time.sleep(delay_seconds)

    logger.error(f"Could not connect to PostgreSQL at {redact_database_url(url)}: {last_error}")
    test_fallback = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_fallback)


init_engine(retries=2, delay_seconds=0.5)


def get_db():
    if not SessionLocal:
        raise HTTPException(status_code=503, detail="Database connection is not initialized.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

