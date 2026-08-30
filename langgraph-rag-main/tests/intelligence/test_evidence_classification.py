import pytest
from app.schemas.evidence_packet import (
    EvidencePacket,
    EvidenceItemSchema,
    EvidenceSource,
    EvidenceMetrics,
    NormalizedMetric
)
from app.services.document_service import classify_document_source_type
from app.services.evidence_agent import resolve_chunk_source_type


def test_classify_document_source_type():
    class MockDoc:
        def __init__(self, filename, document_type=None, title=None, description=None, topics=None):
            self.filename = filename
            self.document_type = document_type
            self.title = title
            self.description = description
            self.topics = topics or []

    # 1. Explicit canonical document_type
    doc1 = MockDoc("random_file.pdf", document_type="ENGINEERING_METRICS")
    assert classify_document_source_type(doc1) == "ENGINEERING_METRICS"

    # 2. Inferred from customer feedback keywords
    doc2 = MockDoc("customer_feedback_survey_q3.csv")
    assert classify_document_source_type(doc2) == "CUSTOMER_FEEDBACK"

    # 3. Inferred from product metrics keywords
    doc3 = MockDoc("product_telemetry_activation.csv")
    assert classify_document_source_type(doc3) == "PRODUCT_METRICS"

    # 4. Inferred from incident reports
    doc4 = MockDoc("postmortem_sev1_outage.pdf")
    assert classify_document_source_type(doc4) == "INCIDENT_REPORTS"

    # 5. Inferred from team operations
    doc5 = MockDoc("sprint_workload_burnout.csv")
    assert classify_document_source_type(doc5) == "TEAM_OPERATIONS"

    # 6. Inferred from PRD / product plan
    doc6 = MockDoc("FailureOps_PRD_Spec.pdf")
    assert classify_document_source_type(doc6) == "PRODUCT_PLAN"


def test_resolve_chunk_source_type():
    chunk_with_explicit_lineage = {
        "lineage": {
            "document_name": "unknown_file.pdf",
            "source_type": "ENGINEERING_METRICS"
        }
    }
    assert resolve_chunk_source_type(chunk_with_explicit_lineage) == "ENGINEERING_METRICS"

    chunk_with_filename = {
        "lineage": {
            "document_name": "product_metrics.csv"
        }
    }
    assert resolve_chunk_source_type(chunk_with_filename) == "PRODUCT_METRICS"


def test_evidence_packet_schema_contract():
    item = EvidenceItemSchema(
        id="ev_test_1",
        category="TECHNICAL",
        evidence_category="TECHNICAL",
        source_type="ENGINEERING_METRICS",
        evidence_type="METRIC",
        statement="CI/CD deployment failure rate increased to 18%",
        normalized_value=NormalizedMetric(
            metric="deployment_failure_rate",
            before=5.0,
            after=18.0,
            unit="percent",
            direction="INCREASE"
        ),
        source=EvidenceSource(
            document_id="doc_123",
            document_name="engineeringmetrics.csv",
            source_type="ENGINEERING_METRICS",
            location_type="PAGE",
            location_value="1"
        ),
        evidence_confidence=0.92,
        verification_status="VERIFIED"
    )

    packet = EvidencePacket(
        project_id="aurora",
        analysis_id="anl_test_123",
        organization_id="org_aurora_technologies",
        evidence=[item],
        conflicts=[],
        coverage={"TECHNICAL": "FOUND"},
        metrics=EvidenceMetrics(
            total_documents_analyzed=1,
            total_chunks_searched=10,
            total_evidence_extracted=1,
            verified_evidence_count=1,
            rejected_evidence_count=0,
            conflicts_count=0
        )
    )

    dump = packet.model_dump()
    assert dump["evidence"][0]["source_type"] == "ENGINEERING_METRICS"
    assert dump["evidence"][0]["source"]["source_type"] == "ENGINEERING_METRICS"
    assert dump["evidence"][0]["category"] == "TECHNICAL"
    assert dump["evidence"][0]["statement"] == "CI/CD deployment failure rate increased to 18%"
