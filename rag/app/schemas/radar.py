from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class RadarTopRisk(BaseModel):
    rank: int
    name: str
    dimension: str
    risk_level: str = "HIGH" # CRITICAL, HIGH, MEDIUM, LOW
    risk_score: int = Field(ge=0, le=100)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    primary_evidence_id: str
    why_explanation: Optional[str] = None
    contributing_signals: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)

class RadarTrajectoryPoint(BaseModel):
    timestamp: str
    label: str
    risk_score: int = Field(ge=0, le=100)

class RadarExecutiveSnapshotPacket(BaseModel):
    project_id: str
    organization_id: str
    analysis_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    overall_risk_score: int = Field(ge=0, le=100, default=0)
    overall_health: str = "INSUFFICIENT_EVIDENCE"
    risk_velocity: str = "UNKNOWN"
    top_failure_risks: List[RadarTopRisk] = Field(default_factory=list)
    predicted_next_failure: str = "Insufficient evidence for a reliable failure prediction."
    prediction_confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    recommended_primary_action: str = "Insufficient evidence for a recommended action"
    primary_action_priority: int = Field(ge=0, le=100, default=0)
    active_experiments_count: int = 0
    active_experiment_title: Optional[str] = None
    active_experiment_progress: int = 0
    historical_similar_matches_count: int = 0
    best_historical_recovery_delta: Optional[str] = None
    risk_trajectory_history: List[RadarTrajectoryPoint] = Field(default_factory=list)
    corroborating_evidence_ids: List[str] = Field(default_factory=list)
