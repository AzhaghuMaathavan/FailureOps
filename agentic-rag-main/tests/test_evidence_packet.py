import pytest
from app.services.evidence_agent import run_evidence_agent
from app.schemas.evidence_packet import EvidencePacket

def test_run_evidence_agent_failing_project():
    mock_dimension_chunks = {
        "ADOPTION": [
            {
                "chunk_id": "chk_adp_1",
                "document_id": "doc_analytics",
                "content": "Document: Analytics Report\nActivation rate declined from 52% to 33% over the last two quarters.",
                "lineage": {"document_name": "Analytics Report.pdf", "page_numbers": [12]},
                "rerank_score": 8.5
            }
        ],
        "TECHNICAL": [
            {
                "chunk_id": "chk_tech_1",
                "document_id": "doc_incident",
                "content": "Document: Incident Report\nCI/CD build failure rate surged to 28.6% and P1/P2 defect backlog increased by 311%.",
                "lineage": {"document_name": "Incident Report.pdf", "page_numbers": [4]},
                "rerank_score": 9.1
            }
        ],
        "OPERATIONAL": [
            {
                "chunk_id": "chk_ops_1",
                "document_id": "doc_sprint",
                "content": "Document: Sprint Velocity\nEngineering team is working 58 hours per week with PR review latency averaging 3.4 days.",
                "lineage": {"document_name": "Meeting Notes.docx", "source_metadata": {"section": ["Team Capacity"]}},
                "rerank_score": 7.8
            }
        ],
        "FINANCIAL": [] # Missing dimension
    }

    packet = run_evidence_agent(
        organization_id="org_aurora_technologies",
        project_id="aurora",
        analysis_id="anl_test_001",
        dimension_chunks_map=mock_dimension_chunks,
        total_docs_count=3,
        processing_time=1.25
    )

    assert isinstance(packet, EvidencePacket)
    assert packet.project_id == "aurora"
    assert packet.organization_id == "org_aurora_technologies"
    assert len(packet.evidence) >= 3
    assert packet.coverage.get("ADOPTION") == "FOUND"
    assert packet.coverage.get("TECHNICAL") == "FOUND"
    assert packet.coverage.get("OPERATIONAL") == "FOUND"
    assert packet.coverage.get("FINANCIAL") == "NO_EVIDENCE_FOUND"
    assert packet.metrics.verified_evidence_count >= 3

def test_run_evidence_agent_positive_project():
    mock_dimension_chunks = {
        "ADOPTION": [
            {
                "chunk_id": "chk_pos_1",
                "document_id": "doc_pos_analytics",
                "content": "Document: Pulse Growth Report\nUser activation increased from 52% to 71% and retention rose to 79%.",
                "lineage": {"document_name": "Pulse Growth Report.pdf", "page_numbers": [3]},
                "rerank_score": 8.9
            }
        ],
        "TECHNICAL": [
            {
                "chunk_id": "chk_pos_2",
                "document_id": "doc_pos_incident",
                "content": "Document: Pulse Reliability\nProduction incidents decreased by 40% following architectural refactoring.",
                "lineage": {"document_name": "Pulse Reliability.pdf", "page_numbers": [1]},
                "rerank_score": 9.2
            }
        ]
    }

    packet = run_evidence_agent(
        organization_id="org_pulse_health",
        project_id="pulseflow",
        analysis_id="anl_pos_001",
        dimension_chunks_map=mock_dimension_chunks,
        total_docs_count=2,
        processing_time=0.95
    )

    assert isinstance(packet, EvidencePacket)
    assert packet.project_id == "pulseflow"
    assert len(packet.evidence) >= 2
    # Verify positive facts are extracted without claiming failure
    statements = [e.statement.lower() for e in packet.evidence]
    assert any("71%" in s or "activation" in s for s in statements)
    assert any("40%" in s or "incident" in s for s in statements)
