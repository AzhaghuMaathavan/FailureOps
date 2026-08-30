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
    source_type: Optional[str] = None
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
    normalized_value: Optional[NormalizedMetric] = None
    time_period: Optional[TimePeriod] = None
    source: EvidenceSource
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
    conflicts: List[EvidenceConflictSchema] = Field(default_factory=list)
    coverage: Dict[str, str] = Field(default_factory=dict)
    metrics: EvidenceMetrics = Field(default_factory=EvidenceMetrics)

