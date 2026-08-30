"""Failure DNA Agent: Computes dimensional vulnerability fingerprints and organizational failure DNA."""
from app.agents.interfaces import FailureDNAAgentInput, FailureDNAAgentInterface
from app.services.dna_engine import calculate_failure_dna

__all__ = ["FailureDNAAgentInput", "FailureDNAAgentInterface", "calculate_failure_dna"]
