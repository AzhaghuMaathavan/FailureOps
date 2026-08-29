from app.db.database import engine, Base
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.models.chat import Conversation, Message
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict

def init_db():
    print("Creating FailureOps X database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")

if __name__ == "__main__":
    init_db()
