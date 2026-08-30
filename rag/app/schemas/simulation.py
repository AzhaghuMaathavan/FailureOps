from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class ScenarioResult(BaseModel):
    scenario_id: str
    scenario_name: str
    description: str
    baseline_risk: int = Field(ge=0, le=100)
    simulated_risk: int = Field(ge=0, le=100)
    risk_change: int # e.g. -17, +12
    affected_dimensions: List[str] = Field(default_factory=list)
    propagation_steps: List[str] = Field(default_factory=list)
    target_signals: List[str] = Field(default_factory=list)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0, default=0.80)
    type: str = "SIMULATION"
    explanation: str

class SimulationComparisonPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    current_baseline_risk: int
    scenarios: List[ScenarioResult] = Field(default_factory=list)
    recommended_scenario: str
    caveat_notice: str = "This is a deterministic scenario simulation based on empirical signal propagation, not a guaranteed outcome."
