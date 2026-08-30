import pytest
from unittest.mock import patch, MagicMock
from app.intelligence.graph.workflow import get_compiled_graph
from app.intelligence.graph.state import FailureOpsGraphState
from app.intelligence.schemas.signals import SignalSeverity

def test_failureops_e2e_multi_source_acceptance():
    """
    End-to-End Acceptance Test:
    Ingests multi-source project data (Jira + CI + GitHub + Team Report)
    and verifies full pipeline synthesis down to validated signals and relationships.
    """
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = [
        ("doc_jira",), ("doc_ci",), ("doc_github",), ("doc_team",)
    ]

    mock_rag_chunks = [
        {
            "chunk_id": "chunk_jira_1",
            "document_id": "doc_jira",
            "document_name": "Jira_Backlog.pdf",
            "project_id": "proj_phoenix",
            "content": "Jira Report: Unresolved bugs increased from 25 to 33 defects (+32%).",
            "lineage": {"document_name": "Jira_Backlog.pdf", "page_numbers": [1], "page_ids": ["p1"], "block_ids": ["b1"], "source_metadata": {}},
            "citation": "Jira_Backlog.pdf (Pages: 1)",
            "rerank_score": 8.2
        },
        {
            "chunk_id": "chunk_ci_1",
            "document_id": "doc_ci",
            "document_name": "CI_Pipeline.docx",
            "project_id": "proj_phoenix",
            "content": "CI Report: Build failures jumped from 20 to 29 failures (+45%).",
            "lineage": {"document_name": "CI_Pipeline.docx", "page_numbers": [1], "page_ids": ["p2"], "block_ids": ["b2"], "source_metadata": {}},
            "citation": "CI_Pipeline.docx (Pages: 1)",
            "rerank_score": 7.9
        },
        {
            "chunk_id": "chunk_github_1",
            "document_id": "doc_github",
            "document_name": "GitHub_Velocity.xlsx",
            "project_id": "proj_phoenix",
            "content": "GitHub Metrics: Code review activity dropped from 100 to 70 reviews (-30%).",
            "lineage": {"document_name": "GitHub_Velocity.xlsx", "page_numbers": [1], "page_ids": ["p3"], "block_ids": ["b3"], "source_metadata": {}},
            "citation": "GitHub_Velocity.xlsx (Pages: 1)",
            "rerank_score": 7.5
        },
        {
            "chunk_id": "chunk_team_1",
            "document_id": "doc_team",
            "document_name": "Team_Status.pdf",
            "project_id": "proj_phoenix",
            "content": "Team Report: Developer overtime hours increased from 50 to 70 hours (+40%).",
            "lineage": {"document_name": "Team_Status.pdf", "page_numbers": [2], "page_ids": ["p4"], "block_ids": ["b4"], "source_metadata": {}},
            "citation": "Team_Status.pdf (Pages: 2)",
            "rerank_score": 7.1
        }
    ]

    mock_evidence_llm_json = """
    {
      "evidence": [
        {
          "statement": "Unresolved bugs increased from 25 to 33 defects (+32%).",
          "fact_type": "METRIC",
          "metric_name": "unresolved bugs",
          "previous_value": 25.0,
          "current_value": 33.0,
          "unit": "defects",
          "direction": "INCREASING",
          "source_chunk_index": 1,
          "confidence": 0.96
        },
        {
          "statement": "Build failures jumped from 20 to 29 (+45%).",
          "fact_type": "METRIC",
          "metric_name": "build failures",
          "previous_value": 20.0,
          "current_value": 29.0,
          "unit": "failures",
          "direction": "INCREASING",
          "source_chunk_index": 2,
          "confidence": 0.94
        },
        {
          "statement": "Code review activity dropped from 100 to 70 reviews (-30%).",
          "fact_type": "METRIC",
          "metric_name": "code review activity",
          "previous_value": 100.0,
          "current_value": 70.0,
          "unit": "reviews",
          "direction": "DECREASING",
          "source_chunk_index": 3,
          "confidence": 0.92
        },
        {
          "statement": "Developer overtime hours increased from 50 to 70 hours (+40%).",
          "fact_type": "METRIC",
          "metric_name": "developer overtime",
          "previous_value": 50.0,
          "current_value": 70.0,
          "unit": "hours",
          "direction": "INCREASING",
          "source_chunk_index": 4,
          "confidence": 0.95
        }
      ],
      "events": [],
      "claims": []
    }
    """

    initial_state: FailureOpsGraphState = {
        "request_id": "req_e2e_acceptance",
        "analysis_id": "analysis_phoenix_q3",
        "project_id": "proj_phoenix",
        "company_id": "comp_titan",
        "query": "Identify operational failure risks in Phoenix release cycle",
        "document_ids": ["doc_jira", "doc_ci", "doc_github", "doc_team"],
        "options": {},
        "db": mock_db,
        "retrieved_chunks": [],
        "raw_evidence": [],
        "raw_events": [],
        "raw_claims": [],
        "validated_evidence": [],
        "validated_events": [],
        "validated_claims": [],
        "signals": [],
        "relationships": [],
        "citations": [],
        "warnings": [],
        "node_latencies": {},
        "node_path": []
    }

    with patch("app.intelligence.rag.adapter.RAGAdapter.retrieve", return_value=(mock_rag_chunks, {"retrieval": 0.15})), \
         patch("app.intelligence.agents.evidence_agent.call_llm", return_value=mock_evidence_llm_json):
        
        graph = get_compiled_graph()
        result_state = graph.invoke(initial_state)

        res = result_state["final_response"]
        assert res.status == "completed"
        assert res.project_id == "proj_phoenix"
        assert res.company_id == "comp_titan"

        # 1. Verify Evidence Items & Provenance
        assert len(res.evidence) == 4
        ev_statements = [e.statement for e in res.evidence]
        assert any("Unresolved bugs" in s for s in ev_statements)
        assert any("Build failures" in s for s in ev_statements)
        assert any("Code review" in s for s in ev_statements)
        assert any("Developer overtime" in s for s in ev_statements)

        # 2. Verify Canonical Signals
        signal_map = {s.canonical_name: s for s in res.signals}
        assert "UNRESOLVED_BUGS" in signal_map
        assert "CI_FAILURES" in signal_map
        assert "CODE_REVIEW_VELOCITY" in signal_map
        assert "DEVELOPER_OVERTIME" in signal_map

        # Verify Deterministic Math on Signals
        assert signal_map["UNRESOLVED_BUGS"].percentage_change == 32.0
        assert 45.0 <= signal_map["UNRESOLVED_BUGS"].risk_score <= 55.0
        assert signal_map["UNRESOLVED_BUGS"].severity == SignalSeverity.MEDIUM

        assert signal_map["CI_FAILURES"].percentage_change == 45.0
        assert 60.0 <= signal_map["CI_FAILURES"].risk_score <= 70.0
        assert signal_map["CI_FAILURES"].severity == SignalSeverity.HIGH

        assert signal_map["CODE_REVIEW_VELOCITY"].percentage_change == -30.0
        assert signal_map["DEVELOPER_OVERTIME"].percentage_change == 40.0
        assert signal_map["DEVELOPER_OVERTIME"].risk_score >= 80.0
        assert signal_map["DEVELOPER_OVERTIME"].severity == SignalSeverity.CRITICAL

        # Composite Signal
        assert "TECHNICAL_RELIABILITY_STRESS" in signal_map
        composite_sig = signal_map["TECHNICAL_RELIABILITY_STRESS"]
        assert len(composite_sig.supporting_evidence_ids) >= 2

        # Candidate Relationships Grounded in Evidence
        rel_signatures = {(r.source_signal_name, r.target_signal_name) for r in res.relationships}
        assert ("UNRESOLVED_BUGS", "CI_FAILURES") in rel_signatures
        assert ("DEVELOPER_OVERTIME", "CODE_REVIEW_VELOCITY") in rel_signatures

        # Provenance Lineage: all citations are present
        assert len(res.citations) == 4
        assert res.confidence_summary.overall_confidence > 0.85
