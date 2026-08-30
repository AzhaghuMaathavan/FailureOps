"""
FailureOps X — Agent Interfaces & Contracts
Protocol definitions for autonomous intelligence agents.
Each agent adheres to the deterministic contract:
INPUT -> Agent Reasoning / Extraction -> STRUCTURED OUTPUT
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from abc import ABC, abstractmethod

from app.schemas.evidence_packet import EvidencePacket, EvidenceItemSchema
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket, DimensionRisk
from app.schemas.radar import RadarExecutiveSnapshotPacket, RadarTopRisk
from app.schemas.intervention import InterventionItem


# ==========================================
# Common Privacy & Identity Envelopes
# ==========================================

class PrivacyScope(BaseModel):
    owner_org: str = Field(default="org_default", description="Tenant / Organization Identifier")
    visibility: str = Field(default="PRIVATE", description="PRIVATE | ORGANIZATION | GLOBAL_SANITIZED")
    consent_for_sanitized_learning: bool = Field(default=True)


# ==========================================
# 1. Evidence Agent Interface
# ==========================================

class ChunkCandidate(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    content: str
    score: float
    page_number: Optional[int] = None
    section_header: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class EvidenceAgentInput(BaseModel):
    project_id: str
    candidates: List[ChunkCandidate]
    privacy: PrivacyScope = Field(default_factory=PrivacyScope)


class EvidenceAgentInterface(ABC):
    @abstractmethod
    async def extract_evidence(self, input_data: EvidenceAgentInput) -> EvidencePacket:
        """Extracts structured evidence items from retrieved document chunks."""
        pass


# ==========================================
# 2. Signal Agent Interface
# ==========================================

class SignalAgentInput(BaseModel):
    project_id: str
    evidence_packet: EvidencePacket
    baseline_metrics: Optional[Dict[str, Any]] = None


class SignalAgentInterface(ABC):
    @abstractmethod
    async def detect_signals(self, input_data: SignalAgentInput) -> SignalPacket:
        """Synthesizes structured signals from extracted evidence items."""
        pass


# ==========================================
# 3. Pattern Agent Interface
# ==========================================

class PatternItem(BaseModel):
    pattern_id: str
    name: str
    archetype: str
    severity: str
    confidence: float
    contributing_signal_ids: List[str]
    description: str


class PatternPacket(BaseModel):
    project_id: str
    patterns: List[PatternItem]
    compound_risk_score: float
    generated_at: str


class PatternAgentInput(BaseModel):
    project_id: str
    signal_packet: SignalPacket


class PatternAgentInterface(ABC):
    @abstractmethod
    async def identify_patterns(self, input_data: PatternAgentInput) -> PatternPacket:
        """Identifies systemic failure patterns and archetypes from detected signals."""
        pass


# ==========================================
# 4. Failure DNA Agent Interface
# ==========================================

class FailureDNAAgentInput(BaseModel):
    project_id: str
    signal_packet: SignalPacket
    pattern_packet: Optional[PatternPacket] = None


class FailureDNAAgentInterface(ABC):
    @abstractmethod
    async def compute_dna(self, input_data: FailureDNAAgentInput) -> FailureDNAPacket:
        """Calculates dimensional Failure DNA risk scores (Technical, Operational, Adoption, Execution, Financial, Customer)."""
        pass


# ==========================================
# 5. Truth / Assumption Agent Interface
# ==========================================

class AssumptionClaim(BaseModel):
    claim_id: str
    statement: str
    category: Optional[str] = "PRODUCT"


class ClaimVerification(BaseModel):
    claim_id: str
    statement: str
    status: str  # VERIFIED | CHALLENGED | UNSUPPORTED | REFUTED
    confidence: float
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    contradicting_evidence_ids: List[str] = Field(default_factory=list)
    analysis: str
    suggested_pivot: Optional[str] = None


class TruthAssessment(BaseModel):
    project_id: str
    claims: List[ClaimVerification]
    integrity_score: float
    generated_at: str


class TruthAgentInput(BaseModel):
    project_id: str
    assumptions: List[AssumptionClaim]
    evidence_packet: EvidencePacket


class TruthAgentInterface(ABC):
    @abstractmethod
    async def verify_assumptions(self, input_data: TruthAgentInput) -> TruthAssessment:
        """Fact-checks strategic product assumptions against empirical evidence."""
        pass


# ==========================================
# 6. Prediction Agent Interface
# ==========================================

class PredictionAgentInput(BaseModel):
    project_id: str
    failure_dna: FailureDNAPacket
    signals: SignalPacket
    historical_matches: Optional[List[Dict[str, Any]]] = None


class PredictionAgentInterface(ABC):
    @abstractmethod
    async def predict_failure_trajectory(self, input_data: PredictionAgentInput) -> RadarExecutiveSnapshotPacket:
        """Forecasts failure trajectories, time horizons, and next failure triggers."""
        pass


# ==========================================
# 7. Intervention Agent Interface
# ==========================================

class InterventionAgentInput(BaseModel):
    project_id: str
    radar: RadarExecutiveSnapshotPacket
    failure_dna: FailureDNAPacket
    historical_interventions: Optional[List[Dict[str, Any]]] = None


class InterventionAgentInterface(ABC):
    @abstractmethod
    async def recommend_interventions(self, input_data: InterventionAgentInput) -> List[InterventionItem]:
        """Generates evidence-backed actionable interventions and mitigation plans."""
        pass
