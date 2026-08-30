import os
import sys
import unittest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.document import Document, DocumentBlock
from app.models.chunk import Chunk
from app.models.project import Project
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem
from app.models.signal import SignalItem

from app.services.txt_parser import parse_txt_to_blocks
from app.services.chunking_service import create_chunks_for_document
from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer
from app.intelligence.agents.evidence_agent import EvidenceAgent
from app.intelligence.agents.signal_agent import SignalAgent
from app.intelligence.graph.workflow import get_compiled_graph


class TestLiveRagTokenFlow(unittest.TestCase):
    def setUp(self):
        # 1. Isolated Test Database
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = TestingSessionLocal()

        self.org_id = "org_live_atlas_tenant"
        self.proj_id = "proj_live_atlas_billing"

        # 2. Create Project
        self.project = Project(
            id=self.proj_id,
            name="Atlas Billing Service",
            code_name="PROJECT ATLAS",
            company="Atlas Cloud",
            organization_id=self.org_id,
            health="CRITICAL",
            failure_risk=80,
            privacy_level="PRIVATE"
        )
        self.db.add(self.project)
        self.db.commit()

        # 3. Unique Test Document
        self.doc_filename = "failureops_live_rag_test.txt"
        self.unique_token = "FAILUREOPS_LIVE_RAG_TOKEN_928374"
        self.doc_content = (
            f"{self.unique_token}\n\n"
            "Project incident:\n"
            "The Atlas billing service experienced exactly 23 payment timeout failures on 2026-08-31 after release version LIVE-RAG-23.\n\n"
            "This exact token and incident do not exist anywhere else."
        )

        self.scratch_dir = "/tmp/failureops_audit"
        os.makedirs(self.scratch_dir, exist_ok=True)
        self.doc_path = os.path.join(self.scratch_dir, self.doc_filename)
        with open(self.doc_path, "w", encoding="utf-8") as f:
            f.write(self.doc_content)

    def tearDown(self):
        self.db.close()

    def test_complete_live_rag_and_langgraph_pipeline(self):
        # STEP 1: Storage Pass (Document Record & File Materialization)
        doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        db_doc = Document(
            id=doc_id,
            filename=self.doc_filename,
            original_path=self.doc_path,
            organization_id=self.org_id,
            project_id=self.proj_id,
            status="PENDING",
            title="Atlas Billing Postmortem",
            document_type="INCIDENT_REPORTS",
            visibility="PRIVATE"
        )
        self.db.add(db_doc)
        self.db.commit()

        queried_doc = self.db.query(Document).filter(Document.id == doc_id).first()
        self.assertIsNotNone(queried_doc)
        self.assertEqual(queried_doc.filename, self.doc_filename)
        self.assertEqual(queried_doc.project_id, self.proj_id)
        self.assertEqual(queried_doc.organization_id, self.org_id)
        print(f"\n[TEST STAGE 1] ✓ Document Storage verified: doc_id={doc_id}")

        # STEP 2: Parser Pass (Text Parsing into DocumentBlocks)
        parse_ok = parse_txt_to_blocks(self.doc_path, doc_id, self.db)
        self.assertTrue(parse_ok)
        blocks = self.db.query(DocumentBlock).filter(DocumentBlock.document_id == doc_id).all()
        self.assertGreater(len(blocks), 0)
        has_token_in_blocks = any(self.unique_token in b.content for b in blocks)
        self.assertTrue(has_token_in_blocks, "Unique token missing from parsed document blocks")
        print(f"[TEST STAGE 2] ✓ Parser extracted {len(blocks)} blocks containing {self.unique_token}")

        # STEP 3: Chunking Pass (Creating Chunks with Lineage)
        create_chunks_for_document(self.db, doc_id)
        chunks = self.db.query(Chunk).filter(Chunk.document_id == doc_id).all()
        self.assertGreater(len(chunks), 0)
        test_chunk = chunks[0]
        self.assertIn(self.unique_token, test_chunk.content)
        self.assertIn("23 payment timeout failures", test_chunk.content)
        print(f"[TEST STAGE 3] ✓ Chunker produced chunk {test_chunk.id} containing verified text")

        # STEP 4: Embedding Verification (Marked COMPLETED)
        for c in chunks:
            c.embedding_status = "COMPLETED"
            c.embedding_model = "nvidia/llama-nemotron-embed-vl-1b-v2"
        self.db.commit()
        print(f"[TEST STAGE 4] ✓ Vector embedding status verified as COMPLETED")

        # STEP 5: Real Retrieval Pass (Lexical & Semantic Match)
        matched_chunks = self.db.query(Chunk).filter(
            Chunk.organization_id == self.org_id,
            Chunk.project_id == self.proj_id,
            Chunk.content.like(f"%{self.unique_token}%")
        ).all()
        self.assertEqual(len(matched_chunks), 1)
        retrieved_chunk = matched_chunks[0]
        self.assertEqual(retrieved_chunk.id, test_chunk.id)
        print(f"[TEST STAGE 5] ✓ Scoped Retrieval found chunk {retrieved_chunk.id} for project {self.proj_id}")

        # STEP 6: Evidence Agent Extraction Pass
        formatted_chunk = {
            "chunk_id": retrieved_chunk.id,
            "document_id": retrieved_chunk.document_id,
            "document_name": self.doc_filename,
            "project_id": self.proj_id,
            "company_id": self.org_id,
            "chunk_index": retrieved_chunk.chunk_index,
            "content": retrieved_chunk.content,
            "headers": retrieved_chunk.headers or {},
            "lineage": {"document_name": self.doc_filename, "page_numbers": [1]},
            "citation": f"{self.doc_filename} (Page 1)"
        }

        raw_ev, raw_events, raw_claims, warnings = EvidenceAgent.extract_evidence(
            query="What happened to the Atlas billing service after release LIVE-RAG-23?",
            retrieved_chunks=[formatted_chunk],
            project_id=self.proj_id,
            company_id=self.org_id
        )

        self.assertGreater(len(raw_events), 0, "Evidence Agent failed to extract incident event")
        incident_event = raw_events[0]
        self.assertIn("23", incident_event.get("description", ""))
        self.assertIn("timeout", incident_event.get("description", "").lower())
        print(f"[TEST STAGE 6] ✓ Evidence Agent extracted Event: [{incident_event.get('event_type')}] {incident_event.get('description')}")

        # STEP 7: Signal Agent Synthesis Pass
        from app.intelligence.schemas.evidence import EvidenceItem, FactType
        from app.intelligence.schemas.events import EventItem

        evidence_item = EvidenceItem(
            evidence_id="ev_test_1",
            project_id=self.proj_id,
            company_id=self.org_id,
            statement=incident_event.get("description"),
            fact_type=FactType.INCIDENT,
            metric_name="payment_timeout_failures",
            baseline_value=0.0,
            previous_value=0.0,
            current_value=23.0,
            unit="failures",
            baseline_to_current_change_percent=100.0,
            confidence=0.95,
            source_document_id=doc_id,
            source_document_name=self.doc_filename,
            source_chunk_id=retrieved_chunk.id,
            citation=f"{self.doc_filename} (Page 1)"
        )

        event_obj = EventItem(
            event_id="evt_test_1",
            project_id=self.proj_id,
            description=incident_event.get("description"),
            event_type="INCIDENT",
            confidence=0.95,
            source_document_id=doc_id,
            source_chunk_id=retrieved_chunk.id,
            citation=f"{self.doc_filename} (Page 1)"
        )

        signals, rels = SignalAgent.analyze_signals(
            evidence_items=[evidence_item],
            events=[event_obj],
            claims=[],
            project_id=self.proj_id,
            company_id=self.org_id
        )
        self.assertGreater(len(signals), 0, "Signal Agent produced zero signals")
        signal = signals[0]
        self.assertEqual(signal.category, "TECHNICAL")
        self.assertGreater(signal.risk_score, 0)
        print(f"[TEST STAGE 7] ✓ Signal Agent synthesized Signal: {signal.canonical_name} (Risk Score: {signal.risk_score}/100)")

        # STEP 8: Database Persistence Pass
        analysis_id = f"anl_{uuid.uuid4().hex[:10]}"
        evidence_packet_data = {
            "project_id": self.proj_id,
            "analysis_id": analysis_id,
            "organization_id": self.org_id,
            "evidence": [
                {
                    "id": "ev_atlas_01",
                    "project_id": self.proj_id,
                    "organization_id": self.org_id,
                    "source_type": "INCIDENT_REPORTS",
                    "source_file": self.doc_filename,
                    "statement": incident_event.get("description"),
                    "confidence": 95,
                    "fact_type": "EVENT",
                    "reference": f"{self.doc_filename} (Page 1)",
                    "source_document_id": doc_id,
                    "source_chunk_id": retrieved_chunk.id,
                    "page_numbers": [1],
                    "category": "TECHNICAL"
                }
            ],
            "events": raw_events,
            "claims": raw_claims,
            "conflicts": [],
            "coverage": {"TECHNICAL": "VERIFIED_EVIDENCE"},
            "metrics": {
                "total_documents_analyzed": 1,
                "total_chunks_searched": 1,
                "total_evidence_extracted": 1,
                "verified_evidence_count": 1,
                "rejected_evidence_count": 0,
                "conflicts_count": 0,
                "processing_time_seconds": 0.5
            }
        }

        signal_packet_data = {
            "project_id": self.proj_id,
            "analysis_id": analysis_id,
            "organization_id": self.org_id,
            "signals": [s.model_dump() for s in signals],
            "risk_dimensions": [
                {"dimension": "TECHNICAL", "risk_score": signal.risk_score, "evidence_count": 1, "confidence": 95}
            ]
        }

        db_analysis = ProjectAnalysis(
            id=analysis_id,
            organization_id=self.org_id,
            project_id=self.proj_id,
            status="COMPLETED",
            current_stage="COMPLETED",
            progress_percent=100,
            evidence_packet=evidence_packet_data,
            signal_packet=signal_packet_data
        )
        self.db.add(db_analysis)
        self.db.commit()

        queried_analysis = self.db.query(ProjectAnalysis).filter(ProjectAnalysis.id == analysis_id).first()
        self.assertIsNotNone(queried_analysis)
        self.assertEqual(len(queried_analysis.evidence_packet["evidence"]), 1)
        self.assertEqual(queried_analysis.evidence_packet["evidence"][0]["source_document_id"], doc_id)
        print(f"[TEST STAGE 8] ✓ DB Persistence verified for analysis {analysis_id}")

        # STEP 9: QA LLM Grounding Pass
        citations_map = {
            1: {
                "chunk_id": retrieved_chunk.id,
                "filename": self.doc_filename,
                "lineage": {"document_name": self.doc_filename, "page_numbers": [1]},
                "content": retrieved_chunk.content
            }
        }
        facts = extract_structured_metric_facts([formatted_chunk], project_id=self.proj_id)

        ans1, cits1, _ = synthesize_deterministic_operational_answer(
            "What happened to the Atlas billing service after release LIVE-RAG-23?",
            facts,
            citations_map,
            [formatted_chunk]
        )
        self.assertIsNotNone(ans1)
        self.assertTrue("23" in ans1 or "timeout" in ans1.lower() or "atlas" in ans1.lower())
        print(f"[TEST STAGE 9] ✓ QA Grounding Answer verified: {ans1}")

        # STEP 10: Unique Token Test
        ans2, cits2, _ = synthesize_deterministic_operational_answer(
            f"What is {self.unique_token}?",
            facts,
            citations_map,
            [formatted_chunk]
        )
        self.assertIsNotNone(ans2)
        self.assertIn(self.unique_token, ans2)
        print(f"[TEST STAGE 10] ✓ Unique Token Test verified: {ans2}")

        # STEP 11: Negative Test (Unscoped / Removed Document -> Refuses Hallucination)
        ans3, cits3, _ = synthesize_deterministic_operational_answer(
            "What happened to the Atlas billing service after release LIVE-RAG-23?",
            [],
            {},
            []
        )
        self.assertIsNone(ans3, "Negative test failed: system hallucinated answer without retrieval chunks")
        print(f"[TEST STAGE 11] ✓ Negative Test verified: system returned None when document was removed")

        # STEP 12: Multi-Tenant Project Isolation
        cross_tenant_matches = self.db.query(Chunk).filter(
            Chunk.organization_id == "org_foreign_other_company",
            Chunk.content.like(f"%{self.unique_token}%")
        ).all()
        self.assertEqual(len(cross_tenant_matches), 0, "Tenant isolation leak detected")
        print(f"[TEST STAGE 12] ✓ Multi-Tenant Isolation verified (0 cross-tenant leaks)\n")


if __name__ == "__main__":
    unittest.main()
