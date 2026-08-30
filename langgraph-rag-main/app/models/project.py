from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON
from sqlalchemy.sql import func
from app.db.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code_name = Column(String, nullable=False)
    company = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    industry = Column(String, nullable=True)
    stage = Column(String, nullable=True)
    target_users = Column(String, nullable=True)
    expected_launch_date = Column(String, nullable=True)
    privacy_level = Column(String, nullable=False, default="PRIVATE")
    organization_id = Column(String, nullable=False, default="org_aurora_technologies", index=True)
    
    # Computed / Cached Health Attributes
    health = Column(String, nullable=False, default="HEALTHY")
    failure_risk = Column(Integer, nullable=False, default=50)
    risk_trend = Column(String, nullable=True)
    predicted_next_failure = Column(String, nullable=True)
    prediction_confidence = Column(Integer, nullable=True)
    historical_similarity = Column(Integer, nullable=True)
    sources_uploaded = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
