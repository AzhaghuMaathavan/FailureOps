from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class SignalItemSchema(BaseModel):
    signal_id: str
    project_id: str
    analysis_id: str
    organization_id: str
    name: str
    category: str # ADOPTION, CUSTOMER, TECHNICAL, OPERATIONAL, FINANCIAL, DELIVERY, QUALITY, RESOURCE, TEAM, etc.
    signal_type: str # TREND, ANOMALY, CROSS_SOURCE_PATTERN, CONSTRAINT, CONCENTRATION, VOLATILITY, IMPROVEMENT, DECLINE, CONFLICT, WEAK_SIGNAL
    polarity: str # POSITIVE, NEGATIVE, NEUTRAL, MIXED
    status: str # EMERGING, PERSISTENT, IMPROVING, WORSENING, STABLE, CONFLICTED, INSUFFICIENT_DATA
    severity: str = "MEDIUM" # CRITICAL, HIGH, MEDIUM, LOW, HEALTHY
    summary: str
    metric_change: Optional[str] = None
    signal_strength: float = Field(ge=0.0, le=1.0, default=0.85)
    signal_confidence: float = Field(ge=0.0, le=1.0, default=0.90)
    historical_prevalence: int = Field(ge=0, le=100, default=85)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    supporting_relationship_ids: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OverallSignalSummary(BaseModel):
    total_signals: int = 0
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    mixed_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    health_score: float = 50.0

class SignalPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    signals: List[SignalItemSchema] = Field(default_factory=list)
    summary: OverallSignalSummary = Field(default_factory=OverallSignalSummary)
