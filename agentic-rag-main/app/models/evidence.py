from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class EvidenceItem(Base):
    __tablename__ = "evidence_items"

    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(String, ForeignKey("project_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)

    category = Column(String, nullable=False, index=True)
    evidence_type = Column(String, nullable=False, index=True)
    statement = Column(Text, nullable=False)
    
    normalized_value = Column(JSON, nullable=True)
    time_period = Column(JSON, nullable=True)
    source_lineage = Column(JSON, nullable=False)
    supporting_sources = Column(JSON, nullable=True)
    supporting_chunk_ids = Column(JSON, nullable=False)
    
    evidence_confidence = Column(Float, nullable=False, default=0.90)
    verification_status = Column(String, nullable=False, default="VERIFIED")
    
    visibility = Column(String, nullable=False, default="PRIVATE")
    global_learning_allowed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("ProjectAnalysis", back_populates="evidence_items")


class EvidenceConflict(Base):
    __tablename__ = "evidence_conflicts"

    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(String, ForeignKey("project_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)

    topic = Column(String, nullable=False)
    category = Column(String, nullable=False)
    claims = Column(JSON, nullable=False)
    status = Column(String, nullable=False, default="UNRESOLVED")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("ProjectAnalysis", back_populates="conflicts")
