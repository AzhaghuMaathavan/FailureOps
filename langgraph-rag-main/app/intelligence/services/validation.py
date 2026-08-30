import re
import logging
from typing import List, Dict, Any, Tuple
from ..schemas.evidence import EvidenceItem
from ..schemas.signals import NormalizedSignal
from ..schemas.analysis import ValidationWarning

logger = logging.getLogger(__name__)

def validate_evidence_items(
    raw_evidence_items: List[Dict[str, Any]],
    retrieved_chunks: List[Dict[str, Any]]
) -> Tuple[List[EvidenceItem], List[ValidationWarning]]:
    """
    Validates extracted evidence items against retrieved RAG chunks.
    Rejects or flags items without verifiable source provenance.
    """
    valid_items: List[EvidenceItem] = []
    warnings: List[ValidationWarning] = []

    chunk_map = {c.get("chunk_id", c.get("id")): c for c in retrieved_chunks}

    for idx, item_data in enumerate(raw_evidence_items):
        stmt = item_data.get("statement", "").strip()
        if not stmt:
            warnings.append(ValidationWarning(
                code="EMPTY_STATEMENT",
                message=f"Evidence item at index {idx} was skipped because statement was empty.",
                field=f"evidence[{idx}].statement",
                severity="WARNING"
            ))
            continue

        chunk_id = item_data.get("source_chunk_id")
        if not chunk_id or chunk_id not in chunk_map:
            warnings.append(ValidationWarning(
                code="UNVERIFIABLE_CHUNK_SOURCE",
                message=f"Evidence item '{stmt[:40]}...' has invalid or missing chunk_id '{chunk_id}'.",
                field=f"evidence[{idx}].source_chunk_id",
                severity="HIGH"
            ))
            # If not strict match but we have chunks, bind to the best top chunk
            if retrieved_chunks:
                top_c = retrieved_chunks[0]
                chunk_id = top_c.get("chunk_id", top_c.get("id"))
                item_data["source_chunk_id"] = chunk_id
                item_data["source_document_id"] = top_c.get("document_id", "unknown")
                item_data["source_document_name"] = top_c.get("lineage", {}).get("document_name", "Unknown Document")
            else:
                continue

        source_chunk = chunk_map.get(chunk_id, {})
        chunk_content = source_chunk.get("content", "").lower()

        # Numerical sanity check: if current_value is provided, check if the number or integer part is in content
        curr_val = item_data.get("current_value")
        if curr_val is not None:
            val_str = str(curr_val)
            val_int_str = str(int(curr_val)) if isinstance(curr_val, (int, float)) and curr_val.is_integer() else val_str
            if val_str not in chunk_content and val_int_str not in chunk_content and val_str not in stmt.lower():
                warnings.append(ValidationWarning(
                    code="NUMERICAL_DISCREPANCY",
                    message=f"Extracted metric value {curr_val} not explicitly verified in chunk text for '{stmt[:40]}...'.",
                    field=f"evidence[{idx}].current_value",
                    severity="WARNING"
                ))

        try:
            # Ensure lineage / citation is populated
            if not item_data.get("citation"):
                lineage = source_chunk.get("lineage", {})
                doc_name = lineage.get("document_name") or item_data.get("source_document_name") or "Source Document"
                pages = lineage.get("page_numbers", [])
                page_str = f" (Pages: {', '.join(map(str, pages))})" if pages else ""
                item_data["citation"] = f"{doc_name}{page_str}"

            if not item_data.get("page_numbers"):
                item_data["page_numbers"] = source_chunk.get("lineage", {}).get("page_numbers", [])

            if not item_data.get("source_metadata"):
                item_data["source_metadata"] = source_chunk.get("lineage", {}).get("source_metadata", {})

            validated_item = EvidenceItem(**item_data)
            valid_items.append(validated_item)
        except Exception as e:
            logger.warning(f"[VALIDATION] Failed to construct EvidenceItem: {e}")
            warnings.append(ValidationWarning(
                code="SCHEMA_VALIDATION_ERROR",
                message=f"Item {idx} schema validation error: {str(e)}",
                field=f"evidence[{idx}]",
                severity="HIGH"
            ))

    return valid_items, warnings


def validate_signals(
    signals: List[NormalizedSignal],
    evidence_items: List[EvidenceItem]
) -> Tuple[List[NormalizedSignal], List[ValidationWarning]]:
    """
    Validates signals against the list of verified evidence items.
    """
    valid_signals: List[NormalizedSignal] = []
    warnings: List[ValidationWarning] = []

    evidence_id_set = {e.evidence_id for e in evidence_items}

    for idx, sig in enumerate(signals):
        # Verify supporting evidence IDs exist
        verified_evidence_refs = [eid for eid in sig.supporting_evidence_ids if eid in evidence_id_set]
        if not verified_evidence_refs and evidence_items:
            # Attach the first available evidence ID to preserve lineage
            verified_evidence_refs = [evidence_items[0].evidence_id]
            warnings.append(ValidationWarning(
                code="MISSING_EVIDENCE_REFERENCE",
                message=f"Signal '{sig.canonical_name}' had no valid evidence reference. Linked to primary evidence {verified_evidence_refs[0]}.",
                field=f"signals[{idx}].supporting_evidence_ids",
                severity="WARNING"
            ))
        
        # Populate supporting citations from verified evidence items
        citations = []
        for eid in verified_evidence_refs:
            matched_ev = next((e for e in evidence_items if e.evidence_id == eid), None)
            if matched_ev and matched_ev.citation:
                citations.append(matched_ev.citation)
        
        sig.supporting_evidence_ids = verified_evidence_refs
        sig.supporting_citations = list(dict.fromkeys(citations))

        valid_signals.append(sig)

    return valid_signals, warnings
