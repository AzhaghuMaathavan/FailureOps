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
    do_nothing_ev_ids = list(dict.fromkeys([eid for s in worsening_signals for eid in s.supporting_evidence_ids]))

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
                f"{len(worsening_signals)} active worsening signal(s) ({', '.join([s.name for s in worsening_signals[:3]]) or 'telemetry'}) continue unmitigated",
                f"Compounding velocity drag increases overall risk by +{dynamic_increase} points",
                "Downstream user drop-off and defect queues escalate",
                "Release deadline slipped beyond planned operational window"
            ],
            target_signals=[s.name for s in worsening_signals],
            supporting_evidence_ids=do_nothing_ev_ids[:6],
            confidence=0.88,
            type="SIMULATION",
            explanation=f"Projected failure probability escalates from {baseline_risk}% to {do_nothing_sim_risk}% (+{dynamic_increase} points) as active bottlenecks compound."
        )
    )

    # Scenario 2: Adoption Signal Remediation
    ad_ev_ids = list(dict.fromkeys([eid for s in adoption_signals for eid in s.supporting_evidence_ids]))
    if adoption_signals:
        primary_ad_sig = adoption_signals[0].name
        ad_strength = sum((s.signal_strength or 0.80) for s in adoption_signals)
        dynamic_onb_relief = max(8, min(35, int(ad_strength * 13.5)))
        ad_name = f"Remediate {primary_ad_sig} & Streamline Activation"
        ad_desc = f"Target {primary_ad_sig} by eliminating mandatory first-run friction and optimizing onboarding."
        ad_prop = [
            f"{primary_ad_sig} setup barrier streamlined to reduce friction",
            "Signup abandonment rate drops from peak to normal baseline",
            f"Adoption risk mitigated across {len(adoption_signals)} detected signal(s)",
            f"Overall failure risk drops by {dynamic_onb_relief} points to {max(15, baseline_risk - dynamic_onb_relief)}%"
        ]
    else:
        dynamic_onb_relief = 5
        ad_name = "Streamline Onboarding Workflow"
        ad_desc = "Eliminate mandatory first-run integration blockers and defer secondary setup."
        ad_prop = [
            "First-run setup barrier reduced to streamline activation",
            "Abandonment rate normalized across onboarding funnel",
            f"Overall failure risk drops by {dynamic_onb_relief} points"
        ]

    onboarding_sim_risk = max(15, baseline_risk - dynamic_onb_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="simplify_onboarding",
            scenario_name=ad_name,
            description=ad_desc,
            baseline_risk=baseline_risk,
            simulated_risk=onboarding_sim_risk,
            risk_change=onboarding_sim_risk - baseline_risk,
            affected_dimensions=["Adoption", "Customer"],
            propagation_steps=ad_prop,
            target_signals=[s.name for s in adoption_signals],
            supporting_evidence_ids=ad_ev_ids[:6],
            confidence=0.91,
            type="SIMULATION",
            explanation=f"Dynamically reduces project risk by {dynamic_onb_relief} points to {onboarding_sim_risk}% based on adoption signal weights."
        )
    )

    # Scenario 3: Technical Signal & CI Stabilization
    tech_ev_ids = list(dict.fromkeys([eid for s in technical_signals for eid in s.supporting_evidence_ids]))
    if technical_signals:
        primary_tech_sig = technical_signals[0].name
        tech_strength = sum((s.signal_strength or 0.80) for s in technical_signals)
        dynamic_ci_relief = max(8, min(32, int(tech_strength * 11.5)))
        tech_name = f"Stabilize {primary_tech_sig} & Quarantine Defects"
        tech_desc = f"Implement automated pre-flight gates and dedicate focused capacity to isolate {primary_tech_sig} bottlenecks."
        tech_prop = [
            f"{primary_tech_sig} failure rate reduced through automated validation gates",
            "Staging deployment deadlocks eliminated",
            f"Technical reliability risk mitigated across {len(technical_signals)} signal(s)",
            f"Overall failure risk drops by {dynamic_ci_relief} points to {max(15, baseline_risk - dynamic_ci_relief)}%"
        ]
    else:
        dynamic_ci_relief = 4
        tech_name = "Stabilize CI/CD & Isolate Flaky Tests"
        tech_desc = "Implement merge queue gates, quarantine flaky integration tests, and dedicate capacity to build reliability."
        tech_prop = [
            "Build failure rate reduced through automated validation",
            "Deployment deadlocks eliminated",
            f"Overall failure risk drops by {dynamic_ci_relief} points"
        ]

    ci_sim_risk = max(15, baseline_risk - dynamic_ci_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="fix_ci_failures",
            scenario_name=tech_name,
            description=tech_desc,
            baseline_risk=baseline_risk,
            simulated_risk=ci_sim_risk,
            risk_change=ci_sim_risk - baseline_risk,
            affected_dimensions=["Technical", "Execution"],
            propagation_steps=tech_prop,
            target_signals=[s.name for s in technical_signals],
            supporting_evidence_ids=tech_ev_ids[:6],
            confidence=0.86,
            type="SIMULATION",
            explanation=f"Mitigating build deadlocks removes primary pipeline blockers, dynamically reducing risk by {dynamic_ci_relief} points to {ci_sim_risk}%."
        )
    )

    # Scenario 4: Operational & Capacity Optimization
    op_ev_ids = list(dict.fromkeys([eid for s in operational_signals for eid in s.supporting_evidence_ids]))
    if operational_signals:
        primary_op_sig = operational_signals[0].name
        op_strength = sum((s.signal_strength or 0.80) for s in operational_signals)
        dynamic_scope_relief = max(7, min(30, int(op_strength * 11.0)))
        op_name = f"Resolve {primary_op_sig} & Re-align Scope"
        op_desc = f"Normalize review queues and cap uncommitted backlog to restore team throughput on {primary_op_sig}."
        op_prop = [
            f"Scope expansion halted against fixed milestone to relieve {primary_op_sig}",
            "Overtime normalized to 40 hours/week (fatigue reduction)",
            f"Review throughput recovered across {len(operational_signals)} operational signal(s)",
            f"Overall failure risk drops by {dynamic_scope_relief} points to {max(15, baseline_risk - dynamic_scope_relief)}%"
        ]
    else:
        dynamic_scope_relief = 4
        op_name = "Freeze Scope & Normalize Capacity"
        op_desc = "Cap uncommitted integrations for release and normalize engineering workweeks."
        op_prop = [
            "Scope expansion halted against fixed milestone",
            "Overtime normalized to eliminate fatigue",
            f"Overall failure risk drops by {dynamic_scope_relief} points"
        ]

    scope_sim_risk = max(15, baseline_risk - dynamic_scope_relief)
    scenarios.append(
        ScenarioResult(
            scenario_id="freeze_scope",
            scenario_name=op_name,
            description=op_desc,
            baseline_risk=baseline_risk,
            simulated_risk=scope_sim_risk,
            risk_change=scope_sim_risk - baseline_risk,
            affected_dimensions=["Operational", "Quality"],
            propagation_steps=op_prop,
            target_signals=[s.name for s in operational_signals],
            supporting_evidence_ids=op_ev_ids[:6],
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

