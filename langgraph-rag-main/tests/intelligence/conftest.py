import pytest
from unittest.mock import MagicMock
from app.intelligence.schemas.evidence import EvidenceItem, FactType, Direction
from app.intelligence.schemas.signals import NormalizedSignal, SignalCategory, SignalSeverity

@pytest.fixture
def sample_retrieved_chunks():
    return [
        {
            "chunk_id": "chunk_001",
            "document_id": "doc_jira_001",
            "document_name": "Jira_Sprint_Report.pdf",
            "project_id": "proj_failureops_101",
            "company_id": "comp_alpha",
            "chunk_index": 1,
            "content": "Jira Sprint 42: Unresolved bugs increased from 25 to 33 defects (+32%).",
            "headers": {"title": "Sprint 42", "section_path": ["Defects"]},
            "lineage": {
                "document_name": "Jira_Sprint_Report.pdf",
                "page_ids": ["page_1_uuid"],
                "page_numbers": [1],
                "block_ids": ["block_1_uuid"],
                "source_metadata": {"section": ["Defects"]}
            },
            "citation": "Jira_Sprint_Report.pdf (Pages: 1)",
            "vector_distance": 0.12,
            "bm25_score": 0.85,
            "rerank_score": 7.45,
            "rank": 1
        },
        {
            "chunk_id": "chunk_002",
            "document_id": "doc_ci_002",
            "document_name": "CI_Pipeline_Metrics.docx",
            "project_id": "proj_failureops_101",
            "company_id": "comp_alpha",
            "chunk_index": 2,
            "content": "CI Infrastructure: Build failures jumped from 20 to 29 (+45%) during the release freeze.",
            "headers": {"title": "CI Report", "section_path": ["Failures"]},
            "lineage": {
                "document_name": "CI_Pipeline_Metrics.docx",
                "page_ids": ["page_2_uuid"],
                "page_numbers": [2],
                "block_ids": ["block_2_uuid"],
                "source_metadata": {"section": ["Failures"]}
            },
            "citation": "CI_Pipeline_Metrics.docx (Pages: 2)",
            "vector_distance": 0.15,
            "bm25_score": 0.72,
            "rerank_score": 6.80,
            "rank": 2
        }
    ]

@pytest.fixture
def sample_evidence_items():
    return [
        EvidenceItem(
            evidence_id="ev_001",
            project_id="proj_failureops_101",
            company_id="comp_alpha",
            statement="Unresolved bugs increased from 25 to 33 defects (+32%).",
            fact_type=FactType.METRIC,
            metric_name="unresolved bugs",
            previous_value=25.0,
            current_value=33.0,
            unit="defects",
            direction=Direction.INCREASING,
            source_document_id="doc_jira_001",
            source_document_name="Jira_Sprint_Report.pdf",
            source_chunk_id="chunk_001",
            citation="Jira_Sprint_Report.pdf (Pages: 1)",
            extraction_confidence=0.95
        ),
        EvidenceItem(
            evidence_id="ev_002",
            project_id="proj_failureops_101",
            company_id="comp_alpha",
            statement="Build failures jumped from 20 to 29 (+45%).",
            fact_type=FactType.METRIC,
            metric_name="build failures",
            previous_value=20.0,
            current_value=29.0,
            unit="failures",
            direction=Direction.INCREASING,
            source_document_id="doc_ci_002",
            source_document_name="CI_Pipeline_Metrics.docx",
            source_chunk_id="chunk_002",
            citation="CI_Pipeline_Metrics.docx (Pages: 2)",
            extraction_confidence=0.92
        )
    ]
