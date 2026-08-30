from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class NormalizedMetric(BaseModel):
    metric: str
    before: Optional[float] = None
    after: Optional[float] = None
    unit: Optional[str] = None # percent, hours, days, count, mrr_usd, etc.
    direction: Optional[str] = None # INCREASE, DECREASE, STABLE, FLUCTUATING

class TimePeriod(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None

class EvidenceSource(BaseModel):
    document_id: str
    document_name: str
    source_type: Optional[str] = None
    location_type: Optional[str] = None # PAGE, SLIDE, SHEET, SECTION, ROW
    location_value: Optional[str] = None

class SupportingSource(BaseModel):
    document_id: str
    document_name: str
    location: Optional[str] = None

class PrivacyMetadata(BaseModel):
    visibility: str = "PRIVATE"
    global_learning_allowed: bool = False

class EvidenceItemSchema(BaseModel):
    id: str
    category: str # ADOPTION, CUSTOMER, PRODUCT, FINANCIAL, OPERATIONAL, TECHNICAL, DELIVERY, QUALITY, RESOURCE, TEAM, MARKET, STRATEGY, SECURITY, DEPENDENCY, PERFORMANCE, RISK, OTHER
    evidence_category: Optional[str] = None
    source_type: Optional[str] = None
    evidence_type: str = "METRIC" # METRIC, TREND, EVENT, CUSTOMER_FEEDBACK, INCIDENT, DECISION, OBSERVATION, GOAL, CONSTRAINT, COMPLAINT, MILESTONE, RESOURCE_SIGNAL, TECHNICAL_SIGNAL, RISK_STATEMENT, OTHER
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
    source_document_id: Optional[str] = None
    source_document_name: Optional[str] = None
    source_chunk_id: Optional[str] = None
    page_numbers: List[int] = Field(default_factory=list)
    row_numbers: List[int] = Field(default_factory=list)
    citation: Optional[str] = None
    source_metadata: Dict[str, Any] = Field(default_factory=dict)
    normalized_value: Optional[NormalizedMetric] = None
    time_period: Optional[TimePeriod] = None
    source: Optional[EvidenceSource] = None
    supporting_sources: List[SupportingSource] = Field(default_factory=list)
    supporting_chunk_ids: List[str] = Field(default_factory=list)
    evidence_confidence: float = Field(ge=0.0, le=1.0, default=0.90)
    verification_status: str = "VERIFIED" # VERIFIED, REJECTED
    privacy: PrivacyMetadata = Field(default_factory=PrivacyMetadata)

class ConflictClaim(BaseModel):
    value: Any
    source: str
    chunk_id: Optional[str] = None

class EvidenceConflictSchema(BaseModel):
    id: str
    topic: str
    category: str
    claims: List[ConflictClaim]
    status: str = "UNRESOLVED"

class EvidenceMetrics(BaseModel):
    total_documents_analyzed: int = 0
    total_chunks_searched: int = 0
    total_evidence_extracted: int = 0
    verified_evidence_count: int = 0
    rejected_evidence_count: int = 0
    conflicts_count: int = 0
    processing_time_seconds: float = 0.0

class EvidencePacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    evidence: List[EvidenceItemSchema] = Field(default_factory=list)
    events: List[Dict[str, Any]] = Field(default_factory=list)
    claims: List[Dict[str, Any]] = Field(default_factory=list)
    conflicts: List[EvidenceConflictSchema] = Field(default_factory=list)
    coverage: Dict[str, str] = Field(default_factory=dict)
    metrics: EvidenceMetrics = Field(default_factory=EvidenceMetrics)

