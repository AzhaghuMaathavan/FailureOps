import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.schemas.experiment import ExperimentItem, ExperimentTargetMetric
from app.schemas.outcome import (
    MetricOutcomeDelta, ExperimentOutcomeReport, OutcomeVerificationPacket
)

logger = logging.getLogger(__name__)

LOWER_IS_BETTER_METRICS = {
    "ci_failure_rate", "defect_backlog", "pr_review_latency_days",
    "weekly_overtime_hours", "signup_abandonment", "incident_count",
    "turnaround_time", "crash_rate", "churn_rate"
}

def verify_experiment_outcome(
    experiment: ExperimentItem,
    measured_metrics: Dict[str, float],
    has_concurrent_unrelated_changes: bool = False,
    evidence_ids: Optional[List[str]] = None
) -> ExperimentOutcomeReport:
    """
    Deterministically evaluates an experiment by comparing immutable baseline against measured outcomes,
    respecting metric polarity and epistemic attribution safety.
    """
    outcome_id = f"out_{experiment.experiment_id}_{uuid.uuid4().hex[:6]}"
    deltas: List[MetricOutcomeDelta] = []
    
    if not measured_metrics:
        return ExperimentOutcomeReport(
            outcome_id=outcome_id,
            experiment_id=experiment.experiment_id,
            project_id=experiment.project_id,
            organization_id=experiment.organization_id,
            intervention_title=experiment.title,
            status="INSUFFICIENT_EVIDENCE",
            metric_deltas=[],
            attribution_confidence="LOW",
            attribution_reasoning="No follow-up telemetry or post-intervention evidence available to measure outcome.",
            summary="Experiment outcome cannot be verified due to missing post-intervention measurements.",
            evidence_ids=evidence_ids or []
        )

    targets_met_count = 0
    total_improved_count = 0

    for target_m in experiment.target_metrics:
        name = target_m.metric_name
        baseline = target_m.baseline_value
        after = measured_metrics.get(name, baseline)
        
        lower_better = (name in LOWER_IS_BETTER_METRICS) or (target_m.desired_direction == "DECREASE")
        polarity = "POSITIVE_WHEN_DECREASING" if lower_better else "POSITIVE_WHEN_INCREASING"

        if lower_better:
            pct_improvement = ((baseline - after) / max(0.001, baseline)) * 100.0 if baseline > 0 else 0.0
            is_improved = after < baseline
            target_met = after <= target_m.target_value
        else:
            pct_improvement = ((after - baseline) / max(0.001, baseline)) * 100.0 if baseline > 0 else 0.0
            is_improved = after > baseline
            target_met = after >= target_m.target_value

        if target_met:
            targets_met_count += 1
        if is_improved:
            total_improved_count += 1

        deltas.append(
            MetricOutcomeDelta(
                metric_name=name,
                baseline_value=baseline,
                measured_after_value=after,
                unit=target_m.unit,
                polarity=polarity,
                percent_improvement=round(pct_improvement, 1),
                is_improved=is_improved,
                target_met=target_met
            )
        )

    total_targets = len(experiment.target_metrics) if experiment.target_metrics else 1
    
    # Deterministic Status Assignment
    if targets_met_count == total_targets:
        status = "SUCCESS"
    elif targets_met_count > 0 or total_improved_count > 0:
        status = "PARTIAL_SUCCESS"
    elif any(d.percent_improvement < -5.0 for d in deltas):
        status = "REGRESSION"
    else:
        status = "NO_EFFECT"

    # Epistemic Attribution Safety
    if has_concurrent_unrelated_changes:
        attr_conf = "LOW"
        attr_reason = "Multiple concurrent architectural or organizational changes were detected during the trial period. Attribution remains correlational."
    else:
        attr_conf = "HIGH" if status == "SUCCESS" else "MEDIUM"
        attr_reason = f"Metric deltas directly align with the hypothesized mechanism of action for '{experiment.title}'."

    summary = f"Outcome classified as {status}: {targets_met_count}/{total_targets} target thresholds achieved across post-intervention observation."

    return ExperimentOutcomeReport(
        outcome_id=outcome_id,
        experiment_id=experiment.experiment_id,
        project_id=experiment.project_id,
        organization_id=experiment.organization_id,
        intervention_title=experiment.title,
        status=status,
        metric_deltas=deltas,
        attribution_confidence=attr_conf,
        attribution_reasoning=attr_reason,
        summary=summary,
        evidence_ids=evidence_ids or []
    )

def verify_all_project_experiments(
    experiments: List[ExperimentItem]
) -> OutcomeVerificationPacket:
    """
    Verifies all active/completed experiments for a project.
    """
    if not experiments:
        return OutcomeVerificationPacket(
            project_id="unknown",
            organization_id="unknown",
            outcomes=[],
            overall_success_rate=0.0
        )

    project_id = experiments[0].project_id
    organization_id = experiments[0].organization_id
    outcomes: List[ExperimentOutcomeReport] = []

    for exp in experiments:
        rep = verify_experiment_outcome(
            experiment=exp,
            measured_metrics={},
            has_concurrent_unrelated_changes=False
        )
        outcomes.append(rep)

    success_count = sum(1 for o in outcomes if o.status in ["SUCCESS", "PARTIAL_SUCCESS"])
    success_rate = (success_count / len(outcomes) * 100.0) if outcomes else 0.0

    return OutcomeVerificationPacket(
        project_id=project_id,
        organization_id=organization_id,
        outcomes=outcomes,
        overall_success_rate=round(success_rate, 1)
    )
