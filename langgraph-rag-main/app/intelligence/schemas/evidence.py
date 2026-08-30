from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

class FactType(str, Enum):
    METRIC = "METRIC"
    EVENT = "EVENT"
    CLAIM = "CLAIM"
    STATUS = "STATUS"
    POLICY = "POLICY"
    INCIDENT = "INCIDENT"

class Direction(str, Enum):
    INCREASING = "INCREASING"
    DECREASING = "DECREASING"
    STABLE = "STABLE"
    UNKNOWN = "UNKNOWN"

class EvidenceItem(BaseModel):
    evidence_id: str
    project_id: str
    company_id: Optional[str] = None
    statement: str
    fact_type: FactType = FactType.METRIC
    metric_name: Optional[str] = None
    baseline_value: Optional[float] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    direction: Direction = Direction.UNKNOWN
    timestamp: Optional[str] = None
    baseline_timestamp: Optional[str] = None
    previous_timestamp: Optional[str] = None
    current_timestamp: Optional[str] = None
    period: Optional[str] = None
    baseline_to_current_change: Optional[float] = None
    previous_to_current_change: Optional[float] = None
    baseline_to_current_change_percent: Optional[float] = None
    previous_to_current_change_percent: Optional[float] = None
    source_document_id: str
    source_document_name: str
    source_chunk_id: str
    supporting_chunk_ids: List[str] = Field(default_factory=list)
    citation: str
    source_metadata: Dict[str, Any] = Field(default_factory=dict)
    page_numbers: List[int] = Field(default_factory=list)
    observations_count: int = 1
    extraction_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    visibility: str = "PRIVATE"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("fact_type", mode="before")
    @classmethod
    def coerce_fact_type(cls, v):
        if not v:
            return FactType.METRIC
        if isinstance(v, str):
            val = v.upper().strip()
            try:
                return FactType(val)
            except ValueError:
                return FactType.METRIC
        return v

    @field_validator("direction", mode="before")
    @classmethod
    def coerce_direction(cls, v):
        if not v:
            return Direction.UNKNOWN
        if isinstance(v, str):
            val = v.upper().strip()
            try:
                return Direction(val)
            except ValueError:
                return Direction.UNKNOWN
        return v

class EvidencePacket(BaseModel):
    items: List[EvidenceItem] = Field(default_factory=list)
    total_count: int = 0
    extracted_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
