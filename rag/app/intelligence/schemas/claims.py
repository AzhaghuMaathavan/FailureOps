from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone

class ClaimItem(BaseModel):
    claim_id: str
    project_id: str
    statement: str
    source_speaker_or_entity: Optional[str] = None
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
    verified_as_fact: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
