import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base
from app.models.analysis import ProjectAnalysis
from app.models.project import Project
from app.api.analysis import (
    get_project_interventions,
    promote_intervention_to_experiment,
    toggle_intervention_action_item,
    get_project_experiments,
    get_single_project_experiment,
    start_experiment,
    verify_single_experiment,
    ToggleActionItemRequest,
    VerifyExperimentRequest,
)

class TestInterventionsAndExperimentsFlow(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        self.project_id = "careflow"
        self.org_id = "org_aurora_technologies"

        # 1. Seed project
        proj = Project(
            id=self.project_id,
            organization_id=self.org_id,
            name="Careflow",
            code_name="PROJECT CAREFLOW",
            company="Careflow Health"
        )
        self.db.add(proj)

        # 2. Seed analysis with interventions
        analysis = ProjectAnalysis(
            id="anl_careflow_01",
            organization_id=self.org_id,
            project_id=self.project_id,
            status="COMPLETED",
            current_stage="COMPLETED",
            progress_percent=100,
            interventions={
                "project_id": self.project_id,
                "organization_id": self.org_id,
                "interventions": [
                    {
                        "intervention_id": "int_careflow_ci",
                        "project_id": self.project_id,
                        "organization_id": self.org_id,
                        "title": "Stabilize CI/CD Pipeline & Flaky Tests",
                        "problem_addressed": "Build failures delaying release staging.",
                        "target_dimension": "Technical",
                        "target_signals": ["CI_FAILURE_RATE"],
                        "expected_effect": "Unblock release staging by cutting build deadlocks.",
                        "priority": "HIGH",
                        "priority_score": 85,
                        "urgency": "IMMEDIATE",
                        "effort": "MEDIUM",
                        "expected_risk_reduction": 22,
                        "confidence": 0.91,
                        "rationale": "Directly correlates with review latency.",
                        "evidence_ids": ["ev_101"],
                        "action_steps": [
                            "Implement merge queue pre-flight validation gates",
                            "Quarantine flaky integration tests"
                        ],
                        "completed_action_items": []
                    }
                ],
                "recommended_primary_intervention": "int_careflow_ci"
            },
            experiments={
                "project_id": self.project_id,
                "organization_id": self.org_id,
                "experiments": []
            }
        )
        self.db.add(analysis)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_interventions_and_experiments_end_to_end(self):
        # 1. Get interventions
        plan = get_project_interventions(self.project_id, org_id=self.org_id, db=self.db)
        self.assertIn("interventions", plan)
        self.assertEqual(len(plan["interventions"]), 1)
        int_item = plan["interventions"][0]
        self.assertEqual(int_item["intervention_id"], "int_careflow_ci")

        # 2. Toggle action item step
        toggle_res = toggle_intervention_action_item(
            self.project_id,
            "int_careflow_ci",
            "step_0",
            payload=ToggleActionItemRequest(completed=True),
            org_id=self.org_id,
            db=self.db
        )
        self.assertTrue(toggle_res["completed"])
        self.assertIn("step_0", toggle_res["completed_action_items"])

        # 3. Promote intervention to experiment
        new_exp = promote_intervention_to_experiment(
            self.project_id,
            "int_careflow_ci",
            org_id=self.org_id,
            db=self.db
        )
        self.assertIn("experiment_id", new_exp)
        exp_id = new_exp["experiment_id"]
        self.assertEqual(new_exp["status"], "PLANNED")

        # 4. List experiments
        exp_list = get_project_experiments(self.project_id, org_id=self.org_id, db=self.db)
        self.assertTrue(any(e["experiment_id"] == exp_id for e in exp_list["experiments"]))

        # 5. Get single experiment
        single_exp = get_single_project_experiment(self.project_id, exp_id, org_id=self.org_id, db=self.db)
        self.assertEqual(single_exp["experiment_id"], exp_id)

        # 6. Start experiment cohort
        start_res = start_experiment(self.project_id, exp_id, org_id=self.org_id, db=self.db)
        self.assertEqual(start_res["status"], "ACTIVE")
        self.assertIsNotNone(start_res["started_at"])

        # 7. Verify experiment outcome
        verify_res = verify_single_experiment(
            self.project_id,
            exp_id,
            payload=VerifyExperimentRequest(measured_metrics={"CI_FAILURE_RATE": 14.0}),
            org_id=self.org_id,
            db=self.db
        )
        self.assertEqual(verify_res["status"], "SUCCESS")
        print("[TEST] ✓ Careflow Interventions -> Promote -> Start -> Verify lifecycle verified.")

if __name__ == '__main__':
    unittest.main()
