from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class DetectedTrend(BaseModel):
    trend_id: str
    metric_name: str
    category: str
    data_points: List[float] = Field(default_factory=list)
    direction: str # INCREASING, DECREASING, STABLE, FLUCTUATING, INSUFFICIENT_DATA, UNKNOWN
    polarity: str # POSITIVE, NEGATIVE, NEUTRAL, UNKNOWN
    delta_value: Optional[float] = None
    delta_percent: Optional[float] = None
    unit: Optional[str] = None
    evidence_ids: List[str] = Field(default_factory=list)
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0, default=0.90)

class DetectedTrendCollection(BaseModel):
    project_id: str
    analysis_id: str
    total_trends: int = 0
    trends: List[DetectedTrend] = Field(default_factory=list)
