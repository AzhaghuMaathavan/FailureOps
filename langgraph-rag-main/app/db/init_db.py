import logging
from sqlalchemy import text
from app.db.database import engine, Base, SessionLocal, VECTOR_DIMENSION
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.models.chat import Conversation, Message
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.models.signal import SignalItem
from app.models.project import Project
from app.models.community import CommunityPost, CommunityComment, CommunityTag, CommunityPostTag, CommunityHelpfulVote, CommunityReport
from app.models.custom_ai import CustomAIConfig
from app.db.baseline_projects import ensure_baseline_projects

logger = logging.getLogger(__name__)


def _ensure_pgvector(conn) -> None:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    row = conn.execute(
        text("SELECT extname FROM pg_extension WHERE extname = 'vector'")
    ).fetchone()
    if not row:
        raise RuntimeError("pgvector extension is not installed in this PostgreSQL database.")


def _ensure_vector_column(conn) -> None:
    exists = conn.execute(
        text(
            """
            SELECT format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a
            JOIN pg_class c ON a.attrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE c.relname = 'chunks'
              AND n.nspname = 'public'
              AND a.attname = 'embedding'
              AND NOT a.attisdropped
            """
        )
    ).fetchone()
    if not exists:
        return
    coltype = str(exists[0])
    if "vector" in coltype:
        return
    logger.warning("[DB] chunks.embedding type is %s; converting to vector(%s)", coltype, VECTOR_DIMENSION)
    conn.execute(
        text(
            f"ALTER TABLE chunks ALTER COLUMN embedding TYPE vector({VECTOR_DIMENSION}) "
            "USING embedding::vector"
        )
    )


def _ensure_vector_index(conn) -> None:
    conn.execute(
        text(
            """
            CREATE INDEX IF NOT EXISTS chunks_embedding_cosine_idx
            ON chunks
            USING hnsw (embedding vector_cosine_ops)
            """
        )
    )


def _ensure_signal_columns(conn) -> None:
    cols = [
        ("canonical_name", "VARCHAR"),
        ("risk_score", "FLOAT"),
        ("previous_risk_score", "FLOAT"),
        ("baseline_risk_score", "FLOAT"),
        ("risk_change_percent", "FLOAT"),
        ("risk_trend", "VARCHAR"),
        ("scoring_method", "VARCHAR"),
        ("benchmark_target", "FLOAT"),
        ("benchmark_critical", "FLOAT"),
        ("unit", "VARCHAR"),
        ("baseline_value", "FLOAT"),
        ("previous_value", "FLOAT"),
        ("current_value", "FLOAT"),
        ("baseline_timestamp", "VARCHAR"),
        ("previous_timestamp", "VARCHAR"),
        ("current_timestamp", "VARCHAR"),
        ("baseline_to_current_change_percent", "FLOAT"),
        ("previous_to_current_change_percent", "FLOAT"),
        ("metric_change_percent", "FLOAT"),
        ("metric_trend", "VARCHAR"),
        ("explanation", "TEXT"),
        ("signal_data", "JSON")
    ]
    for col_name, col_type in cols:
        try:
            conn.execute(text(f"ALTER TABLE signal_items ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
        except Exception:
            pass


def init_db():
    print("Creating FailureOps X database tables...")
    if engine is None:
        raise RuntimeError("Database engine is not initialized.")

    with engine.begin() as conn:
        _ensure_pgvector(conn)

    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        _ensure_vector_column(conn)
        try:
            _ensure_vector_index(conn)
        except Exception as exc:
            logger.warning("[DB] vector index creation skipped: %s", exc)
        _ensure_signal_columns(conn)

    print("Database tables initialized successfully!")

    db = SessionLocal()
    try:
        added = ensure_baseline_projects(db)
        if added:
            print(f"Seeded {added} missing baseline project(s).")
        from app.db.community_seed import seed_demo_community_posts
        c_added = seed_demo_community_posts(db)
        if c_added:
            print(f"Seeded {c_added} baseline community failure experiences.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
