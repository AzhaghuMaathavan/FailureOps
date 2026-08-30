import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.schemas.signal_packet import SignalPacket
from app.schemas.failure_dna import FailureDNAPacket
from app.schemas.failure_chain import FailureChainPacket
from app.schemas.intervention import InterventionPlanPacket
from app.schemas.experiment import ExperimentListPacket
from app.schemas.historical_memory import HistoricalMemoryPacket
from app.schemas.radar import RadarTopRisk, RadarTrajectoryPoint, RadarExecutiveSnapshotPacket

logger = logging.getLogger(__name__)

def synthesize_failure_radar_snapshot(
    signal_packet: SignalPacket,
    dna_packet: Optional[FailureDNAPacket] = None,
    chain_packet: Optional[FailureChainPacket] = None,
    intervention_plan: Optional[InterventionPlanPacket] = None,
    experiment_list: Optional[ExperimentListPacket] = None,
    memory_packet: Optional[HistoricalMemoryPacket] = None
) -> RadarExecutiveSnapshotPacket:
    """
    Synthesizes a unified Executive Failure Radar snapshot combining all upstream layers:
    Health, Top Risks, Prediction, Recommended Action, Active Experiments, Historical Lessons, and Trajectory.
    """
    project_id = signal_packet.project_id
    organization_id = signal_packet.organization_id
    analysis_id = signal_packet.analysis_id

    # 1. Overall Health & Risk
    overall_risk = dna_packet.overall.risk_score if dna_packet else 0
    overall_health = dna_packet.overall.status if dna_packet else "INSUFFICIENT_EVIDENCE"
    velocity = dna_packet.overall.trend if dna_packet else "UNKNOWN"

    # 2. Extract Top 3 Failure Risks from DNA and Signals
    top_risks: List[RadarTopRisk] = []
    if dna_packet:
        sorted_dims = sorted(
            [d for d in dna_packet.dimensions if d.risk_score is not None],
            key=lambda d: d.risk_score or 0,
            reverse=True
        )
        for idx, dim in enumerate(sorted_dims[:3]):
            evidence_id = dim.evidence_ids[0] if dim.evidence_ids else "ev_root"
            lvl = "CRITICAL" if (dim.risk_score or 0) >= 80 else ("HIGH" if (dim.risk_score or 0) >= 65 else "MEDIUM")
            top_risks.append(
                RadarTopRisk(
                    rank=idx + 1,
                    name=f"{dim.dimension} Stress",
                    dimension=dim.dimension,
                    risk_level=lvl,
                    risk_score=dim.risk_score or 0,
                    confidence=dim.confidence,
                    primary_evidence_id=evidence_id,
                    why_explanation=dim.why_explanation,
                    contributing_signals=dim.primary_drivers,
                    evidence_ids=dim.evidence_ids
                )
            )

    # 3. Prediction
    pred_title = (
        chain_packet.prediction.predicted_failure
        if chain_packet and chain_packet.prediction
        else "Insufficient evidence for a reliable failure prediction."
    )
    pred_conf = chain_packet.prediction.confidence if chain_packet and chain_packet.prediction else 0.0

    # 4. Primary Intervention
    primary_action = "Insufficient evidence for a recommended action"
    primary_prio = 0
    if intervention_plan and intervention_plan.interventions:
        top_int = intervention_plan.interventions[0]
        primary_action = top_int.title
        primary_prio = top_int.priority_score

    # 5. Active Experiment
    active_exp_title = None
    active_exp_count = 0
    active_exp_progress = 0
    if experiment_list and experiment_list.experiments:
        active_exps = [e for e in experiment_list.experiments if e.status == "ACTIVE"]
        active_exp_count = len(active_exps)
        if active_exps:
            active_exp_title = active_exps[0].title
            active_exp_progress = active_exps[0].progress_percent

    # 6. Historical Matches
    hist_count = memory_packet.total_matches if memory_packet else 0
    best_recovery = None
    if memory_packet and memory_packet.matched_cases:
        top_c = memory_packet.matched_cases[0]
        best_recovery = f"{top_c.outcome} ({top_c.name})"

    # 7. Time-series Trajectory History (Backed by realistic interval steps)
    trajectory_points = []
    if dna_packet and overall_risk is not None:
        trajectory_points = [
            RadarTrajectoryPoint(timestamp="Current", label="Now", risk_score=int(overall_risk))
        ]

    all_ev_ids = [s.supporting_evidence_ids[0] for s in signal_packet.signals if s.supporting_evidence_ids]

    return RadarExecutiveSnapshotPacket(
        project_id=project_id,
        organization_id=organization_id,
        analysis_id=analysis_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        overall_risk_score=overall_risk,
        overall_health=overall_health,
        risk_velocity=velocity,
        top_failure_risks=top_risks,
        predicted_next_failure=pred_title,
        prediction_confidence=pred_conf,
        recommended_primary_action=primary_action,
        primary_action_priority=primary_prio,
        active_experiments_count=active_exp_count,
        active_experiment_title=active_exp_title,
        active_experiment_progress=active_exp_progress,
        historical_similar_matches_count=hist_count,
        best_historical_recovery_delta=best_recovery,
        risk_trajectory_history=trajectory_points,
        corroborating_evidence_ids=list(dict.fromkeys(all_ev_ids))[:5]
    )
