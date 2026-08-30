from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.evidence_packet import EvidencePacket, EvidenceMetrics

class StartAnalysisRequest(BaseModel):
    project_id: str = "aurora"
    organization_id: Optional[str] = None
    options: Dict[str, Any] = Field(default_factory=dict)

class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    project_id: str
    organization_id: str
    status: str # QUEUED, PARSING_DOCUMENTS, CHUNKING, INDEXING, RETRIEVING_EVIDENCE, RERANKING, EXTRACTING_EVIDENCE, VALIDATING_EVIDENCE, COMPLETED, FAILED
    current_stage: str
    progress_percent: int
    error_message: Optional[str] = None
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None

class StartAnalysisResponse(BaseModel):
    analysis_id: str
    project_id: str
    organization_id: str
    status: str = "QUEUED"
    message: str = "Analysis job queued successfully"
