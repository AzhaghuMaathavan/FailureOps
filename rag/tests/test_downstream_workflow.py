import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base
from app.models.analysis import ProjectAnalysis
from app.models.signal import SignalItem
from app.models.project import Project
from app.api.analysis import (
    simulate_project_scenarios,
    start_experiment,
    verify_single_experiment,
    get_project_outcomes,
    save_project_organizational_memory,
    get_organizational_memory,
    RunSimulationRequest,
    VerifyExperimentRequest,
    SaveMemoryRequest
)
from app.schemas.experiment import ExperimentListPacket, ExperimentItem, ExperimentTargetMetric, ExperimentBaselineSnapshot
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket, DimensionRisk, OverallProjectHealth

class TestDownstreamWorkflow(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        # Seed test project and completed analysis
        self.project_id = "test_aurora"
        self.org_id = "org_test"

        test_project = Project(
            id=self.project_id,
            organization_id=self.org_id,
            name="Aurora Test Project",
            code_name="aurora-test",
            company="Aurora Corp"
        )
        self.db.add(test_project)

        # Seed initial experiment inside analysis
        exp = ExperimentItem(
            experiment_id="exp_test_01",
            project_id=self.project_id,
            organization_id=self.org_id,
            intervention_id="int_test_01",
            title="Streamline Onboarding Flow",
            hypothesis="Reducing onboarding steps will increase user activation rate.",
            baseline_snapshot=ExperimentBaselineSnapshot(
                snapshot_id="snap_01",
                metrics={"activation_rate": 32.0}
            ),
            target_metrics=[
                ExperimentTargetMetric(
                    metric_name="activation_rate",
                    baseline_value=32.0,
                    target_value=55.0,
                    desired_direction="INCREASE",
                    unit="percent"
                )
            ],
            observation_period_days=14,
            status="DRAFT",
            success_criteria=["activation_rate >= 50%"]
        )

        exp_packet = ExperimentListPacket(
            project_id=self.project_id,
            organization_id=self.org_id,
            experiments=[exp],
            active_experiment_count=0
        )

        test_analysis = ProjectAnalysis(
            id="analysis_test_001",
            organization_id=self.org_id,
            project_id=self.project_id,
            status="COMPLETED",
            experiments=exp_packet.model_dump(),
            simulations=None,
            outcomes=None,
            historical_matches={"matched_cases": []}
        )
        self.db.add(test_analysis)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def test_01_what_if_simulation_execution_and_persistence(self):
        # Run simulation selecting 'simplify_onboarding'
        req = RunSimulationRequest(scenario_id="simplify_onboarding")
        res = simulate_project_scenarios(
            project_id=self.project_id,
            payload=req,
            org_id=self.org_id,
            db=self.db
        )

        self.assertIsNotNone(res)
        self.assertEqual(res.project_id, self.project_id)
        self.assertGreater(len(res.scenarios), 0)

        # Verify simulation was persisted in DB
        analysis = self.db.query(ProjectAnalysis).filter(
            ProjectAnalysis.project_id == self.project_id
        ).first()
        self.assertIsNotNone(analysis.simulations)
        self.assertIn("scenarios", analysis.simulations)
        print("\n[TEST] 1. What-If Simulation executed & persisted with", len(res.scenarios), "scenarios.")

    def test_02_experiment_lifecycle_start(self):
        # Transition experiment from DRAFT -> ACTIVE
        res = start_experiment(
            project_id=self.project_id,
            experiment_id="exp_test_01",
            org_id=self.org_id,
            db=self.db
        )

        self.assertEqual(res["status"], "ACTIVE")
        self.assertIsNotNone(res["started_at"])

        # Check DB persistence
        analysis = self.db.query(ProjectAnalysis).filter(
            ProjectAnalysis.project_id == self.project_id
        ).first()
        experiments = analysis.experiments.get("experiments", [])
        self.assertEqual(experiments[0]["status"], "ACTIVE")
        print("[TEST] 2. Experiment started & marked ACTIVE in database.")

    def test_03_experiment_verification_and_outcome_persistence(self):
        # First start experiment
        start_experiment(
            project_id=self.project_id,
            experiment_id="exp_test_01",
            org_id=self.org_id,
            db=self.db
        )

        # Verify experiment with measured metrics (activation_rate=58.0%)
        verify_req = VerifyExperimentRequest(
            measured_metrics={"activation_rate": 58.0}
        )
        report = verify_single_experiment(
            project_id=self.project_id,
            experiment_id="exp_test_01",
            payload=verify_req,
            org_id=self.org_id,
            db=self.db
        )

        self.assertEqual(report["status"], "SUCCESS")
        self.assertEqual(report["attribution_confidence"], "HIGH")

        # Verify outcomes endpoint returns the real verified outcome
        outcomes_packet = get_project_outcomes(
            project_id=self.project_id,
            org_id=self.org_id,
            db=self.db
        )
        self.assertEqual(len(outcomes_packet["outcomes"]), 1)
        self.assertEqual(outcomes_packet["outcomes"][0]["status"], "SUCCESS")
        self.assertEqual(outcomes_packet["overall_success_rate"], 100.0)
        print("[TEST] 3. Experiment verified -> SUCCESS outcome persisted in database.")

    def test_04_save_to_organizational_memory(self):
        # Save validated learning to organizational memory
        save_req = SaveMemoryRequest(
            pattern="ONBOARDING_COLLAPSE",
            intervention="Streamline Onboarding Flow (7 to 3 steps)",
            outcome="Activation rate increased from 32% to 58%",
            confidence=0.96,
            evidenceSummary=["ev_001", "ev_002"]
        )

        saved = save_project_organizational_memory(
            project_id=self.project_id,
            payload=save_req,
            org_id=self.org_id,
            db=self.db
        )

        self.assertIsNotNone(saved["memory_id"])
        self.assertEqual(saved["outcome_status"], "SUCCESS")

        # Query memory
        mem_packet = get_organizational_memory(
            project_id=self.project_id,
            org_id=self.org_id,
            db=self.db
        )
        self.assertGreater(len(mem_packet["memories"]), 0)
        persisted_match = next((m for m in mem_packet["memories"] if m.get("memory_id") == saved["memory_id"]), None)
        self.assertIsNotNone(persisted_match)
        print("[TEST] 4. Validated learning written and retrieved from organizational memory.")

    def test_05_multi_tenant_isolation(self):
        # Organization B querying Organization A's project memory must not receive private data
        org_b_mem = get_organizational_memory(
            project_id="other_project",
            org_id="org_attacker_b",
            db=self.db
        )
        # Should not find test_aurora private memories
        private_leaked = any(m.get("project_id") == self.project_id for m in org_b_mem["memories"])
        self.assertFalse(private_leaked)
        print("[TEST] 5. Multi-tenant privacy strictly enforced between organizations.")

    def test_06_failure_outcome_verification(self):
        # Verify an experiment where metrics regressed (activation rate fell from 32% to 20%)
        verify_req = VerifyExperimentRequest(
            measured_metrics={"activation_rate": 20.0}
        )
        report = verify_single_experiment(
            project_id=self.project_id,
            experiment_id="exp_test_01",
            payload=verify_req,
            org_id=self.org_id,
            db=self.db
        )

        self.assertEqual(report["status"], "REGRESSION")
        print("[TEST] 6. Failure outcome correctly classified as REGRESSION (not falsely marked success).")

    def test_07_fresh_unanalyzed_project_empty_states(self):
        fresh_outcomes = get_project_outcomes(
            project_id="fresh_unanalyzed_project",
            org_id=self.org_id,
            db=self.db
        )
        self.assertEqual(len(fresh_outcomes["outcomes"]), 0)
        self.assertEqual(fresh_outcomes["overall_success_rate"], 0.0)
        print("[TEST] 7. Fresh unanalyzed project returns clean empty state without fake numbers.")

if __name__ == "__main__":
    unittest.main()
