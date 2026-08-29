from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class ExperimentBaselineSnapshot(BaseModel):
    snapshot_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    metrics: Dict[str, float] = Field(default_factory=dict)
    is_immutable: bool = True

class ExperimentTargetMetric(BaseModel):
    metric_name: str
    baseline_value: float
    target_value: float
    unit: str = "percent"
    desired_direction: str = "DECREASE" # DECREASE, INCREASE

class ExperimentItem(BaseModel):
    experiment_id: str
    project_id: str
    organization_id: str
    intervention_id: str
    failure_prediction_id: Optional[str] = None
    target_signal_ids: List[str] = Field(default_factory=list)
    title: str
    experiment_type: str = "TECHNICAL_FIX" # MITIGATION, PROCESS_CHANGE, TECHNICAL_FIX, CAPACITY_CHANGE, SCOPE_REDUCTION, ONBOARDING_CHANGE, QUALITY_IMPROVEMENT
    hypothesis: str
    baseline_snapshot: ExperimentBaselineSnapshot
    target_metrics: List[ExperimentTargetMetric] = Field(default_factory=list)
    observation_period_days: int = 14
    success_criteria: List[str] = Field(default_factory=list)
    owner: str = "Engineering Lead"
    status: str = "DRAFT" # DRAFT, ACTIVE, COMPLETED, CANCELLED
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    progress_percent: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ExperimentListPacket(BaseModel):
    project_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    experiments: List[ExperimentItem] = Field(default_factory=list)
    active_experiment_count: int = 0
