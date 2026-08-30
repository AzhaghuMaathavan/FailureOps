"""Evidence Agent: Extracts structured, citation-backed evidence items from document chunks."""
from app.agents.interfaces import EvidenceAgentInput, EvidenceAgentInterface, ChunkCandidate
from app.services.evidence_agent import EvidenceAgent

__all__ = ["EvidenceAgentInput", "EvidenceAgentInterface", "ChunkCandidate", "EvidenceAgent"]
