import pytest
from app.schemas.evidence_packet import (
    EvidencePacket,
    EvidenceItemSchema,
    EvidenceSource,
    SupportingSource,
    NormalizedMetric,
    TimePeriod,
    EvidenceConflictSchema,
    ConflictClaim,
    EvidenceMetrics
)
from app.schemas.signal_input import SignalInputContext
from app.services.signal_consumer import (
    consume_evidence_packet,
    EvidencePacketValidationError
)

@pytest.fixture
def valid_evidence_packet():
    return EvidencePacket(
        project_id="aurora",
        analysis_id="anl_001",
        organization_id="org_aurora_technologies",
        generated_at="2026-08-29T15:00:00Z",
        evidence=[
            EvidenceItemSchema(
                id="ev_001",
                category="ADOPTION",
                evidence_type="METRIC",
                statement="Activation rate declined from 52% to 33%.",
                normalized_value=NormalizedMetric(
                    metric="activation_rate",
                    before=52.0,
                    after=33.0,
                    unit="percent",
                    direction="DECREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_analytics",
                    document_name="Analytics Report.pdf",
                    location_type="PAGE",
                    location_value="12"
                ),
                supporting_sources=[
                    SupportingSource(document_id="doc_notes", document_name="Meeting Notes.docx", location="Review")
                ],
                supporting_chunk_ids=["chk_1", "chk_2"],
                evidence_confidence=0.95,
                verification_status="VERIFIED"
            ),
            EvidenceItemSchema(
                id="ev_002",
                category="TECHNICAL",
                evidence_type="INCIDENT",
                statement="CI/CD failure rate surged to 28.6%.",
                normalized_value=NormalizedMetric(
                    metric="ci_failure_rate",
                    before=4.2,
                    after=28.6,
                    unit="percent",
                    direction="INCREASE"
                ),
                source=EvidenceSource(
                    document_id="doc_incidents",
                    document_name="Incident Report.pdf",
                    location_type="PAGE",
                    location_value="4"
                ),
                evidence_confidence=0.98,
                verification_status="VERIFIED"
            )
        ],
        conflicts=[
            EvidenceConflictSchema(
                id="conf_001",
                topic="activation_rate",
                category="ADOPTION",
                claims=[
                    ConflictClaim(value="33%", source="Analytics Report.pdf (Page 12)"),
                    ConflictClaim(value="47%", source="Meeting Notes.docx (Review)")
                ],
                status="UNRESOLVED"
            )
        ],
        coverage={"ADOPTION": "FOUND", "TECHNICAL": "FOUND", "FINANCIAL": "NO_EVIDENCE_FOUND"},
        metrics=EvidenceMetrics(
            total_documents_analyzed=5,
            total_chunks_searched=142,
            total_evidence_extracted=2,
            verified_evidence_count=2,
            rejected_evidence_count=0,
            conflicts_count=1,
            processing_time_seconds=3.2
        )
    )

def test_1_valid_evidence_packet(valid_evidence_packet):
    """Test 1: Valid Evidence Packet is consumed cleanly."""
    ctx = consume_evidence_packet(
        packet_input=valid_evidence_packet,
        authorized_org_id="org_aurora_technologies",
        expected_project_id="aurora"
    )
    assert isinstance(ctx, SignalInputContext)
    assert ctx.project_id == "aurora"
    assert ctx.analysis_id == "anl_001"
    assert ctx.organization_id == "org_aurora_technologies"
    assert ctx.verified_count == 2
    assert ctx.rejected_unverified_count == 0
    assert len(ctx.conflicts) == 1
    assert ctx.coverage["ADOPTION"] == "FOUND"

def test_2_empty_evidence_packet():
    """Test 2: Empty evidence list is handled safely."""
    empty_packet = {
        "project_id": "aurora",
        "analysis_id": "anl_002",
        "organization_id": "org_aurora_technologies",
        "generated_at": "2026-08-29T15:00:00Z",
        "evidence": [],
        "conflicts": [],
        "coverage": {}
    }
    ctx = consume_evidence_packet(empty_packet, authorized_org_id="org_aurora_technologies")
    assert ctx.verified_count == 0
    assert ctx.total_input_count == 0
    assert len(ctx.verified_evidence) == 0

def test_3_invalid_schema():
    """Test 3: Invalid schema / non-dict payload raises validation error."""
    with pytest.raises(EvidencePacketValidationError) as exc_info:
        consume_evidence_packet("Not a valid packet", authorized_org_id="org_aurora_technologies")
    assert exc_info.value.code == "UNSUPPORTED_TYPE"

    with pytest.raises(EvidencePacketValidationError) as exc_info:
        consume_evidence_packet({"invalid_key": 123}, authorized_org_id="org_aurora_technologies")
    assert exc_info.value.code == "INVALID_SCHEMA"

