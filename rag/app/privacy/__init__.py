"""
FailureOps X — Privacy Enforcement & Data Isolation
Enforces strict multi-tenant boundary checks and sanitization policies.
"""

from typing import Dict, Any, List

ALLOWED_PRIVACY_LEVELS = {"PRIVATE", "ORGANIZATION", "GLOBAL_SANITIZED", "ANONYMOUS_LEARNING", "PUBLIC", "PUBLIC_CASE_STUDY"}

def sanitize_case_for_global_memory(case_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Strips private source documents, customer names, API keys, and internal URLs.
    Retains only generalized failure patterns, intervention mechanics, and delta metrics.
    """
    return {
        "case_id": case_data.get("case_id") or case_data.get("id"),
        "pattern": case_data.get("pattern") or case_data.get("primaryFailurePattern"),
        "archetype": case_data.get("archetype") or case_data.get("dominantArchetype"),
        "industry": case_data.get("industry", "Enterprise Technology"),
        "intervention": case_data.get("intervention") or case_data.get("historicalIntervention"),
        "outcome": case_data.get("outcome") or case_data.get("interventionOutcome"),
        "visibility": "GLOBAL_SANITIZED",
        "key_lessons": case_data.get("key_lessons") or case_data.get("keyLessons", []),
        "sanitized_evidence_references": case_data.get("sanitizedEvidenceReferences", []),
    }

def enforce_tenant_isolation(requested_org: str, session_org: str) -> bool:
    """Verifies whether the caller is authorized to view raw evidence from the target organization."""
    if not session_org:
        return False
    return requested_org == session_org
