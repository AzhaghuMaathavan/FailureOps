from app.db.database import engine, Base, SessionLocal
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.models.chat import Conversation, Message
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.models.signal import SignalItem
from app.models.project import Project
from app.db.baseline_projects import ensure_baseline_projects

def init_db():
    print("Creating FailureOps X database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")

    db = SessionLocal()
    try:
        added = ensure_baseline_projects(db)
        if added:
            print(f"Seeded {added} missing baseline project(s).")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

