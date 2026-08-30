import pytest
from unittest.mock import patch, MagicMock
from app.intelligence.graph.workflow import get_compiled_graph
from app.intelligence.graph.state import FailureOpsGraphState

def test_langgraph_full_workflow_execution(sample_retrieved_chunks):
    mock_db = MagicMock()
    mock_db.query.return_value.filter.return_value.all.return_value = [("doc_jira_001",), ("doc_ci_002",)]

    mock_llm_json = """
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
          "confidence": 0.95
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
          "confidence": 0.92
        }
      ],
      "events": [],
      "claims": []
    }
    """

    initial_state: FailureOpsGraphState = {
        "request_id": "req_1",
        "analysis_id": "analysis_test_101",
        "project_id": "proj_failureops_101",
        "company_id": "comp_alpha",
        "query": "Assess release blockers and CI stability",
        "document_ids": ["doc_jira_001", "doc_ci_002"],
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

    with patch("app.intelligence.rag.adapter.RAGAdapter.retrieve", return_value=(sample_retrieved_chunks, {"retrieval": 0.1})), \
         patch("app.intelligence.agents.evidence_agent.call_llm", return_value=mock_llm_json):
        
        graph = get_compiled_graph()
        result_state = graph.invoke(initial_state)

        # 1. Verify Node Path
        expected_nodes = [
            "validate_request",
            "retrieve_evidence",
            "evidence_agent",
            "validate_evidence",
            "signal_agent",
            "validate_signals",
            "finalize_output"
        ]
        assert result_state["node_path"] == expected_nodes

        # 2. Verify Final Structured Response
        final_resp = result_state["final_response"]
        assert final_resp is not None
        assert final_resp.analysis_id == "analysis_test_101"
        assert final_resp.project_id == "proj_failureops_101"
        assert final_resp.status == "completed"
        assert len(final_resp.evidence) == 2
        assert len(final_resp.signals) >= 2
        assert len(final_resp.citations) == 2
        assert final_resp.confidence_summary.overall_confidence > 0.8

def test_langgraph_empty_retrieval_safeguard():
    mock_db = MagicMock()
    initial_state: FailureOpsGraphState = {
        "request_id": "req_2",
        "analysis_id": "analysis_empty",
        "project_id": "proj_empty",
        "query": "Query with no matches",
        "options": {},
        "db": mock_db,
        "node_latencies": {},
        "node_path": []
    }

    with patch("app.intelligence.rag.adapter.RAGAdapter.retrieve", return_value=([], {"retrieval": 0.01})):
        graph = get_compiled_graph()
        result_state = graph.invoke(initial_state)

        final_resp = result_state["final_response"]
        assert final_resp.status == "insufficient_evidence"
        assert len(final_resp.evidence) == 0
        assert len(final_resp.signals) == 0

def test_langgraph_validation_failure_shortcircuit():
    initial_state: FailureOpsGraphState = {
        "request_id": "req_3",
        "analysis_id": "analysis_invalid",
        "project_id": "", # Missing required project_id
        "query": "Some query",
        "node_latencies": {},
        "node_path": []
    }

    graph = get_compiled_graph()
    result_state = graph.invoke(initial_state)

    final_resp = result_state["final_response"]
    assert final_resp.status == "failed"
    assert "project_id" in final_resp.error_message.lower()
