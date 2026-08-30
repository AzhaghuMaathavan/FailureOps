import pytest
from app.services.agent_service import extract_json
from app.intelligence.agents.evidence_agent import EvidenceAgent, format_chunk_content
from app.intelligence.graph.workflow import get_compiled_graph
from app.intelligence.graph.state import FailureOpsGraphState
from app.intelligence.schemas.events import EventItem, EventType
from app.intelligence.schemas.claims import ClaimItem
from app.intelligence.schemas.analysis import AnalysisResponse

def test_extract_json_fenced_and_malformed_all_three_sections():
    raw_fenced = """```json
{
  "evidence": [
    {"statement": "Error rate is 2.5%", "fact_type": "METRIC", "metric_name": "error_rate", "current_value": 2.5, "source_chunk_index": 1, "confidence": 0.95}
  ],
  "events": [
    {"description": "Deployment v2.4 completed on July 10", "event_type": "DEPLOYMENT", "source_chunk_index": 1, "confidence": 0.90}
  ],
  "claims": [
    {"statement": "Customers find the energy dashboard intuitive", "source_speaker": "Facility Manager", "source_chunk_index": 1, "confidence": 0.85}
  ],
}
```"""
    parsed = extract_json(raw_fenced)
    assert len(parsed["evidence"]) == 1
    assert len(parsed["events"]) == 1
    assert len(parsed["claims"]) == 1
    assert parsed["events"][0]["event_type"] == "DEPLOYMENT"
    assert parsed["claims"][0]["source_speaker"] == "Facility Manager"

def test_extract_json_truncated_claims_recovery():
    # Truncated while generating claims array
    raw_truncated = """{
  "evidence": [
    {"statement": "Latency is 350ms", "fact_type": "METRIC", "metric_name": "latency", "current_value": 350.0, "source_chunk_index": 1, "confidence": 0.95}
  ],
  "events": [
    {"description": "Major network outage on August 3", "event_type": "INCIDENT", "source_chunk_index": 1, "confidence": 0.95}
  ],
  "claims": [
    {"statement": "The response time is noticeably slower", "source_speaker": "Energy Manager", "source_chunk_index": 1, "confidence": 0.85},
    {"statement": "Data quality issues are increasing", "source_speaker": "Analyst", "source_chunk_index": 1"""
    
    parsed = extract_json(raw_truncated)
    assert len(parsed["evidence"]) == 1
    assert len(parsed["events"]) == 1
    assert len(parsed["claims"]) >= 1
    assert parsed["events"][0]["description"] == "Major network outage on August 3"
    assert parsed["claims"][0]["statement"] == "The response time is noticeably slower"

def test_extract_json_text_fallback_events_and_claims():
    text_fallback = """
Evidence:
statement: Server CPU hit 95%
metric_name: cpu_usage
current_value: 95.0
source_chunk_index: 1

Event 1:
description: Release 3.0 delayed by two weeks due to testing backlog
event_type: DEPLOYMENT
source_chunk_index: 1

Claim 1:
statement: The team does not have adequate automated test coverage
speaker: Lead Engineer
source_chunk_index: 1
"""
    parsed = extract_json(text_fallback)
    assert len(parsed["evidence"]) == 1
    assert len(parsed["events"]) == 1
    assert len(parsed["claims"]) == 1
    assert parsed["events"][0]["event_type"] == "DEPLOYMENT"
    assert parsed["claims"][0]["source_speaker"] == "Lead Engineer"

def test_format_chunk_content_does_not_compress_feedback():
    feedback_content = """feedback_id: GP001 | feedback: Incomplete readings are confusing our operators. | customer_type: energy_manager
feedback_id: GP002 | feedback: Anomaly detection is very helpful. | customer_type: sustainability_manager
feedback_id: GP003 | feedback: Reports take too long to generate. | customer_type: facility_manager
feedback_id: GP004 | feedback: Battery schedules need manual adjustment. | customer_type: energy_manager
feedback_id: GP005 | feedback: Meter sync failed yesterday. | customer_type: facility_manager"""
    
    res = format_chunk_content(feedback_content)
    # Must NOT compress into [Baseline Period] because it contains feedback text
    assert "[Baseline Period]" not in res
    assert "Incomplete readings are confusing our operators." in res
    assert "Meter sync failed yesterday." in res

