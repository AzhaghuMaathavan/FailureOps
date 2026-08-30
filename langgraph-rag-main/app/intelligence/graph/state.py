from typing import TypedDict, Optional, List, Dict, Any
from ..schemas.evidence import EvidenceItem
from ..schemas.events import EventItem
from ..schemas.claims import ClaimItem
from ..schemas.signals import NormalizedSignal, SignalRelationship
from ..schemas.analysis import ValidationWarning, ConfidenceSummary, AnalysisResponse

class FailureOpsGraphState(TypedDict, total=False):
    # Request Identifiers & Scope
    request_id: str
    analysis_id: str
    project_id: str
    company_id: Optional[str]
    query: str
    document_ids: Optional[List[str]]
    options: Dict[str, Any]
    db: Any  # Session object passed for retrieval / security check

    # RAG Retrieval Layer
    retrieved_chunks: List[Dict[str, Any]]

    # Evidence Extraction Layer
    raw_evidence: List[Dict[str, Any]]
    raw_events: List[Dict[str, Any]]
    raw_claims: List[Dict[str, Any]]

    # Validated Items
    validated_evidence: List[EvidenceItem]
    validated_events: List[EventItem]
    validated_claims: List[ClaimItem]

    # Signal Synthesis Layer
    signals: List[NormalizedSignal]
    relationships: List[SignalRelationship]

    # Outputs & Observability
    citations: List[Dict[str, Any]]
    warnings: List[ValidationWarning]
    confidence_summary: Optional[ConfidenceSummary]
    status: str
    error_message: Optional[str]
    node_latencies: Dict[str, float]
    node_path: List[str]
    final_response: Optional[AnalysisResponse]
