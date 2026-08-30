from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    error_message = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Multi-Tenant & Privacy Isolation
    organization_id = Column(String, nullable=False, default="org_aurora_technologies", index=True)
    project_id = Column(String, nullable=False, default="aurora", index=True)
    visibility = Column(String, nullable=False, default="PRIVATE")
    global_learning_allowed = Column(Boolean, nullable=False, default=False)

    # Metadata
    title = Column(String, nullable=True, index=True)
    document_type = Column(String, nullable=True, index=True)
    department = Column(String, nullable=True, index=True)
    academic_year = Column(String, nullable=True, index=True)
    semester = Column(String, nullable=True, index=True)
    applicable_audience = Column(String, nullable=True)
    description = Column(String, nullable=True)
    topics = Column(JSON, nullable=True)
    keywords = Column(JSON, nullable=True)
    example_questions = Column(JSON, nullable=True)
    effective_from = Column(String, nullable=True)
    effective_until = Column(String, nullable=True)
    version = Column(String, nullable=True)
    priority = Column(Integer, default=1, index=True)

    extracted_metadata = Column(JSON, nullable=True)

    pages = relationship("Page", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    blocks = relationship("DocumentBlock", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)
    chunks = relationship("Chunk", back_populates="document", cascade="all, delete-orphan", passive_deletes=True)

    def __init__(self, **kwargs):
        kwargs.setdefault("organization_id", "org_aurora_technologies")
        kwargs.setdefault("project_id", "aurora")
        kwargs.setdefault("visibility", "PRIVATE")
        kwargs.setdefault("global_learning_allowed", False)
        kwargs.setdefault("status", "PENDING")
        super().__init__(**kwargs)


class Page(Base):
    __tablename__ = "pages"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    image_path = Column(String, nullable=False)
    status = Column(String, nullable=False, default="PENDING")
    raw_parser_response = Column(JSON, nullable=True)
    error_message = Column(String, nullable=True)

    document = relationship("Document", back_populates="pages")
    blocks = relationship("DocumentBlock", back_populates="page")


class DocumentBlock(Base):
    __tablename__ = "document_blocks"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_id = Column(String, ForeignKey("pages.id", ondelete="CASCADE"), nullable=False)
    block_index = Column(Integer, nullable=False)
    block_type = Column(String, nullable=False)
    content = Column(String, nullable=True)
    bbox = Column(JSON, nullable=True)
    raw_metadata = Column(JSON, nullable=True)

    document = relationship("Document", back_populates="blocks")
    page = relationship("Page", back_populates="blocks")
