from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class DimensionRisk(BaseModel):
    dimension: str # Adoption, Technical, Operational, Execution, Customer, Financial, Security, Quality
    risk_score: Optional[int] = None # 0 - 100, None if NO_EVIDENCE
    confidence: float = Field(ge=0.0, le=1.0, default=0.90)
    status: str = "MEASURED" # MEASURED, NO_EVIDENCE, INSUFFICIENT_DATA
    severity: str = "HEALTHY" # CRITICAL, WARNING, HEALTHY, NO_EVIDENCE
    primary_drivers: List[str] = Field(default_factory=list)
    evidence_count: int = 0
    evidence_ids: List[str] = Field(default_factory=list)
    why_explanation: str = ""
    historical_correlation: Optional[str] = None

class OverallProjectHealth(BaseModel):
    risk_score: int = Field(ge=0, le=100, default=50) # 0-30 HEALTHY, 31-60 WATCH, 61-80 ELEVATED, 81-100 CRITICAL
    status: str = "WATCH" # HEALTHY, WATCH, ELEVATED, CRITICAL, INSUFFICIENT_EVIDENCE
    trend: str = "STABLE" # IMPROVING, STABLE, DETERIORATING, UNKNOWN
    dominant_archetype: str = "Standard Operational Baseline"
    top_contributing_dimensions: List[str] = Field(default_factory=list)
    summary_explanation: str = ""

class FailureDNAPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    overall: OverallProjectHealth = Field(default_factory=OverallProjectHealth)
    dimensions: List[DimensionRisk] = Field(default_factory=list)
