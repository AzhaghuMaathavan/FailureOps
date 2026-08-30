import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.database import Base
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.services.txt_parser import parse_txt_to_blocks
from app.services.csv_parser import parse_csv_to_blocks
from app.services.chunking_service import create_chunks_for_document
from app.services.evidence_retriever import retrieve_project_evidence_candidates
from app.services.evidence_agent import run_evidence_agent

TEST_DB_URL = "sqlite:///:memory:"

@pytest.fixture
def test_db():
    engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_full_evidence_intelligence_pipeline(test_db):
    org_id = "org_aurora_technologies"
    proj_id = "aurora"
    
    data_dir = os.path.join(os.path.dirname(__file__), "data", "aurora")
    test_files = [
        ("Product Plan.txt", "Product Plan.txt"),
        ("Analytics Report.txt", "Analytics Report.txt"),
        ("Incident Report.txt", "Incident Report.txt"),
        ("Meeting Notes.txt", "Meeting Notes.txt"),
        ("Customer Survey.csv", "Customer Survey.csv")
    ]

    doc_ids = []
    # 1. Parse and Chunk all files
    for fname, orig_name in test_files:
        fpath = os.path.join(data_dir, fname)
        assert os.path.exists(fpath), f"Missing {fpath}"
        
        doc_id = f"doc_{fname.replace(' ', '_').replace('.', '_')}"
        doc = Document(
            id=doc_id,
            filename=orig_name,
            original_path=fpath,
            organization_id=org_id,
            project_id=proj_id,
            status="COMPLETED"
        )
        test_db.add(doc)
        test_db.commit()
        doc_ids.append(doc_id)

        if fname.endswith(".txt"):
            parse_txt_to_blocks(fpath, doc_id, test_db)
        elif fname.endswith(".csv"):
            parse_csv_to_blocks(fpath, doc_id, test_db)

        create_chunks_for_document(test_db, doc_id)

    # 2. Verify Chunks were created with tenant isolation
    total_chunks = test_db.query(Chunk).filter(
        Chunk.organization_id == org_id,
        Chunk.project_id == proj_id
    ).count()
    assert total_chunks >= 5

    # 3. Retrieve Evidence Candidates
    dimension_chunks, metrics = retrieve_project_evidence_candidates(
        db=test_db,
        organization_id=org_id,
        project_id=proj_id,
        document_ids=doc_ids
    )

    assert len(dimension_chunks) == 16
    assert metrics["dimensions_queried"] == 16

    # 4. Run Evidence Agent
    analysis_id = "anl_test_pipeline_01"
    packet = run_evidence_agent(
        organization_id=org_id,
        project_id=proj_id,
        analysis_id=analysis_id,
        dimension_chunks_map=dimension_chunks,
        total_docs_count=len(doc_ids),
        processing_time=metrics["retrieval_duration_seconds"]
    )

    # 5. Assertions on Evidence Packet
    assert packet.project_id == proj_id
    assert packet.organization_id == org_id
    assert packet.analysis_id == analysis_id
    assert len(packet.evidence) >= 4
    
    # Verify key dimensions found
    assert packet.coverage["ADOPTION"] == "FOUND"
    assert packet.coverage["TECHNICAL"] == "FOUND"
    assert packet.coverage["OPERATIONAL"] == "FOUND"
    # Verify missing dimension
    assert packet.coverage["FINANCIAL"] in ["FOUND", "NO_EVIDENCE_FOUND"]

    # Verify metrics normalization
    statements = [e.statement for e in packet.evidence]
    assert any("33%" in s or "activation" in s.lower() for s in statements)
    assert any("28.6%" in s or "failure" in s.lower() or "incident" in s.lower() for s in statements)
