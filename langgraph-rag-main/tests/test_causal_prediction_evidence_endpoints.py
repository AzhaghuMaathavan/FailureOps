import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base
from app.models.analysis import ProjectAnalysis
from app.models.signal import SignalItem
from app.models.project import Project
from app.models.evidence import EvidenceItem
from app.api.analysis import (
    get_project_failure_chain,
    get_project_failure_prediction,
    simulate_project_scenarios,
    get_single_evidence,
    open_document_stream,
    RunSimulationRequest
)
from app.schemas.failure_chain import FailureChainPacket, FailurePrediction, ChainNode, ChainEdge
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket, DimensionRisk, OverallProjectHealth

class TestCausalPredictionEvidenceEndpoints(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.project_id = "aurora"
        self.org_id = "org_aurora_technologies"

        # Seed project
        proj = Project(
            id=self.project_id,
            organization_id=self.org_id,
            name="ExpenseTracker",
            code_name="PROJECT AURORA",
            company="Aurora Technologies"
        )
        self.db.add(proj)

        # Seed analysis with failure chain and evidence
        chain = {
            "project_id": self.project_id,
            "analysis_id": "anl_test_01",
            "organization_id": self.org_id,
            "prediction": {
                "predicted_failure": "Pre-Launch Adoption Collapse & Growth Stall",
                "risk_score": 78,
                "confidence": 0.88,
                "status": "CRITICAL",
                "time_horizon": "2-3 weeks",
                "explanation": "Onboarding friction and slow API responses compound risk.",
                "supporting_evidence_ids": ["ev_001", "ev_002"]
            },
            "nodes": [
                {"id": "node_1", "type": "SIGNAL", "label": "API_P95_MS (+16.4%)", "severity": "HIGH", "category": "engineering", "evidence_ids": ["ev_001"], "confidence": 0.89},
                {"id": "node_2", "type": "SIGNAL", "label": "ONBOARDING_DROP_RATE (+43%)", "severity": "CRITICAL", "category": "product", "evidence_ids": ["ev_002"], "confidence": 0.92}
            ],
            "edges": [
                {"id": "edge_1", "source": "node_1", "target": "node_2", "relationship_type": "AMPLIFIES", "confidence": 0.85}
            ],
            "explanation": "API latency amplifies onboarding abandonment."
        }

        dna = {
            "project_id": self.project_id,
            "analysis_id": "anl_test_01",
            "organization_id": self.org_id,
            "overall": {
                "status": "WATCH",
                "risk_score": 68,
                "primary_risk_dimension": "ADOPTION",
                "confidence_score": 0.88,
                "summary_explanation": "Elevated adoption and performance friction."
            },
            "dimensions": []
        }

        signals = {
            "project_id": self.project_id,
            "analysis_id": "anl_test_01",
            "organization_id": self.org_id,
            "signals": [
                {
                    "signal_id": "sig_01",
                    "project_id": self.project_id,
                    "analysis_id": "anl_test_01",
                    "organization_id": self.org_id,
                    "name": "API_P95_MS",
                    "category": "TECHNICAL",
                    "polarity": "NEGATIVE",
                    "severity": "HIGH",
                    "metric_name": "api_p95_ms",
                    "metric_change": "+16.4%",
                    "signal_confidence": 0.89,
                    "summary": "P95 latency increased significantly.",
                    "supporting_evidence_ids": ["ev_001"],
                    "timestamp": "2026-08-24T00:00:00Z"
                }
            ]
        }

        evidence_packet = {
            "project_id": self.project_id,
            "analysis_id": "anl_test_01",
            "organization_id": self.org_id,
            "evidence": [
                {
                    "id": "ev_001",
                    "category": "TECHNICAL",
                    "statement": "API P95 latency increased from 318ms to 370ms.",
                    "evidence_confidence": 0.94,
                    "verification_status": "VERIFIED",
                    "source_lineage": {
                        "filename": "engineeringmetrics.csv",
                        "document_id": "doc_eng_01",
                        "page_number": 1,
                        "citation": "engineeringmetrics.csv (Page 1)"
                    }
                }
            ]
        }

        anl = ProjectAnalysis(
            id="anl_test_01",
            organization_id=self.org_id,
            project_id=self.project_id,
            status="COMPLETED",
            failure_chain=chain,
            failure_dna=dna,
            signal_packet=signals,
            evidence_packet=evidence_packet
        )
        self.db.add(anl)

        # Seed EvidenceItem row
        ev_item = EvidenceItem(
            id="ev_001",
            analysis_id="anl_test_01",
            organization_id=self.org_id,
            project_id=self.project_id,
            category="TECHNICAL",
            evidence_type="METRIC_TREND",
            statement="API P95 latency increased from 318ms to 370ms.",
            source_lineage={"filename": "engineeringmetrics.csv", "document_id": "doc_eng_01", "page_number": 1},
            supporting_chunk_ids=["chk_01"],
            evidence_confidence=0.94,
            verification_status="VERIFIED",
            visibility="PRIVATE"
        )
        self.db.add(ev_item)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_causal_endpoint_alias(self):
        res = get_project_failure_chain(self.project_id, self.org_id, self.db)
        self.assertIsNotNone(res)
        self.assertEqual(len(res.nodes), 2)
        self.assertEqual(res.prediction.predicted_failure, "Pre-Launch Adoption Collapse & Growth Stall")
        print("[TEST] ✓ get_project_failure_chain (/causal alias) returned valid FailureChainPacket with 2 nodes")

    def test_prediction_endpoint_alias(self):
        pred = get_project_failure_prediction(self.project_id, self.org_id, self.db)
        self.assertIsNotNone(pred)
        self.assertEqual(pred.status, "CRITICAL")
        self.assertIn("ev_001", pred.supporting_evidence_ids)
        print("[TEST] ✓ get_project_failure_prediction (/prediction alias) returned valid FailurePrediction")

    def test_simulation_scenarios_alias(self):
        sim = simulate_project_scenarios(self.project_id, None, self.org_id, self.db)
        self.assertIsNotNone(sim)
        self.assertGreater(len(sim.scenarios), 0)
        self.assertIsNotNone(sim.recommended_scenario)
        print("[TEST] ✓ simulate_project_scenarios returned valid SimulationComparisonPacket with recommended scenario")

    def test_single_evidence_lookup(self):
        ev = get_single_evidence("ev_001", self.org_id, self.db)
        self.assertIsNotNone(ev)
        self.assertEqual(ev["id"], "ev_001")
        self.assertEqual(ev["category"], "TECHNICAL")
        self.assertEqual(ev["source_document_name"], "engineeringmetrics.csv")
        self.assertIn("318ms to 370ms", ev["statement"])
        print("[TEST] ✓ get_single_evidence retrieved exact evidence metadata and source coordinates")

if __name__ == "__main__":
    unittest.main()
