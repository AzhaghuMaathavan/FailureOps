import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base, Document
from app.models.analysis import ProjectAnalysis
from app.models.project import Project
from app.models.evidence import EvidenceItem
from app.services.evidence_agent import run_evidence_agent, extract_unified_evidence_from_chunks
from app.services.citation_validator import consolidate_duplicates_and_conflicts
from app.api.analysis import get_single_evidence, get_latest_project_evidence

class TestEvidenceDeduplicationAndLoss(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.project_id = "aurora"
        self.org_id = "org_aurora_technologies"

        # 1. Seed project
        proj = Project(
            id=self.project_id,
            organization_id=self.org_id,
            name="ExpenseTracker",
            code_name="PROJECT AURORA",
            company="Aurora Technologies"
        )
        self.db.add(proj)

        # 2. Seed document
        doc = Document(
            id="doc_telemetry_01",
            organization_id=self.org_id,
            project_id=self.project_id,
            filename="engineeringmetrics.csv",
            document_type="ENGINEERING_METRICS",
            status="INDEXED",
            original_path="/data/engineeringmetrics.csv"
        )
        self.db.add(doc)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_timeseries_metric_preservation_and_deduplication(self):
        # Sample chunks from a telemetry CSV representing API latency over time
        chunks = [
            {
                "chunk_id": "chk_eng_01",
                "document_id": "doc_telemetry_01",
                "content": "week_start: 2026-06-01 | api_p95_ms: 318.0 | ci_failure_rate: 12.0%\nweek_start: 2026-08-17 | api_p95_ms: 365.0 | ci_failure_rate: 28.0%\nweek_start: 2026-08-24 | api_p95_ms: 370.0 | ci_failure_rate: 34.0%",
                "lineage": {
                    "document_name": "engineeringmetrics.csv",
                    "source_type": "ENGINEERING_METRICS",
                    "source_metadata": {"rows": [1, 2, 3]}
                },
                "rerank_score": 8.5
            },
            # Second chunk representing the same document with overlap
            {
                "chunk_id": "chk_eng_02",
                "document_id": "doc_telemetry_01",
                "content": "week_start: 2026-08-17 | api_p95_ms: 365.0 | ci_failure_rate: 28.0%\nweek_start: 2026-08-24 | api_p95_ms: 370.0 | ci_failure_rate: 34.0%",
                "lineage": {
                    "document_name": "engineeringmetrics.csv",
                    "source_type": "ENGINEERING_METRICS",
                    "source_metadata": {"rows": [2, 3]}
                },
                "rerank_score": 8.0
            }
        ]

        # 1. Run extraction
        extracted, events, claims = extract_unified_evidence_from_chunks(
            chunks=chunks,
            project_id=self.project_id,
            company_id=self.org_id
        )

        # Verify time-series metrics were extracted with full baseline / current / change values
        api_metric = next((it for it in extracted if it.get("metric_name") == "api_p95_ms"), None)
        self.assertIsNotNone(api_metric, "api_p95_ms should be extracted by TimeSeriesEngine")
        self.assertEqual(api_metric["baseline_value"], 318.0)
        self.assertEqual(api_metric["current_value"], 370.0)
        self.assertAlmostEqual(api_metric["baseline_to_current_change_percent"], 16.35, places=1)
        self.assertIn(api_metric["direction"], ["INCREASE", "INCREASING"])

        # 2. Run duplicate consolidation
        consolidated, conflicts = consolidate_duplicates_and_conflicts(extracted)
        
        # Verify deduplication: exactly 1 canonical evidence item for api_p95_ms
        api_items = [c for c in consolidated if c.metric_name == "api_p95_ms"]
        self.assertEqual(len(api_items), 1, "Duplicate chunks should be consolidated into exactly 1 canonical evidence item")
        
        # Verify rich fields preserved through consolidation
        canon = api_items[0]
        self.assertEqual(canon.baseline_value, 318.0)
        self.assertEqual(canon.current_value, 370.0)
        self.assertEqual(canon.fact_type, "METRIC")
        self.assertIn("engineeringmetrics.csv", canon.source.document_name)

        print("[TEST] ✓ TimeSeries metric preservation & canonical deduplication verified.")

    def test_single_evidence_rich_response(self):
        # Seed analysis with rich evidence packet
        anl = ProjectAnalysis(
            id="anl_aurora_test_01",
            organization_id=self.org_id,
            project_id=self.project_id,
            status="COMPLETED",
            current_stage="COMPLETED",
            progress_percent=100,
            evidence_packet={
                "project_id": self.project_id,
                "analysis_id": "anl_aurora_test_01",
                "organization_id": self.org_id,
                "evidence": [
                    {
                        "id": "ev_api_p95_ms",
                        "category": "TECHNICAL",
                        "evidence_type": "METRIC",
                        "fact_type": "METRIC",
                        "metric_name": "api_p95_ms",
                        "statement": "Api P95 Ms recorded at 370.0 ms (baseline: 318.0 ms, change: +16.35%).",
                        "baseline_value": 318.0,
                        "previous_value": 365.0,
                        "current_value": 370.0,
                        "unit": "ms",
                        "direction": "INCREASE",
                        "baseline_timestamp": "2026-06-01",
                        "current_timestamp": "2026-08-24",
                        "baseline_to_current_change_percent": 16.35,
                        "source_document_id": "doc_telemetry_01",
                        "source_document_name": "engineeringmetrics.csv",
                        "citation": "engineeringmetrics.csv (Rows 1-3)",
                        "row_numbers": [1, 2, 3],
                        "supporting_chunk_ids": ["chk_eng_01", "chk_eng_02"],
                        "evidence_confidence": 0.95,
                        "verification_status": "VERIFIED",
                        "source": {
                            "document_id": "doc_telemetry_01",
                            "document_name": "engineeringmetrics.csv",
                            "location_type": "ROW",
                            "location_value": "Rows 1-3"
                        }
                    }
                ],
                "events": [],
                "claims": [],
                "conflicts": [],
                "coverage": {"TECHNICAL": "FOUND"}
            }
        )
        self.db.add(anl)
        self.db.commit()

        # Query single evidence
        resp = get_single_evidence("ev_api_p95_ms", org_id=self.org_id, db=self.db)
        self.assertEqual(resp["id"], "ev_api_p95_ms")
        self.assertEqual(resp["metric_name"], "api_p95_ms")
        self.assertEqual(resp["baseline_value"], 318.0)
        self.assertEqual(resp["current_value"], 370.0)
        self.assertEqual(resp["unit"], "ms")
        self.assertEqual(resp["direction"], "INCREASE")
        self.assertAlmostEqual(resp["baseline_to_current_change_percent"], 16.35, places=1)
        self.assertIn("chk_eng_01", resp["supporting_chunk_ids"])
        print("[TEST] ✓ Single evidence rich response schema verified.")

if __name__ == '__main__':
    unittest.main()
