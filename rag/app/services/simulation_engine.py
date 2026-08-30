import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.schemas.signal_packet import SignalPacket
from app.schemas.failure_dna import FailureDNAPacket
from app.schemas.simulation import ScenarioResult, SimulationComparisonPacket

logger = logging.getLogger(__name__)

def run_what_if_simulations(
    project_id: str,
    organization_id: str,
    signal_packet: SignalPacket,
    dna_packet: Optional[FailureDNAPacket] = None
) -> SimulationComparisonPacket:
    """
    Deterministically simulates 'What-if' operational scenarios and dynamically calculates
    risk changes based on the project's actual detected signals and Failure DNA weights.
    """
    baseline_risk = dna_packet.overall.risk_score if dna_packet else 0
    analysis_id = signal_packet.analysis_id
    signals = signal_packet.signals

    # Segment signals by operational domain
    adoption_signals = [s for s in signals if s.category.upper() in ["ADOPTION", "CUSTOMER"]]
    technical_signals = [s for s in signals if s.category.upper() in ["TECHNICAL", "QUALITY", "INFRASTRUCTURE"]]
    operational_signals = [s for s in signals if s.category.upper() in ["OPERATIONAL", "TEAM", "DELIVERY", "PROCESS"]]
    worsening_signals = [s for s in signals if s.status == "WORSENING" or s.polarity == "NEGATIVE"]

    scenarios: List[ScenarioResult] = []

    # Scenario 1: Do Nothing (Dynamic compounding from active worsening signals)
    compounding_factor = sum((s.signal_strength or 0.80) for s in worsening_signals)
    dynamic_increase = max(6, min(24, int(compounding_factor * 6.5))) if worsening_signals else 4
    do_nothing_sim_risk = min(98, baseline_risk + dynamic_increase)

    scenarios.append(
        ScenarioResult(
            scenario_id="do_nothing",
            scenario_name="Status Quo (Do Nothing)",
            description="Allow current signal trajectories and compounding backlog to evolve without intervention.",
            baseline_risk=baseline_risk,
            simulated_risk=do_nothing_sim_risk,
            risk_change=do_nothing_sim_risk - baseline_risk,
            affected_dimensions=["Execution", "Technical", "Adoption"],
            propagation_steps=[
                f"{len(worsening_signals)} active worsening signals continue unmitigated",
                f"Compounding velocity drag increases overall risk by +{dynamic_increase} points",
                "Trial user drop-off and defect queues escalate",
                "Release deadline missed by estimated 3-4 weeks"
            ],
            confidence=0.88,
            type="SIMULATION",
            explanation=f"Projected failure probability escalates from {baseline_risk}% to {do_nothing_sim_risk}% (+{dynamic_increase} points) as active bottlenecks compound."
        )
    )

    # Scenario 2: Streamline Onboarding Setup (Dynamically relief adoption risk)
    if adoption_signals:
        ad_strength = sum((s.signal_strength or 0.80) for s in adoption_signals)
        dynamic_onb_relief = max(8, min(35, int(ad_strength * 13.5)))
    else:
        dynamic_onb_relief = 5 # Baseline general improvement

    onboarding_sim_risk = max(15, baseline_risk - dynamic_onb_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="simplify_onboarding",
            scenario_name="Streamline Onboarding (7 Steps -> 3 Steps)",
            description="Eliminate mandatory first-run integration blockers and defer secondary KYC/workspace configuration.",
            baseline_risk=baseline_risk,
            simulated_risk=onboarding_sim_risk,
            risk_change=onboarding_sim_risk - baseline_risk,
            affected_dimensions=["Adoption", "Customer"],
            propagation_steps=[
                "First-run setup barrier reduced from 4 hours to 10 minutes",
                "Signup abandonment rate drops from peak to normal baseline",
                f"Adoption risk mitigated across {len(adoption_signals)} detected signals",
                f"Overall failure risk drops by {dynamic_onb_relief} points to {onboarding_sim_risk}%"
            ],
            confidence=0.91,
            type="SIMULATION",
            explanation=f"Matches Project Atlas recovery benchmark, dynamically reducing project risk by {dynamic_onb_relief} points to {onboarding_sim_risk}% based on adoption signal weights."
        )
    )

    # Scenario 3: Stabilize CI Pipeline & Flaky Test Suite
    if technical_signals:
        tech_strength = sum((s.signal_strength or 0.80) for s in technical_signals)
        dynamic_ci_relief = max(8, min(32, int(tech_strength * 11.5)))
    else:
        dynamic_ci_relief = 4

    ci_sim_risk = max(15, baseline_risk - dynamic_ci_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="fix_ci_failures",
            scenario_name="Stabilize CI/CD & Isolate Flaky Tests",
            description="Implement merge queue gates, quarantine flaky integration tests, and dedicate 1 sprint to build reliability.",
            baseline_risk=baseline_risk,
            simulated_risk=ci_sim_risk,
            risk_change=ci_sim_risk - baseline_risk,
            affected_dimensions=["Technical", "Execution"],
            propagation_steps=[
                "CI build failure rate reduced by 50%",
                "Staging deployment deadlocks eliminated",
                f"Technical reliability risk mitigated across {len(technical_signals)} signals",
                f"Overall failure risk drops by {dynamic_ci_relief} points to {ci_sim_risk}%"
            ],
            confidence=0.86,
            type="SIMULATION",
            explanation=f"Mitigating build deadlocks removes primary pipeline blockers, dynamically reducing risk by {dynamic_ci_relief} points to {ci_sim_risk}%."
        )
    )

    # Scenario 4: Freeze MVP Scope & Normalize Capacity
    if operational_signals:
        op_strength = sum((s.signal_strength or 0.80) for s in operational_signals)
        dynamic_scope_relief = max(7, min(30, int(op_strength * 11.0)))
    else:
        dynamic_scope_relief = 4

    scope_sim_risk = max(15, baseline_risk - dynamic_scope_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="freeze_scope",
            scenario_name="Freeze Scope & Eliminate Overtime",
            description="Cap uncommitted ERP integrations for Post-MVP release and normalize engineering workweeks to 40 hours.",
            baseline_risk=baseline_risk,
            simulated_risk=scope_sim_risk,
            risk_change=scope_sim_risk - baseline_risk,
            affected_dimensions=["Operational", "Quality"],
            propagation_steps=[
                "Scope expansion halted against fixed milestone",
                "Overtime normalized to 40 hours/week (fatigue reduction)",
                f"Review throughput recovered across {len(operational_signals)} operational signals",
                f"Overall failure risk drops by {dynamic_scope_relief} points to {scope_sim_risk}%"
            ],
            confidence=0.84,
            type="SIMULATION",
            explanation=f"Re-aligning capacity with commitments restores review depth, dynamically reducing risk by {dynamic_scope_relief} points to {scope_sim_risk}%."
        )
    )

    # Recommended scenario is the one with highest risk reduction
    best_scenario = min(scenarios[1:], key=lambda s: s.simulated_risk) if len(scenarios) > 1 else scenarios[0]

    return SimulationComparisonPacket(
        project_id=project_id,
        analysis_id=analysis_id,
        organization_id=organization_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        current_baseline_risk=baseline_risk,
        scenarios=scenarios,
        recommended_scenario=best_scenario.scenario_id
    )

