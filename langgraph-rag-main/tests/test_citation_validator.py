import pytest
from app.services.citation_validator import (
    validate_evidence_citation,
    consolidate_duplicates_and_conflicts
)

def test_citation_validator_supported():
    chunk_content = "Document: Analytics Report\nIn Q3, the user activation rate declined sharply from 52% to 33% following the mandatory bank KYC gate."
    statement = "Activation rate declined from 52% to 33%."
    
    is_valid, confidence, reason = validate_evidence_citation(
        statement=statement,
        chunk_content=chunk_content,
        rerank_score=8.5,
        normalized_val={"metric": "activation_rate", "before": 52.0, "after": 33.0}
    )
    
    assert is_valid is True
    assert confidence >= 0.70
    assert reason == "SUPPORTED"

def test_citation_validator_unsupported_number_rejected():
    chunk_content = "In Q3, the team added two new software engineers to support frontend features."
    statement = "Customer churn surged to 89% in September."
    
    is_valid, confidence, reason = validate_evidence_citation(
        statement=statement,
        chunk_content=chunk_content,
        rerank_score=2.0
    )
    
    assert is_valid is False
    assert reason in ["NUMERICAL_MISMATCH", "INSUFFICIENT_KEYWORD_GROUNDING"]

def test_duplicate_consolidation_and_contradiction():
    raw_items = [
        {
            "category": "ADOPTION",
            "evidence_type": "METRIC",
            "statement": "Activation rate is 33%.",
            "normalized_value": {"metric": "activation_rate", "before": 52.0, "after": 33.0, "unit": "percent"},
            "source": {"document_id": "doc_1", "document_name": "Analytics.pdf", "location_type": "PAGE", "location_value": "12"},
            "supporting_chunk_ids": ["chk_1"],
            "evidence_confidence": 0.95,
            "verification_status": "VERIFIED"
        },
        {
            "category": "ADOPTION",
            "evidence_type": "METRIC",
            "statement": "Current activation rate is roughly 33%.",
            "normalized_value": {"metric": "activation_rate", "before": 52.0, "after": 33.0, "unit": "percent"},
            "source": {"document_id": "doc_2", "document_name": "Notes.docx", "location_type": "SECTION", "location_value": "Review"},
            "supporting_chunk_ids": ["chk_2"],
            "evidence_confidence": 0.90,
            "verification_status": "VERIFIED"
        },
        # Contradictory item with different 'after' value
        {
            "category": "ADOPTION",
            "evidence_type": "METRIC",
            "statement": "Executive summary states activation reached 47%.",
            "normalized_value": {"metric": "activation_rate", "before": 52.0, "after": 47.0, "unit": "percent"},
            "source": {"document_id": "doc_3", "document_name": "Exec.pdf", "location_type": "PAGE", "location_value": "2"},
            "supporting_chunk_ids": ["chk_3"],
            "evidence_confidence": 0.88,
            "verification_status": "VERIFIED"
        }
    ]

    consolidated, conflicts = consolidate_duplicates_and_conflicts(raw_items)

    assert len(consolidated) == 1
    assert len(consolidated[0].supporting_sources) == 3
    assert len(consolidated[0].supporting_chunk_ids) == 3
    # Contradiction between 33% and 47% must be flagged
    assert len(conflicts) == 1
    assert conflicts[0].topic == "activation_rate"
    assert len(conflicts[0].claims) == 3
