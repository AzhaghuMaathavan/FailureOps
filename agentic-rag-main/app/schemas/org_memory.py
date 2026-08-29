from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class OrganizationalMemoryItem(BaseModel):
    memory_id: str
    organization_id: str
    project_id: str
    source_experiment_id: Optional[str] = None
    memory_type: str = "LESSON" # FAILURE_PATTERN, INTERVENTION, EXPERIMENT, OUTCOME, LESSON, RECOMMENDATION
    pattern_name: str
    intervention_title: str
    outcome_status: str = "SUCCESS" # SUCCESS, PARTIAL_SUCCESS, REGRESSION, NO_EFFECT
    observed_impact: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    key_lessons: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    visibility: str = "ORGANIZATION" # PRIVATE, ORGANIZATION, GLOBAL_ANONYMIZED
    is_synthetic_demo: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrganizationalMemoryPacket(BaseModel):
    organization_id: str
    project_id: Optional[str] = None
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    memories: List[OrganizationalMemoryItem] = Field(default_factory=list)
    total_memories: int = 0
