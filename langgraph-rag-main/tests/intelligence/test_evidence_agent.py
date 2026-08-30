import pytest
from unittest.mock import patch
from app.intelligence.agents.evidence_agent import EvidenceAgent
from app.intelligence.services.validation import validate_evidence_items

def test_evidence_agent_metric_extraction(sample_retrieved_chunks):
    mock_llm_json = """
    {
      "evidence": [
        {
          "statement": "Unresolved bugs increased from 25 to 33 defects.",
          "fact_type": "METRIC",
          "metric_name": "unresolved bugs",
          "previous_value": 25.0,
          "current_value": 33.0,
          "unit": "defects",
          "direction": "INCREASING",
          "source_chunk_index": 1,
          "confidence": 0.95
        }
      ],
      "events": [
        {
          "description": "Release freeze initiated.",
          "event_type": "RELEASE",
          "source_chunk_index": 2,
          "confidence": 0.90
        }
      ],
      "claims": [
        {
          "statement": "Engineering team is confident in release quality.",
          "source_speaker": "Tech Lead",
          "source_chunk_index": 1,
          "confidence": 0.70
        }
      ]
    }
    """

    with patch("app.intelligence.agents.evidence_agent.call_llm", return_value=mock_llm_json):
        evidence, events, claims, warnings = EvidenceAgent.extract_evidence(
            query="Analyze release health",
            retrieved_chunks=sample_retrieved_chunks,
            project_id="proj_101",
            company_id="comp_101"
        )

        assert len(evidence) == 1
        assert evidence[0]["metric_name"] == "unresolved bugs"
        assert evidence[0]["current_value"] == 33.0
        assert evidence[0]["previous_value"] == 25.0
        assert evidence[0]["source_document_id"] == "doc_jira_001"
        assert evidence[0]["source_chunk_id"] == "chunk_001"

        assert len(events) == 1
        assert events[0]["event_type"] == "RELEASE"

        assert len(claims) == 1
        assert claims[0]["source_speaker_or_entity"] == "Tech Lead"
        assert len(warnings) == 0

def test_evidence_agent_empty_chunks():
    evidence, events, claims, warnings = EvidenceAgent.extract_evidence(
        query="Empty query",
        retrieved_chunks=[],
        project_id="proj_101"
    )
    assert evidence == []
    assert events == []
    assert claims == []
    assert warnings == []

def test_evidence_agent_malformed_llm_recovery(sample_retrieved_chunks):
    with patch("app.intelligence.agents.evidence_agent.call_llm", return_value="INVALID JSON NOT OBJECT"):
        evidence, events, claims, warnings = EvidenceAgent.extract_evidence(
            query="Fault tolerance test",
            retrieved_chunks=sample_retrieved_chunks,
            project_id="proj_101"
        )
        assert evidence == []
        assert events == []
        assert claims == []
        assert any(w.get("code") == "EVIDENCE_AGENT_PARSE_ERROR" for w in warnings)

def test_evidence_validation_provenance_binding(sample_retrieved_chunks):
    raw_items = [
        {
            "evidence_id": "ev_valid",
            "project_id": "proj_101",
            "statement": "Unresolved bugs increased from 25 to 33 defects (+32%).",
            "fact_type": "METRIC",
            "metric_name": "unresolved bugs",
            "current_value": 33.0,
            "previous_value": 25.0,
            "source_document_id": "doc_jira_001",
            "source_document_name": "Jira_Sprint_Report.pdf",
            "source_chunk_id": "chunk_001",
            "citation": "Jira_Sprint_Report.pdf (Pages: 1)",
            "extraction_confidence": 0.95
        },
        {
            "evidence_id": "ev_unverified_number",
            "project_id": "proj_101",
            "statement": "Customer satisfaction dropped to 4.2.",
            "fact_type": "METRIC",
            "metric_name": "csat",
            "current_value": 999.0, # 999 is not in chunk text
            "source_document_id": "doc_jira_001",
            "source_document_name": "Jira_Sprint_Report.pdf",
            "source_chunk_id": "chunk_001",
            "citation": "Jira_Sprint_Report.pdf (Pages: 1)",
            "extraction_confidence": 0.80
        }
    ]

    validated_items, warnings = validate_evidence_items(raw_items, sample_retrieved_chunks)
    assert len(validated_items) == 2
    assert any(w.code == "NUMERICAL_DISCREPANCY" for w in warnings)
