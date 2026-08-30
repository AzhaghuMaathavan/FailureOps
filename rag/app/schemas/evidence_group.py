from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from app.schemas.signal_input import VerifiedEvidenceContextItem
from app.schemas.evidence_packet import TimePeriod

class EvidenceGroup(BaseModel):
    group_id: str
    group_name: str
    primary_category: str
    evidence_ids: List[str] = Field(default_factory=list)
    evidence_items: List[VerifiedEvidenceContextItem] = Field(default_factory=list)
    metrics_tracked: List[str] = Field(default_factory=list)
    time_period: Optional[TimePeriod] = None
    group_confidence: float = Field(ge=0.0, le=1.0, default=0.90)

class EvidenceGroupCollection(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    total_groups: int = 0
    groups: List[EvidenceGroup] = Field(default_factory=list)
