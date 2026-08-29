from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class MetricOutcomeDelta(BaseModel):
    metric_name: str
    baseline_value: float
    measured_after_value: float
    unit: str = "percent"
    polarity: str = "POSITIVE_WHEN_DECREASING" # POSITIVE_WHEN_DECREASING, POSITIVE_WHEN_INCREASING
    percent_improvement: float
    is_improved: bool
    target_met: bool

class ExperimentOutcomeReport(BaseModel):
    outcome_id: str
    experiment_id: str
    project_id: str
    organization_id: str
    intervention_title: str
    status: str = "SUCCESS" # SUCCESS, PARTIAL_SUCCESS, NO_EFFECT, REGRESSION, INSUFFICIENT_EVIDENCE
    metric_deltas: List[MetricOutcomeDelta] = Field(default_factory=list)
    attribution_confidence: str = "HIGH" # HIGH, MEDIUM, LOW
    attribution_reasoning: str
    summary: str
    epistemic_safety_note: str = "Improvement observed after intervention. Attribution reflects observed correlation."
    evidence_ids: List[str] = Field(default_factory=list)
    verified_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OutcomeVerificationPacket(BaseModel):
    project_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    outcomes: List[ExperimentOutcomeReport] = Field(default_factory=list)
    overall_success_rate: float = 0.0
