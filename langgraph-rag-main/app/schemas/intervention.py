from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class PriorityCalculationBreakdown(BaseModel):
    risk_severity: float = Field(..., description="Normalized severity of the targeted risk (0-100)")
    prediction_confidence: float = Field(..., description="Confidence of the predicted failure trajectory (0.0-1.0)")
    chain_impact: float = Field(..., description="Impact weight along the causal failure chain (0.0-1.0)")
    expected_risk_reduction: float = Field(..., description="Estimated risk points reduced (0-100)")
    effort_weight: float = Field(..., description="Effort penalty divisor (Low=1.0, Medium=1.35, High=1.8)")
    calculated_score: int = Field(..., description="Final bounded score from 0 to 100")
    formula_explanation: str = Field(
        default="(risk_severity * prediction_confidence * chain_impact * expected_risk_reduction) / effort_weight",
        description="Transparent formula used to compute priority score"
    )

class InterventionItem(BaseModel):
    intervention_id: str
    project_id: str
    analysis_id: str
    organization_id: str
    title: str
    problem_addressed: str
    target_dimension: str
    target_signals: List[str] = Field(default_factory=list)
    expected_effect: str
    priority: str = "HIGH" # CRITICAL, HIGH, MEDIUM, LOW
    priority_score: int = Field(ge=0, le=100, default=85)
    priority_breakdown: PriorityCalculationBreakdown
    urgency: str = "THIS_SPRINT" # IMMEDIATE, THIS_SPRINT, NEXT_SPRINT, PLANNED
    effort: str = "MEDIUM" # LOW, MEDIUM, HIGH
    expected_risk_reduction: int = Field(ge=0, le=100, default=20)
    confidence: float = Field(ge=0.0, le=1.0, default=0.88)
    rationale: str
    evidence_ids: List[str] = Field(default_factory=list)
    affected_failure_chain_nodes: List[str] = Field(default_factory=list)
    owner_role: str = "Engineering Lead"
    status: str = "PROPOSED" # PROPOSED, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED
    action_steps: List[str] = Field(default_factory=list)
    epistemic_level: str = "RECOMMENDED" # OBSERVED, INFERRED, RECOMMENDED
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InterventionPlanPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    interventions: List[InterventionItem] = Field(default_factory=list)
    recommended_primary_intervention: str
    total_potential_risk_reduction: int = 0
