from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class ChainNode(BaseModel):
    id: str
    type: str # SIGNAL, PATTERN, CONSEQUENCE, PREDICTED_FAILURE
    label: str
    severity: str = "WARNING" # CRITICAL, WARNING, HEALTHY, NEUTRAL
    category: str = "operational" # operational, engineering, product, outcome
    evidence_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.90)

class ChainEdge(BaseModel):
    source: str
    target: str
    relationship_type: str = "CONSISTENT_WITH" # CORROBORATES, ACCELERATES, LEADS_TO, CONSISTENT_WITH

class FailurePrediction(BaseModel):
    predicted_failure: str
    risk_score: int = Field(ge=0, le=100, default=75)
    confidence: float = Field(ge=0.0, le=1.0, default=0.85)
    status: str = "EMERGING" # EMERGING, ACTIVE, IMMINENT, MITIGATED, UNLIKELY
    time_horizon: str = "2-4 weeks"
    explanation: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)

class FailureChainPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    prediction: FailurePrediction
    nodes: List[ChainNode] = Field(default_factory=list)
    edges: List[ChainEdge] = Field(default_factory=list)
    explanation: str
