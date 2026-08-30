from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from .evidence import Direction

class SignalCategory(str, Enum):
    TECHNICAL = "TECHNICAL"
    OPERATIONAL = "OPERATIONAL"
    FINANCIAL = "FINANCIAL"
    ACADEMIC = "ACADEMIC"
    COMPLIANCE = "COMPLIANCE"

class SignalSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class SignalRelationship(BaseModel):
    source_signal_name: str
    target_signal_name: str
    relationship_type: str = "ASSOCIATED_WITH"  # "ASSOCIATED_WITH", "POTENTIAL_DRIVER", "CORRELATED"
    strength: float = Field(default=0.5, ge=0.0, le=1.0)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    explanation: str = ""

class DimensionRiskScore(BaseModel):
    dimension: SignalCategory
    risk_score: float = Field(ge=0.0, le=100.0)
    severity: SignalSeverity
    
    # Explicit Risk Movement Fields
    previous_risk_score: Optional[float] = None
    risk_change_percent: Optional[float] = None
    risk_trend: Direction = Direction.UNKNOWN
    
    # Backwards Compatibility Aliases
    previous_score: Optional[float] = None
    change_percent: Optional[float] = None
    trend: Direction = Direction.UNKNOWN
    
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_count: int = 0
    evidence_ids: List[str] = Field(default_factory=list)

class NormalizedSignal(BaseModel):
    signal_id: str
    project_id: str
    company_id: Optional[str] = None
    canonical_name: str
    category: SignalCategory = SignalCategory.TECHNICAL
    
    # -------------------------------------------------------------
    # 1. NORMALIZED RISK SCORE & RISK SCORE MOVEMENT (0-100 Scale)
    # -------------------------------------------------------------
    risk_score: Optional[float] = None
    previous_risk_score: Optional[float] = None
    baseline_risk_score: Optional[float] = None
    risk_change_percent: Optional[float] = None
    risk_trend: Direction = Direction.UNKNOWN
    scoring_method: Optional[str] = None
    polarity: Optional[str] = None
    benchmark_target: Optional[float] = None
    benchmark_critical: Optional[float] = None
    unit: Optional[str] = None
    
    # -------------------------------------------------------------
    # 2. RAW SOURCE METRIC VALUES & RAW METRIC MOVEMENT
    # -------------------------------------------------------------
    baseline_value: Optional[float] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    baseline_timestamp: Optional[str] = None
    previous_timestamp: Optional[str] = None
    current_timestamp: Optional[str] = None
    baseline_to_current_change_percent: Optional[float] = None
    previous_to_current_change_percent: Optional[float] = None
    metric_change_percent: Optional[float] = None
    metric_trend: Direction = Direction.UNKNOWN
    
    # -------------------------------------------------------------
    # 3. BACKWARDS COMPATIBILITY ALIASES
    # -------------------------------------------------------------
    baseline_score: Optional[float] = None
    previous_score: Optional[float] = None
    baseline_to_current_change: Optional[float] = None
    previous_to_current_change: Optional[float] = None
    percentage_change: Optional[float] = None
    change_percent: Optional[float] = None
    direction: Direction = Direction.UNKNOWN
    trend: Direction = Direction.UNKNOWN
    
    # -------------------------------------------------------------
    # 4. SIGNAL METADATA & PROVENANCE
    # -------------------------------------------------------------
    velocity: Optional[float] = None
    persistence: Optional[str] = None
    severity: SignalSeverity = SignalSeverity.LOW
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    evidence_count: int = 0
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    evidence_ids: List[str] = Field(default_factory=list)
    supporting_citations: List[str] = Field(default_factory=list)
    conflicting_evidence_ids: List[str] = Field(default_factory=list)
    explanation: str = ""
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
