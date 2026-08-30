from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.database import Base

class SignalItem(Base):
    __tablename__ = "signal_items"

    id = Column(String, primary_key=True, index=True)
    analysis_id = Column(String, ForeignKey("project_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_id = Column(String, nullable=False, index=True)
    project_id = Column(String, nullable=False, index=True)

    name = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    signal_type = Column(String, nullable=False, index=True)
    polarity = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default="EMERGING")
    severity = Column(String, nullable=False, default="MEDIUM")
    
    summary = Column(Text, nullable=False)
    metric_change = Column(String, nullable=True)
    
    signal_strength = Column(Float, nullable=False, default=0.85)
    signal_confidence = Column(Float, nullable=False, default=0.90)
    historical_prevalence = Column(Integer, nullable=False, default=85)
    
    supporting_evidence_ids = Column(JSON, nullable=False)
    supporting_relationship_ids = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("ProjectAnalysis", back_populates="signals")
