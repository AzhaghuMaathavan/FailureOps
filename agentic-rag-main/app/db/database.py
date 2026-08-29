import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

logger = logging.getLogger(__name__)

Base = declarative_base()

# Setup database engine with graceful fallback
engine = None
SessionLocal = None

def init_engine():
    global engine, SessionLocal
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    storage_dir = os.path.join(root_dir, "storage")
    os.makedirs(storage_dir, exist_ok=True)
    sqlite_fallback_url = f"sqlite:///{os.path.join(storage_dir, 'failureops.db')}"

    # 1. Try configured DATABASE_URL (e.g. PostgreSQL)
    if settings.DATABASE_URL and not settings.DATABASE_URL.startswith("sqlite"):
        try:
            test_engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 2}
            )
            with test_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine = test_engine
            SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
            logger.info(f"[DB] Connected to primary database: {settings.DATABASE_URL}")
            return
        except Exception as e:
            logger.warning(f"[DB] PostgreSQL unavailable ({e}). Falling back to SQLite local storage.")

    # 2. SQLite local fallback
    try:
        engine = create_engine(
            sqlite_fallback_url,
            connect_args={"check_same_thread": False}
        )
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info(f"[DB] Initialized local SQLite database at: {sqlite_fallback_url}")
    except Exception as e:
        logger.error(f"[DB] Failed to initialize database: {e}")

init_engine()


def get_db():
    if not SessionLocal:
        raise RuntimeError("Database connection is not initialized.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