def test_langgraph_state_preserves_events_and_claims(monkeypatch):
    # Mock EvidenceAgent to return verified events and claims alongside metrics
    def mock_extract_evidence(query, retrieved_chunks, project_id, company_id=None):
        raw_ev = [{
            "evidence_id": "ev_1",
            "project_id": project_id,
            "statement": "Open bugs reached 30",
            "fact_type": "METRIC",
            "metric_name": "open_bugs",
            "current_value": 30.0,
            "baseline_value": 18.0,
            "source_document_id": "doc_1",
            "source_document_name": "Doc1.pdf",
            "source_chunk_id": "chunk_1",
            "citation": "Doc1.pdf Page 1",
            "extraction_confidence": 0.95
        }]
        raw_events = [{
            "event_id": "evt_1",
            "project_id": project_id,
            "description": "Production release delayed by 2 weeks",
            "event_type": "DEPLOYMENT",
            "timestamp": "2026-08-10",
            "source_document_id": "doc_1",
            "source_chunk_id": "chunk_1",
            "citation": "Doc1.pdf Page 1",
            "confidence": 0.90
        }]
        raw_claims = [{
            "claim_id": "clm_1",
            "project_id": project_id,
            "statement": "Testing capacity is insufficient for current workload",
            "source_speaker_or_entity": "Engineering Lead",
            "source_document_id": "doc_1",
            "source_chunk_id": "chunk_1",
            "citation": "Doc1.pdf Page 1",
            "confidence": 0.85
        }]
        return raw_ev, raw_events, raw_claims, []

    monkeypatch.setattr(EvidenceAgent, "extract_evidence", mock_extract_evidence)

    from unittest.mock import MagicMock, patch
    mock_db = MagicMock()
    sample_chunks = [{
        "chunk_id": "chunk_1",
        "document_id": "doc_1",
        "document_name": "Doc1.pdf",
        "citation": "Doc1.pdf Page 1",
        "content": "Production release delayed by 2 weeks. Testing capacity is insufficient."
    }]

    state: FailureOpsGraphState = {
        "request_id": "req_ec_test",
        "analysis_id": "analysis_ec_test",
        "project_id": "proj_ec_test",
        "company_id": None,
        "query": "Analyze risks, events, and claims",
        "document_ids": None,
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

    with patch("app.intelligence.rag.adapter.RAGAdapter.retrieve", return_value=(sample_chunks, {"retrieval": 0.05})):
        graph = get_compiled_graph()
        final_state = graph.invoke(state)
        res: AnalysisResponse = final_state["final_response"]

    assert res.status == "completed"
    assert len(res.evidence) == 1
    assert len(res.events) == 1
    assert len(res.claims) == 1
    assert len(res.signals) >= 1

    # Check event and claim fidelity
    assert res.events[0].description == "Production release delayed by 2 weeks"
    assert res.events[0].event_type == EventType.DEPLOYMENT
    assert res.events[0].citation == "Doc1.pdf Page 1"

    assert res.claims[0].statement == "Testing capacity is insufficient for current workload"
    assert res.claims[0].source_speaker_or_entity == "Engineering Lead"
    assert res.claims[0].citation == "Doc1.pdf Page 1"

def test_metric_only_source_returns_zero_events_without_fabrication(monkeypatch):
    # Pure metric CSV without events or claims
    def mock_extract_evidence(query, retrieved_chunks, project_id, company_id=None):
        raw_ev = [{
            "evidence_id": "ev_metric_only",
            "project_id": project_id,
            "statement": "CPU usage is 85%",
            "fact_type": "METRIC",
            "metric_name": "cpu_usage",
            "current_value": 85.0,
            "baseline_value": 40.0,
            "source_document_id": "doc_telemetry",
            "source_document_name": "telemetry.csv",
            "source_chunk_id": "chunk_telemetry_1",
            "citation": "telemetry.csv",
            "extraction_confidence": 0.98
        }]
        return raw_ev, [], [], []

    monkeypatch.setattr(EvidenceAgent, "extract_evidence", mock_extract_evidence)

    from unittest.mock import MagicMock, patch
    mock_db = MagicMock()
    sample_chunks = [{
        "chunk_id": "chunk_telemetry_1",
        "document_id": "doc_telemetry",
        "document_name": "telemetry.csv",
        "citation": "telemetry.csv",
        "content": "timestamp: 2026-08-01 | cpu_usage: 85"
    }]

    state: FailureOpsGraphState = {
        "request_id": "req_no_fab",
        "analysis_id": "analysis_no_fab",
        "project_id": "proj_no_fab",
        "company_id": None,
        "query": "Analyze telemetry CPU usage",
        "document_ids": None,
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

    with patch("app.intelligence.rag.adapter.RAGAdapter.retrieve", return_value=(sample_chunks, {"retrieval": 0.05})):
        graph = get_compiled_graph()
        final_state = graph.invoke(state)
        res: AnalysisResponse = final_state["final_response"]

    assert res.status == "completed"
    assert len(res.evidence) == 1
    assert len(res.signals) >= 1
    assert len(res.events) == 0 # Genuine zero, no fabrication
    assert len(res.claims) == 0 # Genuine zero, no fabrication

def test_event_and_claim_provenance_binding_with_pages():
    chunk = {
        "chunk_id": "chunk_doc_p3",
        "document_id": "doc_narrative_1",
        "document_name": "grid pulse.pdf",
        "citation": "grid pulse.pdf (Page: 3)",
        "content": "On June 12, the solar inverter grid sync failed causing an unexpected outage.",
        "lineage": {
            "page_numbers": [3],
            "source_metadata": {"author": "Reliability Team"}
        }
    }

    # Mock extract_evidence returning raw LLM objects
    raw_llm_json = """{
      "evidence": [],
      "events": [
        {"description": "Solar inverter grid sync failed causing an unexpected outage", "event_type": "INCIDENT", "timestamp": "June 12", "source_chunk_index": 1, "confidence": 0.95}
      ],
      "claims": [
        {"statement": "Grid inverter synchronization protocols are outdated", "source_speaker": "Lead Inverter Engineer", "source_chunk_index": 1, "confidence": 0.90}
      ]
    }"""

    parsed = extract_json(raw_llm_json)
    assert len(parsed["events"]) == 1
    assert len(parsed["claims"]) == 1

    # Simulate EvidenceAgent post-processing
    from app.intelligence.agents.evidence_agent import EvidenceAgent
    from unittest.mock import patch

    with patch("app.intelligence.agents.evidence_agent.call_llm", return_value=raw_llm_json):
        ev_items, events, claims, warnings = EvidenceAgent.extract_evidence(
            query="Analyze incidents and claims",
            retrieved_chunks=[chunk],
            project_id="proj_prov_test"
        )

    assert len(events) == 1
    evt = events[0]
    assert evt["source_document_id"] == "doc_narrative_1"
    assert evt["source_document_name"] == "grid pulse.pdf"
    assert evt["source_chunk_id"] == "chunk_doc_p3"
    assert evt["supporting_chunk_ids"] == ["chunk_doc_p3"]
    assert evt["location_type"] == "page"
    assert evt["location_value"] == "Page 3"
    assert evt["page_numbers"] == [3]
    assert evt["citation"] == "grid pulse.pdf (Page: 3)"
    assert evt["confidence"] == 0.95

    assert len(claims) == 1
    clm = claims[0]
    assert clm["source_document_id"] == "doc_narrative_1"
    assert clm["source_document_name"] == "grid pulse.pdf"
    assert clm["source_chunk_id"] == "chunk_doc_p3"
    assert clm["supporting_chunk_ids"] == ["chunk_doc_p3"]
    assert clm["location_type"] == "page"
    assert clm["location_value"] == "Page 3"
    assert clm["page_numbers"] == [3]
    assert clm["citation"] == "grid pulse.pdf (Page: 3)"
    assert clm["source_speaker_or_entity"] == "Lead Inverter Engineer"
    assert clm["confidence"] == 0.90
