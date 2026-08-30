from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import uuid

from .evidence import EvidenceItem
from .events import EventItem
from .claims import ClaimItem
from .signals import NormalizedSignal, SignalRelationship, DimensionRiskScore

class AnalysisRequest(BaseModel):
    analysis_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    company_id: Optional[str] = None
    query: str
    document_ids: Optional[List[str]] = None
    options: Dict[str, Any] = Field(default_factory=dict)

class ValidationWarning(BaseModel):
    code: str
    message: str
    field: Optional[str] = None
    severity: str = "WARNING"

class ConfidenceSummary(BaseModel):
    overall_confidence: float = 1.0
    evidence_count: int = 0
    signal_count: int = 0
    grounded_ratio: float = 1.0

class ProcessingMetadata(BaseModel):
    execution_latencies: Dict[str, float] = Field(default_factory=dict)
    node_path: List[str] = Field(default_factory=list)
    retrieved_chunk_count: int = 0
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    version: str = "1.0.0"

class AnalysisResponse(BaseModel):
    analysis_id: str
    project_id: str
    company_id: Optional[str] = None
    status: str = "completed"  # "completed", "partial", "insufficient_evidence", "failed"
    evidence: List[EvidenceItem] = Field(default_factory=list)
    events: List[EventItem] = Field(default_factory=list)
    claims: List[ClaimItem] = Field(default_factory=list)
    signals: List[NormalizedSignal] = Field(default_factory=list)
    risk_dimensions: List[DimensionRiskScore] = Field(default_factory=list)
    relationships: List[SignalRelationship] = Field(default_factory=list)
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[ValidationWarning] = Field(default_factory=list)
    confidence_summary: ConfidenceSummary = Field(default_factory=ConfidenceSummary)
    processing_metadata: ProcessingMetadata = Field(default_factory=ProcessingMetadata)
    error_message: Optional[str] = None

# Alias for downstream FailureOps contracts
IntelligenceResult = AnalysisResponse
