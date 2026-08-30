import pytest
from app.schemas.evidence_packet import EvidencePacket
from app.api.analysis import get_tenant_context

def test_tenant_context_derivation():
    # Test custom organization header
    org = get_tenant_context(x_organization_id="org_custom_enterprise", x_user_id="user_123")
    assert org == "org_custom_enterprise"

    # Test default organization fallback
    org_default = get_tenant_context(x_organization_id=None, x_user_id=None)
    assert org_default == "org_aurora_technologies"

def test_privacy_boundary_defaults():
    from app.models.document import Document
    from app.models.chunk import Chunk

    doc = Document(
        id="doc_test_sec",
        filename="SecurityDoc.pdf",
        original_path="/tmp/sec.pdf"
    )
    assert doc.visibility == "PRIVATE"
    assert doc.global_learning_allowed is False

    chunk = Chunk(
        id="chk_test_sec",
        document_id="doc_test_sec",
        chunk_index=0,
        content="Confidential financial statements.",
        lineage={},
        headers={}
    )
    assert chunk.visibility == "PRIVATE"
