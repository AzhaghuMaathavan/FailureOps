from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base
from app.models.document import Document

import json
from sqlalchemy.types import TypeDecorator, Text

class SafeVector(TypeDecorator):
    impl = Text
    cache_ok = True

    def __init__(self, dim=2048):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            try:
                from pgvector.sqlalchemy import Vector as PGVector
                return dialect.type_descriptor(PGVector(self.dim))
            except ImportError:
                return dialect.type_descriptor(Text())
        return dialect.type_descriptor(JSON())

    class comparator_factory(TypeDecorator.Comparator):
        def cosine_distance(self, other):
            return self.op("<=>", return_type=Float)(other)

        def l2_distance(self, other):
            return self.op("<->", return_type=Float)(other)

        def max_inner_product(self, other):
            return self.op("<#", return_type=Float)(other)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        if dialect.name == "postgresql":
            return value
        return value

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, str):
            try:
                return json.loads(value)
            except Exception:
                return value
        return value

class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(String, primary_key=True, index=True)
    document_id = Column(String, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    
    # Multi-Tenant Scoping
    organization_id = Column(String, nullable=False, default="org_aurora_technologies", index=True)
    project_id = Column(String, nullable=False, default="aurora", index=True)
    visibility = Column(String, nullable=False, default="PRIVATE")

    # lineage holds page_ids, block_ids, and source_metadata
    lineage = Column(JSON, nullable=False)
    headers = Column(JSON, nullable=False)

    previous_chunk_id = Column(String, nullable=True)
    next_chunk_id = Column(String, nullable=True)
    is_table = Column(Boolean, nullable=False, default=False)

    embedding = Column(SafeVector(2048), nullable=True)
    embedding_model = Column(String, nullable=True)
    embedding_status = Column(String, nullable=False, default='PENDING')
    embedding_error = Column(String, nullable=True)

    document = relationship("Document", back_populates="chunks")


    def __init__(self, **kwargs):
        kwargs.setdefault("organization_id", "org_aurora_technologies")
        kwargs.setdefault("project_id", "aurora")
        kwargs.setdefault("visibility", "PRIVATE")
        kwargs.setdefault("embedding_status", "PENDING")
        super().__init__(**kwargs)
