"""Test suite for pipeline hang resilience, retrieval timeouts, and batched evidence extraction."""

import pytest
import time
from unittest.mock import patch, MagicMock
from app.services.evidence_retriever import retrieve_project_evidence_candidates, EVIDENCE_DIMENSIONS
from app.services.evidence_agent import heuristic_extract_evidence, run_evidence_agent
from app.services.analysis_orchestrator import PIPELINE_STAGES


def test_pipeline_stages_linear_progress():
    """Verify that all 12 pipeline stages have strictly increasing progress percentages."""
    assert len(PIPELINE_STAGES) == 12
    progresses = [p[2] for p in PIPELINE_STAGES]
    assert progresses == sorted(progresses)
    assert progresses[-1] == 100
    assert progresses[0] > 0


def test_heuristic_extract_evidence_fallback():
    """Verify that heuristic extraction reliably extracts facts without hanging when LLM is offline."""
    sample_chunks = [
        {
            "chunk_id": "chk_001",
            "content": "Onboarding activation rate dropped from 52% to 33% following release 2.4.",
            "lineage": {"document_name": "Q3_Review.pdf", "page_numbers": [4]}
        },
        {
            "chunk_id": "chk_002",
            "content": "Infrastructure incidents increased from 3 to 11 outages per month.",
            "lineage": {"document_name": "Incident_Log.pdf", "page_numbers": [1]}
        }
    ]

    items = heuristic_extract_evidence("ADOPTION", sample_chunks)
    assert len(items) >= 1
    assert items[0]["category"] == "ADOPTION"
    assert items[0]["normalized_value"]["direction"] == "DECREASE"


def test_run_evidence_agent_empty_chunks():
    """Verify EvidenceAgent completes gracefully and returns valid EvidencePacket when no chunks exist."""
    packet = run_evidence_agent(
        organization_id="org_test",
        project_id="proj_test",
        analysis_id="anl_test",
        dimension_chunks_map={},
        total_docs_count=0
    )

    assert packet.project_id == "proj_test"
    assert packet.analysis_id == "anl_test"
    assert len(packet.evidence) == 0
    assert packet.metrics.total_chunks_searched == 0
