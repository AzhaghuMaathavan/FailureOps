from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.schemas.evidence_packet import (
    NormalizedMetric,
    TimePeriod,
    EvidenceSource,
    SupportingSource,
    PrivacyMetadata,
    EvidenceConflictSchema
)

class VerifiedEvidenceContextItem(BaseModel):
    evidence_id: str
    category: str
    type: str # METRIC, TREND, EVENT, CUSTOMER_FEEDBACK, INCIDENT, etc.
    statement: str
    fact_type: Optional[str] = None
    metric_name: Optional[str] = None
    baseline_value: Optional[float] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    direction: Optional[str] = None
    baseline_timestamp: Optional[str] = None
    previous_timestamp: Optional[str] = None
    current_timestamp: Optional[str] = None
    baseline_to_current_change_percent: Optional[float] = None
    previous_to_current_change_percent: Optional[float] = None
    normalized_value: Optional[NormalizedMetric] = None
    time_period: Optional[TimePeriod] = None
    source: EvidenceSource
    supporting_sources: List[SupportingSource] = Field(default_factory=list)
    supporting_chunk_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    privacy: PrivacyMetadata = Field(default_factory=PrivacyMetadata)

class SignalInputContext(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    received_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified_evidence: List[VerifiedEvidenceContextItem] = Field(default_factory=list)
    conflicts: List[EvidenceConflictSchema] = Field(default_factory=list)
    coverage: Dict[str, str] = Field(default_factory=dict)
    
    total_input_count: int = 0
    verified_count: int = 0
    rejected_unverified_count: int = 0
    metrics: Dict[str, Any] = Field(default_factory=dict)