def test_4_missing_project_id():
    """Test 4: Missing project_id is rejected."""
    bad_packet = {
        "project_id": "",
        "analysis_id": "anl_003",
        "organization_id": "org_aurora_technologies",
        "generated_at": "2026-08-29T15:00:00Z",
        "evidence": []
    }
    with pytest.raises(EvidencePacketValidationError) as exc_info:
        consume_evidence_packet(bad_packet, authorized_org_id="org_aurora_technologies")
    assert exc_info.value.code == "MISSING_PROJECT_ID"

def test_5_missing_analysis_id():
    """Test 5: Missing analysis_id is rejected."""
    bad_packet = {
        "project_id": "aurora",
        "analysis_id": "   ",
        "organization_id": "org_aurora_technologies",
        "generated_at": "2026-08-29T15:00:00Z",
        "evidence": []
    }
    with pytest.raises(EvidencePacketValidationError) as exc_info:
        consume_evidence_packet(bad_packet, authorized_org_id="org_aurora_technologies")
    assert exc_info.value.code == "MISSING_ANALYSIS_ID"

def test_6_unverified_evidence_filtering(valid_evidence_packet):
    """Test 6: Items with verification_status != 'VERIFIED' are filtered out."""
    # Add an unverified item
    valid_evidence_packet.evidence.append(
        EvidenceItemSchema(
            id="ev_003_unverified",
            category="FINANCIAL",
            evidence_type="METRIC",
            statement="Speculative revenue projection of $10M ARR.",
            source=EvidenceSource(document_id="doc_x", document_name="Spec.pdf"),
            evidence_confidence=0.40,
            verification_status="REJECTED"
        )
    )
    ctx = consume_evidence_packet(valid_evidence_packet, authorized_org_id="org_aurora_technologies")
    assert ctx.total_input_count == 3
    assert ctx.verified_count == 2
    assert ctx.rejected_unverified_count == 1
    assert all(it.evidence_id != "ev_003_unverified" for it in ctx.verified_evidence)

def test_7_missing_source_lineage_handling(valid_evidence_packet):
    """Test 7: Evidence items lacking valid source document lineage are rejected."""
    valid_evidence_packet.evidence.append(
        EvidenceItemSchema(
            id="ev_004_no_source",
            category="OTHER",
            evidence_type="OBSERVATION",
            statement="Unattributed rumor.",
            source=EvidenceSource(document_id="", document_name=""),
            verification_status="VERIFIED"
        )
    )
    ctx = consume_evidence_packet(valid_evidence_packet, authorized_org_id="org_aurora_technologies")
    assert ctx.verified_count == 2
    assert ctx.rejected_unverified_count == 1
    assert all(it.evidence_id != "ev_004_no_source" for it in ctx.verified_evidence)

def test_8_unauthorized_organization_rejection(valid_evidence_packet):
    """Test 8: Cross-tenant attack (Company B attempting to access Company A packet) is blocked."""
    with pytest.raises(EvidencePacketValidationError) as exc_info:
        consume_evidence_packet(
            packet_input=valid_evidence_packet,
            authorized_org_id="org_attacker_corporation"
        )
    assert exc_info.value.code == "UNAUTHORIZED_ORGANIZATION"

def test_9_correct_tenant_preservation(valid_evidence_packet):
    """Test 9: Tenant identity is preserved in output context."""
    ctx = consume_evidence_packet(
        packet_input=valid_evidence_packet,
        authorized_org_id="org_aurora_technologies"
    )
    assert ctx.organization_id == "org_aurora_technologies"

def test_10_multiple_evidence_items_and_normalization_preservation(valid_evidence_packet):
    """Test 10: All normalized values, lineage, and confidence are faithfully preserved."""
    ctx = consume_evidence_packet(
        packet_input=valid_evidence_packet,
        authorized_org_id="org_aurora_technologies"
    )
    assert len(ctx.verified_evidence) == 2
    ev1 = ctx.verified_evidence[0]
    assert ev1.evidence_id == "ev_001"
    assert ev1.normalized_value.metric == "activation_rate"
    assert ev1.normalized_value.before == 52.0
    assert ev1.normalized_value.after == 33.0
    assert ev1.confidence == 0.95
    assert ev1.source.document_name == "Analytics Report.pdf"
    assert ev1.source.location_value == "12"
    assert len(ev1.supporting_sources) == 1
    assert ev1.supporting_sources[0].document_name == "Meeting Notes.docx"
