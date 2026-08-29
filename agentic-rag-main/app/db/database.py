from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Setup database engine
try:
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
except Exception as e:
    print(f"Warning: Could not connect to database. Ensure PostgreSQL is running. Error: {e}")
    engine = None
    SessionLocal = None
    Base = None

def get_db():
    if not SessionLocal:
        raise RuntimeError("Database connection is not initialized.")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
