import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.schemas.signal_packet import SignalPacket
from app.schemas.intervention import InterventionPlanPacket, InterventionItem
from app.schemas.experiment import (
    ExperimentItem, ExperimentBaselineSnapshot, ExperimentTargetMetric, ExperimentListPacket
)

logger = logging.getLogger(__name__)

def create_experiment_from_intervention(
    intervention: InterventionItem,
    project_id: str,
    organization_id: str,
    baseline_metrics: Optional[Dict[str, float]] = None
) -> ExperimentItem:
    """
    Transforms a prioritized intervention into a measurable, scientific experiment with an immutable baseline.
    """
    exp_id = f"exp_{project_id}_{uuid.uuid4().hex[:8]}"
    dim = intervention.target_dimension.upper()

    default_baselines: Dict[str, float] = {}
    target_metrics: List[ExperimentTargetMetric] = []
    success_criteria: List[str] = []
    hypothesis = f"Executing '{intervention.title}' will mitigate observed {intervention.target_dimension} risk."
    exp_type = "TECHNICAL_FIX"

    if "TECHNICAL" in dim or "QUALITY" in dim:
        exp_type = "TECHNICAL_FIX"
        default_baselines = {"ci_failure_rate": 34.0, "pr_review_latency_days": 3.4, "defect_backlog": 42.0}
        target_metrics = [
            ExperimentTargetMetric(metric_name="ci_failure_rate", baseline_value=34.0, target_value=12.0, unit="percent", desired_direction="DECREASE"),
            ExperimentTargetMetric(metric_name="defect_backlog", baseline_value=42.0, target_value=20.0, unit="count", desired_direction="DECREASE")
        ]
        success_criteria = [
            "CI build failure rate decreases by >= 50% within 14 days",
            "P1 defect backlog reduced below 25 open issues"
        ]
        hypothesis = "Implementing merge queue validation gates and quarantining flaky tests will reduce build failure rate by at least 50% and unblock release staging."
    elif "ADOPTION" in dim or "CUSTOMER" in dim:
        exp_type = "ONBOARDING_CHANGE"
        default_baselines = {"signup_abandonment": 76.0, "activation_rate": 33.0}
        target_metrics = [
            ExperimentTargetMetric(metric_name="signup_abandonment", baseline_value=76.0, target_value=30.0, unit="percent", desired_direction="DECREASE"),
            ExperimentTargetMetric(metric_name="activation_rate", baseline_value=33.0, target_value=58.0, unit="percent", desired_direction="INCREASE")
        ]
        success_criteria = [
            "Signup drop-off drops from 76% to below 30%",
            "User activation rate increases by at least +20 percentage points"
        ]
        hypothesis = "Streamlining initial onboarding from 7 steps to 3 steps with deferred workspace invites will reduce drop-off by >40% and restore user activation."
    elif "OPERATIONAL" in dim or "EXECUTION" in dim:
        exp_type = "PROCESS_CHANGE"
        default_baselines = {"weekly_overtime_hours": 18.0, "pr_review_latency_days": 3.4}
        target_metrics = [
            ExperimentTargetMetric(metric_name="weekly_overtime_hours", baseline_value=18.0, target_value=0.0, unit="hours", desired_direction="DECREASE"),
            ExperimentTargetMetric(metric_name="pr_review_latency_days", baseline_value=3.4, target_value=1.2, unit="days", desired_direction="DECREASE")
        ]
        success_criteria = [
            "Engineering overtime normalized to 0 hours (40h workweek)",
            "PR code review latency drops below 1.5 days"
        ]
        hypothesis = "Capping uncommitted MVP scope and normalizing workweeks to 40 hours will reduce PR turnaround delay and stop burnout debt."

    # Use provided baseline metrics if supplied
    merged_baselines = {**default_baselines, **(baseline_metrics or {})}
    # Update target metrics baselines if custom values exist
    for tm in target_metrics:
        if tm.metric_name in merged_baselines:
            tm.baseline_value = merged_baselines[tm.metric_name]

    snapshot = ExperimentBaselineSnapshot(
        snapshot_id=f"snap_{uuid.uuid4().hex[:8]}",
        metrics=merged_baselines,
        is_immutable=True
    )

    return ExperimentItem(
        experiment_id=exp_id,
        project_id=project_id,
        organization_id=organization_id,
        intervention_id=intervention.intervention_id,
        failure_prediction_id="pred_active",
        target_signal_ids=intervention.target_signals,
        title=f"Experiment: {intervention.title}",
        experiment_type=exp_type,
        hypothesis=hypothesis,
        baseline_snapshot=snapshot,
        target_metrics=target_metrics,
        observation_period_days=14,
        success_criteria=success_criteria,
        owner=intervention.owner_role,
        status="ACTIVE", # Start active for primary recommendations in demo
        started_at=datetime.now(timezone.utc).isoformat(),
        progress_percent=60
    )

def generate_initial_experiments_from_plan(
    intervention_plan: InterventionPlanPacket
) -> ExperimentListPacket:
    """
    Generates recommended scientific experiments for top-priority interventions in the plan.
    """
    experiments: List[ExperimentItem] = []
    for intervention in intervention_plan.interventions[:3]:
        exp = create_experiment_from_intervention(
            intervention=intervention,
            project_id=intervention_plan.project_id,
            organization_id=intervention_plan.organization_id
        )
        experiments.append(exp)

    active_count = sum(1 for e in experiments if e.status == "ACTIVE")

    return ExperimentListPacket(
        project_id=intervention_plan.project_id,
        organization_id=intervention_plan.organization_id,
        experiments=experiments,
        active_experiment_count=active_count
    )
