from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class EvidenceRelationship(BaseModel):
    relationship_id: str
    relationship_type: str # ONBOARDING_FRICTION, TECHNICAL_RELIABILITY_STRESS, OPERATIONAL_OVERLOAD_DRAG, POSITIVE_ADOPTION_MOMENTUM, DELIVERY_PRESSURE, PRICING_NON_CORRELATION, OTHER
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    relevant_categories: List[str] = Field(default_factory=list)
    relevant_metrics: List[str] = Field(default_factory=list)
    relationship_strength: float = Field(ge=0.0, le=1.0, default=0.85)
    explanation: str

class EvidenceRelationshipCollection(BaseModel):
    project_id: str
    analysis_id: str
    total_relationships: int = 0
    relationships: List[EvidenceRelationship] = Field(default_factory=list)
