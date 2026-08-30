from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, field_validator
from datetime import datetime, timezone

class EventType(str, Enum):
    DEPLOYMENT = "DEPLOYMENT"
    RELEASE = "RELEASE"
    INCIDENT = "INCIDENT"
    POLICY_CHANGE = "POLICY_CHANGE"
    SCHEDULE_CHANGE = "SCHEDULE_CHANGE"
    MEETING = "MEETING"
    RISK_DETECTED = "RISK_DETECTED"
    METRIC_ANOMALY = "METRIC_ANOMALY"
    MILESTONE = "MILESTONE"
    OTHER = "OTHER"

class EventItem(BaseModel):
    event_id: str
    project_id: str
    description: str
    event_type: EventType = EventType.OTHER
    timestamp: Optional[str] = None
    period: Optional[str] = None
    source_document_id: str
    source_document_name: Optional[str] = "Unknown Document"
    source_chunk_id: str
    supporting_chunk_ids: List[str] = Field(default_factory=list)
    location_type: Optional[str] = None  # "page", "row", "section", "chunk"
    location_value: Optional[str] = None  # "Page 3", "Row 14", "Section 2"
    page_numbers: List[int] = Field(default_factory=list)
    citation: str
    source_metadata: Dict[str, Any] = Field(default_factory=dict)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

    @field_validator("event_type", mode="before")
    @classmethod
    def validate_event_type(cls, v: Any) -> EventType:
        if isinstance(v, EventType):
            return v
        if isinstance(v, str):
            val_upper = v.strip().upper()
            try:
                return EventType(val_upper)
            except ValueError:
                return EventType.OTHER
        return EventType.OTHER
