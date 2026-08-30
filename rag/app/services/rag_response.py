"""Single mapping from retrieved chunks to the public RAG response shape."""
from typing import Any, Dict, List, Optional

NO_EVIDENCE_ANSWER = "No relevant evidence was found."


def _first_page(lineage: Dict[str, Any]) -> Optional[int]:
    pages = lineage.get("page_numbers") or []
    if not pages:
        return None
    try:
        return int(pages[0])
    except (TypeError, ValueError):
        return None


def sources_from_evidence(evidence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    sources = []
    for item in evidence or []:
        lineage = item.get("lineage") or {}
        sources.append(
            {
                "document": lineage.get("document_name") or item.get("filename") or "unknown",
                "page": _first_page(lineage),
                "chunk_id": item.get("chunk_id") or item.get("id"),
            }
        )
    return sources


def empty_rag_response(**extra: Any) -> Dict[str, Any]:
    payload = {
        "answer": NO_EVIDENCE_ANSWER,
        "sources": [],
        "citations": [],
        "retrieved_evidence": [],
        "evidence_state": "NONE",
        "domain_state": "OUT_OF_DOMAIN",
    }
    payload.update(extra)
    return payload
