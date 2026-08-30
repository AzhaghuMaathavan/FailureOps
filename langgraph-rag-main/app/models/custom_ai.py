from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class CustomAIConfig(Base):
    __tablename__ = "custom_ai_configs"

    id = Column(String, primary_key=True, index=True)
    organization_id = Column(String, nullable=False, unique=True, index=True)
    user_id = Column(String, nullable=False)

    endpoint_url = Column(String, nullable=False)
    model_name = Column(String, nullable=False)
    encrypted_api_key = Column(Text, nullable=False)  # AES-GCM-256 encrypted string, NEVER returned in API responses

    is_active = Column(Boolean, default=True, index=True)
    status = Column(String, nullable=False, default="NOT_CONFIGURED")  # CONNECTED, ERROR, NOT_CONFIGURED
    last_tested_at = Column(DateTime(timezone=True), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
