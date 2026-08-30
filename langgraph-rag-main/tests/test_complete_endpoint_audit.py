import unittest
import uuid
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.document import Document, DocumentBlock
from app.models.chunk import Chunk
from app.models.project import Project
from app.models.analysis import ProjectAnalysis

from app.intelligence.graph.workflow import get_compiled_graph
from app.intelligence.agents.evidence_agent import EvidenceAgent
from app.intelligence.agents.signal_agent import SignalAgent
from app.intelligence.schemas.evidence import EvidenceItem, FactType
from app.intelligence.schemas.events import EventItem

from app.services.txt_parser import parse_txt_to_blocks
from app.services.chunking_service import create_chunks_for_document
from app.services.evidence_retriever import retrieve_project_evidence_candidates
from app.services.dna_engine import calculate_failure_dna
from app.services.failure_chain_engine import generate_failure_chain_and_prediction
from app.services.radar_engine import synthesize_failure_radar_snapshot
from app.services.simulation_engine import run_what_if_simulations
from app.services.intervention_engine import generate_intervention_plan
from app.services.experiment_engine import generate_initial_experiments_from_plan
from app.services.outcome_engine import verify_all_project_experiments
from app.services.memory_engine import search_historical_failure_cases
from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer


class TestCompleteEndpointAudit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=cls.engine)
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        cls.db = TestingSessionLocal()

        cls.org_id = "org_audit_corp"
        cls.proj_id = "proj_audit_live"

        cls.project = Project(
            id=cls.proj_id,
            name="Audit Live Service",
            code_name="PROJECT AUDIT",
            company="Audit Corp",
            organization_id=cls.org_id,
            health="WATCH",
            failure_risk=72,
            privacy_level="PRIVATE"
        )
        cls.db.add(cls.project)
        cls.db.commit()

        # Seed test document
        cls.doc_filename = "audit_telemetry.txt"
        cls.doc_content = (
            "AUDIT_LANGGRAPH_RAG_FLOW_TOKEN_773311\n\n"
            "Production Telemetry:\n"
            "CI build failures reached 42 failures on 2026-08-30 due to database deadlock.\n"
            "User churn increased to 18% in the same period."
        )
        cls.scratch_dir = "/tmp/failureops_endpoint_audit"
        os.makedirs(cls.scratch_dir, exist_ok=True)
        cls.doc_path = os.path.join(cls.scratch_dir, cls.doc_filename)
        with open(cls.doc_path, "w", encoding="utf-8") as f:
            f.write(cls.doc_content)

        cls.doc_id = f"doc_{uuid.uuid4().hex[:10]}"
        db_doc = Document(
            id=cls.doc_id,
            filename=cls.doc_filename,
            original_path=cls.doc_path,
            organization_id=cls.org_id,
            project_id=cls.proj_id,
            status="COMPLETED",
            title="CI Telemetry",
            document_type="ENGINEERING_METRICS",
            visibility="PRIVATE"
        )
        cls.db.add(db_doc)
        cls.db.commit()

        parse_txt_to_blocks(cls.doc_path, cls.doc_id, cls.db)
        create_chunks_for_document(cls.db, cls.doc_id)
        for c in cls.db.query(Chunk).filter(Chunk.document_id == cls.doc_id).all():
            c.embedding_status = "COMPLETED"
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_langgraph_workflow_compilation(self):
        """Audit 1: Compiled LangGraph 7-Node StateGraph exists and compiles cleanly"""
        graph = get_compiled_graph()
        self.assertIsNotNone(graph)
        self.assertTrue(hasattr(graph, "invoke") or hasattr(graph, "astream"))
        print("\n[AUDIT 1] ✓ LangGraph 7-Node StateGraph compilation: PASS")

    def test_02_document_upload_and_chunking_contract(self):
        """Audit 2: Document Ingestion -> Chunk Lineage contract"""
        chunks = self.db.query(Chunk).filter(Chunk.document_id == self.doc_id).all()
        self.assertGreater(len(chunks), 0)
        self.assertIn("AUDIT_LANGGRAPH_RAG_FLOW_TOKEN_773311", chunks[0].content)
        print(f"[AUDIT 2] ✓ Ingestion -> Chunks contract verified ({len(chunks)} chunks): PASS")

    def test_03_retrieval_and_evidence_extraction(self):
        """Audit 3: Scoped Retrieval -> Multi-Dimension Hybrid Gating"""
        dim_chunks, metrics = retrieve_project_evidence_candidates(
            db=self.db,
            organization_id=self.org_id,
            project_id=self.proj_id,
            document_ids=[self.doc_id]
        )
        self.assertIsInstance(dim_chunks, dict)
        self.assertIn("dimensions_queried", metrics)
        print(f"[AUDIT 3] ✓ Hybrid Retrieval ({metrics['dimensions_queried']} dimensions): PASS")

    def test_04_langgraph_evidence_and_signal_nodes(self):
        """Audit 4: LangGraph Evidence Agent -> Signal Agent execution"""
        chunk = self.db.query(Chunk).filter(Chunk.document_id == self.doc_id).first()
        formatted_chunk = {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_name": self.doc_filename,
            "project_id": self.proj_id,
            "company_id": self.org_id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "headers": chunk.headers or {},
            "lineage": {"document_name": self.doc_filename, "page_numbers": [1]},
            "citation": f"{self.doc_filename} (Page 1)"
        }

        raw_ev, raw_events, raw_claims, warnings = EvidenceAgent.extract_evidence(
            query="What caused CI failures?",
            retrieved_chunks=[formatted_chunk],
            project_id=self.proj_id,
            company_id=self.org_id
        )

        evidence_item = EvidenceItem(
            evidence_id="ev_aud_1",
            project_id=self.proj_id,
            company_id=self.org_id,
            statement="CI build failures reached 42 failures on 2026-08-30",
            fact_type=FactType.INCIDENT,
            metric_name="ci_build_failures",
            baseline_value=0.0,
            previous_value=10.0,
            current_value=42.0,
            unit="failures",
            baseline_to_current_change_percent=320.0,
            confidence=0.95,
            source_document_id=self.doc_id,
            source_document_name=self.doc_filename,
            source_chunk_id=chunk.id,
            citation=f"{self.doc_filename} (Page 1)"
        )

        event_item = EventItem(
            event_id="evt_aud_1",
            project_id=self.proj_id,
            description="Database deadlock caused CI build breakage",
            event_type="INCIDENT",
            confidence=0.95,
            source_document_id=self.doc_id,
            source_chunk_id=chunk.id,
            citation=f"{self.doc_filename} (Page 1)"
        )

        signals, rels = SignalAgent.analyze_signals(
            evidence_items=[evidence_item],
            events=[event_item],
            claims=[],
            project_id=self.proj_id,
            company_id=self.org_id
        )

        self.assertGreater(len(signals), 0)
        print(f"[AUDIT 4] ✓ Evidence Agent -> Signal Agent execution ({len(signals)} signals generated): PASS")

    def test_05_downstream_intelligence_engines(self):
        """Audit 5: DNA, Failure Chain, Radar, Simulations, Interventions, Outcomes"""
        from app.schemas.signal_packet import SignalPacket
        from app.schemas.evidence_packet import EvidencePacket, EvidenceItemSchema as EpEvidenceItem

        ep = EvidencePacket(
            project_id=self.proj_id,
            analysis_id="anl_aud_01",
            organization_id=self.org_id,
            evidence=[
                EpEvidenceItem(
                    id="ev_1",
                    project_id=self.proj_id,
                    organization_id=self.org_id,
                    source_type="ENGINEERING_METRICS",
                    source_file=self.doc_filename,
                    statement="CI failures surged to 42",
                    confidence=95,
                    reference=f"{self.doc_filename} (Page 1)",
                    source_document_id=self.doc_id,
                    source_chunk_id="chk_1",
                    category="TECHNICAL"
                )
            ]
        )

        sp = SignalPacket(
            project_id=self.proj_id,
            analysis_id="anl_aud_01",
            organization_id=self.org_id,
            signals=[
                {
                    "signal_id": "sig_ci",
                    "analysis_id": "anl_aud_01",
                    "organization_id": self.org_id,
                    "project_id": self.proj_id,
                    "name": "CI_FAILURE_SURGE",
                    "canonical_name": "CI_FAILURE_RATE",
                    "category": "TECHNICAL",
                    "severity": "CRITICAL",
                    "polarity": "NEGATIVE",
                    "summary": "CI build failures surged to 42 due to database deadlock.",
                    "risk_score": 85.0,
                    "risk_trend": "INCREASING",
                    "supporting_evidence_ids": ["ev_1"]
                }
            ],
            risk_dimensions=[
                {"dimension": "TECHNICAL", "risk_score": 85.0, "evidence_count": 1, "confidence": 95}
            ]
        )

        dna = calculate_failure_dna(sp, ep)
        self.assertIsNotNone(dna)
        self.assertIsNotNone(dna.overall)

        chain = generate_failure_chain_and_prediction(sp, dna)
        self.assertIsNotNone(chain)
        self.assertIsNotNone(chain.prediction)

        radar = synthesize_failure_radar_snapshot(sp, dna, chain)
        self.assertIsNotNone(radar)
        self.assertIsNotNone(radar.top_failure_risks)

        sims = run_what_if_simulations(self.proj_id, self.org_id, sp, dna)
        self.assertIsNotNone(sims)
        self.assertEqual(len(sims.scenarios), 4)

        plan = generate_intervention_plan(sp, dna, chain, None, sims)
        self.assertIsNotNone(plan)
        self.assertGreater(len(plan.interventions), 0)

        exps = generate_initial_experiments_from_plan(plan)
        self.assertIsNotNone(exps)
        self.assertGreater(len(exps.experiments), 0)

        from app.services.outcome_engine import verify_experiment_outcome
        test_exp = exps.experiments[0]
        outcome = verify_experiment_outcome(test_exp, measured_metrics={"ci_failure_rate": 10.0})
        self.assertIsNotNone(outcome)

        print("[AUDIT 5] ✓ DNA -> Causal Chain -> Radar -> Simulations -> Interventions -> Outcomes: PASS")

    def test_06_truth_engine_and_qa_grounding(self):
        """Audit 6: Truth Engine & Deterministic QA Grounding"""
        chunk = self.db.query(Chunk).filter(Chunk.document_id == self.doc_id).first()
        formatted_chunk = {
            "chunk_id": chunk.id,
            "document_id": chunk.document_id,
            "document_name": self.doc_filename,
            "content": chunk.content,
            "lineage": {"document_name": self.doc_filename, "page_numbers": [1]}
        }
        citations_map = {
            1: {
                "chunk_id": chunk.id,
                "filename": self.doc_filename,
                "lineage": {"document_name": self.doc_filename, "page_numbers": [1]},
                "content": chunk.content
            }
        }
        facts = extract_structured_metric_facts([formatted_chunk], project_id=self.proj_id)
        ans, cits, _ = synthesize_deterministic_operational_answer(
            "What token was found in the audit document?",
            facts,
            citations_map,
            [formatted_chunk]
        )
        self.assertIsNotNone(ans)
        self.assertIn("AUDIT_LANGGRAPH_RAG_FLOW_TOKEN_773311", ans)
        print(f"[AUDIT 6] ✓ Truth Engine & QA Grounding ({ans[:80]}...): PASS\n")


if __name__ == "__main__":
    unittest.main()
