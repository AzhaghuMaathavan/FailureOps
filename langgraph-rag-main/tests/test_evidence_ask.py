import unittest
from typing import List, Dict, Any
from app.intelligence.services.timeseries_engine import TimeSeriesEngine

class TestEvidenceAskSynthesis(unittest.TestCase):
    def setUp(self):
        self.sample_chunk = {
            "chunk_id": "chk_eng_metrics_01",
            "document_id": "doc_eng_metrics",
            "document_name": "engineeringmetrics.csv",
            "lineage": {"document_name": "engineeringmetrics.csv", "page_numbers": [1]},
            "content": (
                "week_start: 2026-06-01 | api_requests_millions: 4.2 | api_p95_ms: 318 | platform_availability: 99.90% | ci_failure_rate: 12%\n"
                "week_start: 2026-06-15 | api_requests_millions: 4.5 | api_p95_ms: 325 | platform_availability: 99.90% | ci_failure_rate: 14%\n"
                "week_start: 2026-06-22 | api_requests_millions: 4.8 | api_p95_ms: 330 | platform_availability: 99.89% | ci_failure_rate: 18%\n"
                "week_start: 2026-08-17 | api_requests_millions: 6.8 | api_p95_ms: 365 | platform_availability: 99.82% | ci_failure_rate: 31%\n"
                "week_start: 2026-08-24 | api_requests_millions: 7.1 | api_p95_ms: 370 | platform_availability: 99.81% | ci_failure_rate: 34%"
            )
        }
        self.citations_map = {
            1: {
                "chunk_id": "chk_eng_metrics_01",
                "filename": "engineeringmetrics.csv",
                "lineage": {"document_name": "engineeringmetrics.csv", "page_numbers": [1]},
                "content": self.sample_chunk["content"]
            }
        }
        
    def test_q1_latest_latency(self):
        from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer
        facts = extract_structured_metric_facts([self.sample_chunk], project_id="aurora")
        ans, cits, key_facts = synthesize_deterministic_operational_answer(
            "What is the latest API P95 latency?",
            facts,
            self.citations_map,
            [self.sample_chunk]
        )
        self.assertIsNotNone(ans)
        self.assertIn("370", ans)
        self.assertIn("318", ans)
        print("\nQ1: What is the latest API P95 latency?")
        print("Ans:", ans)
        
    def test_q2_first_decline(self):
        from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer
        facts = extract_structured_metric_facts([self.sample_chunk], project_id="aurora")
        ans, cits, key_facts = synthesize_deterministic_operational_answer(
            "Which metric declined first before the current failure pattern?",
            facts,
            self.citations_map,
            [self.sample_chunk]
        )
        self.assertIsNotNone(ans)
        self.assertIn("platform_availability", ans)
        self.assertIn("2026-06-22", ans)
        print("\nQ2: Which metric declined first before the current failure pattern?")
        print("Ans:", ans)

    def test_q3_deteriorated_most(self):
        from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer
        facts = extract_structured_metric_facts([self.sample_chunk], project_id="aurora")
        ans, cits, key_facts = synthesize_deterministic_operational_answer(
            "Which metric deteriorated the most?",
            facts,
            self.citations_map,
            [self.sample_chunk]
        )
        self.assertIsNotNone(ans)
        self.assertIn("ci_failure_rate", ans)
        print("\nQ3: Which metric deteriorated the most?")
        print("Ans:", ans)

    def test_q4_did_latency_increase(self):
        from app.services.agent_service import extract_structured_metric_facts, synthesize_deterministic_operational_answer
        facts = extract_structured_metric_facts([self.sample_chunk], project_id="aurora")
        ans, cits, key_facts = synthesize_deterministic_operational_answer(
            "Did API latency increase?",
            facts,
            self.citations_map,
            [self.sample_chunk]
        )
        self.assertIsNotNone(ans)
        self.assertTrue(ans.startswith("YES"))
        print("\nQ4: Did API latency increase?")
        print("Ans:", ans)

if __name__ == "__main__":
    unittest.main()
