from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class ProjectAnalysis(Base):
    __tablename__ = "project_analyses"

    id = Column(String, primary_key=True, index=True)
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)
    
    status = Column(String, nullable=False, default="QUEUED", index=True)
    current_stage = Column(String, nullable=False, default="QUEUED")
    progress_percent = Column(Integer, nullable=False, default=0)
    error_message = Column(Text, nullable=True)

    evidence_packet = Column(JSON, nullable=True)
    signal_packet = Column(JSON, nullable=True)
    failure_dna = Column(JSON, nullable=True)
    failure_chain = Column(JSON, nullable=True)
    historical_matches = Column(JSON, nullable=True)
    simulations = Column(JSON, nullable=True)
    metrics = Column(JSON, nullable=True)


    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    evidence_items = relationship("EvidenceItem", back_populates="analysis", cascade="all, delete-orphan")
    conflicts = relationship("EvidenceConflict", back_populates="analysis", cascade="all, delete-orphan")
    signals = relationship("SignalItem", back_populates="analysis", cascade="all, delete-orphan")

