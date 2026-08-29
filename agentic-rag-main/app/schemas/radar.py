from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class RadarTopRisk(BaseModel):
    rank: int
    name: str
    dimension: str
    risk_level: str = "HIGH" # CRITICAL, HIGH, MEDIUM, LOW
    risk_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0.0, le=1.0, default=0.88)
    primary_evidence_id: str

class RadarTrajectoryPoint(BaseModel):
    timestamp: str
    label: str
    risk_score: int = Field(ge=0, le=100)

class RadarExecutiveSnapshotPacket(BaseModel):
    project_id: str
    organization_id: str
    analysis_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    overall_risk_score: int = Field(ge=0, le=100, default=78)
    overall_health: str = "CRITICAL" # HEALTHY, WATCH, ELEVATED, CRITICAL, INSUFFICIENT_EVIDENCE
    risk_velocity: str = "DETERIORATING" # IMPROVING, STABLE, DETERIORATING, UNKNOWN
    top_failure_risks: List[RadarTopRisk] = Field(default_factory=list)
    predicted_next_failure: str
    prediction_confidence: float = Field(ge=0.0, le=1.0, default=0.88)
    recommended_primary_action: str
    primary_action_priority: int = Field(ge=0, le=100, default=91)
    active_experiments_count: int = 1
    active_experiment_title: Optional[str] = None
    active_experiment_progress: int = 60
    historical_similar_matches_count: int = 3
    best_historical_recovery_delta: Optional[str] = "Release delays ↓ 43% (Project Phoenix)"
    risk_trajectory_history: List[RadarTrajectoryPoint] = Field(default_factory=list)
    corroborating_evidence_ids: List[str] = Field(default_factory=list)
