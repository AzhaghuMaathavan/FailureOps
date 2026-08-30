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
    
    canonical_name = Column(String, nullable=True)
    summary = Column(Text, nullable=False)
    metric_change = Column(String, nullable=True)
    
    risk_score = Column(Float, nullable=True)
    previous_risk_score = Column(Float, nullable=True)
    baseline_risk_score = Column(Float, nullable=True)
    risk_change_percent = Column(Float, nullable=True)
    risk_trend = Column(String, nullable=True)
    scoring_method = Column(String, nullable=True)
    benchmark_target = Column(Float, nullable=True)
    benchmark_critical = Column(Float, nullable=True)
    unit = Column(String, nullable=True)

    baseline_value = Column(Float, nullable=True)
    previous_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    baseline_timestamp = Column(String, nullable=True)
    previous_timestamp = Column(String, nullable=True)
    current_timestamp = Column(String, nullable=True)
    baseline_to_current_change_percent = Column(Float, nullable=True)
    previous_to_current_change_percent = Column(Float, nullable=True)
    metric_change_percent = Column(Float, nullable=True)
    metric_trend = Column(String, nullable=True)
    explanation = Column(Text, nullable=True)
    
    signal_strength = Column(Float, nullable=False, default=0.85)
    signal_confidence = Column(Float, nullable=False, default=0.90)
    historical_prevalence = Column(Integer, nullable=False, default=85)
    
    supporting_evidence_ids = Column(JSON, nullable=False)
    supporting_relationship_ids = Column(JSON, nullable=True)
    signal_data = Column(JSON, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    analysis = relationship("ProjectAnalysis", back_populates="signals")
