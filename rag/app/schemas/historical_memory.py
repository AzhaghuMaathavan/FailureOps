from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

class HistoricalCase(BaseModel):
    id: str
    name: str
    company_alias: str
    industry: str
    pattern: str
    signals: List[str] = Field(default_factory=list)
    failure: str
    intervention: str
    outcome: str
    outcome_type: str = "RECOVERED" # RECOVERED, FAILED, DELAYED
    similarity: int = Field(ge=0, le=100, default=0)
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    visibility: str = "GLOBAL_ANONYMIZED" # PRIVATE, ORGANIZATION, GLOBAL_ANONYMIZED
    organization_id: Optional[str] = None
    source_project_id: Optional[str] = None
    is_synthetic_demo: bool = False
    before_metrics: Dict[str, Any] = Field(default_factory=dict)
    after_metrics: Dict[str, Any] = Field(default_factory=dict)
    key_lessons: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class HistoricalMemoryPacket(BaseModel):
    project_id: str
    analysis_id: str
    organization_id: str
    generated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    current_pattern: str
    total_matches: int = 0
    matched_cases: List[HistoricalCase] = Field(default_factory=list)
