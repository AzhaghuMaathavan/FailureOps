import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from app.core.config import settings
from app.schemas.signal_packet import SignalPacket
from app.schemas.failure_dna import FailureDNAPacket
from app.schemas.historical_memory import HistoricalCase, HistoricalMemoryPacket

logger = logging.getLogger(__name__)

# Benchmark Seeded Historical Memory Repository (Anonymized Industry Failures & Recoveries)
BENCHMARK_HISTORICAL_CASES: List[HistoricalCase] = [
    HistoricalCase(
        id="case_atlas_01",
        name="Project Atlas (B2B SaaS)",
        company_alias="Atlas Cloud Analytics",
        industry="Enterprise SaaS",
        pattern="ONBOARDING_ADOPTION_COLLAPSE",
        signals=["activation_decreasing", "signup_abandonment_increasing", "onboarding_friction"],
        failure="Trial-to-paid conversion collapsed from 31% to 8% due to mandatory multi-step KYC and workspace invite friction.",
        intervention="Reduced mandatory setup from 7 steps to 3 steps with deferred workspace configurations.",
        outcome="Activation lifted +27 percentage points (31% -> 58%) within 30 days.",
        outcome_type="RECOVERED",
        similarity=94,
        confidence=0.96,
        visibility="GLOBAL_ANONYMIZED",
        is_synthetic_demo=True,
        before_metrics={"activation_rate": 31.0, "signup_abandonment": 74.0},
        after_metrics={"activation_rate": 58.0, "signup_abandonment": 28.0},
        key_lessons=[
            "Never require external integrations during first-run user activation.",
            "De-couple workspace invitations from single-user account provisioning."
        ]
    ),
    HistoricalCase(
        id="case_nova_02",
        name="Project Nova (Fintech Infrastructure)",
        company_alias="Nova Core Banking",
        industry="Fintech Infrastructure",
        pattern="ONBOARDING_ADOPTION_COLLAPSE",
        signals=["activation_decreasing", "customer_complaints", "onboarding_friction"],
        failure="Bank sandbox verification blocked 68% of enterprise evaluators before API keys were generated.",
        intervention="Introduced instant mock sandbox credentials and self-guided quickstart wizard.",
        outcome="Evaluator setup completion jumped from 22% to 71%; conversion increased +21 percentage points.",
        outcome_type="RECOVERED",
        similarity=88,
        confidence=0.92,
        visibility="GLOBAL_ANONYMIZED",
        is_synthetic_demo=True,
        before_metrics={"activation_rate": 22.0, "time_to_first_call_hours": 48.0},
        after_metrics={"activation_rate": 71.0, "time_to_first_call_hours": 0.2},
        key_lessons=[
            "Provide instant mock responses rather than blocking on real bank environment keys."
        ]
    ),
    HistoricalCase(
        id="case_phoenix_03",
        name="Project Phoenix (DevOps Platform)",
        company_alias="Phoenix CI Systems",
        industry="Developer Tools",
        pattern="TECHNICAL_PIPELINE_COLLAPSE",
        signals=["ci_failures_increasing", "bug_backlog_increasing", "staging_deadlock"],
        failure="Microservice test deadlock caused 45% CI failure rate, delaying Q3 release milestone by 7 weeks.",
        intervention="Isolated flaky integration tests, established merge queue gating, and halted new feature scope for 2 sprints.",
        outcome="CI pass rate stabilized from 55% to 94%; release velocity recovered +35%.",
        outcome_type="RECOVERED",
        similarity=91,
        confidence=0.94,
        visibility="GLOBAL_ANONYMIZED",
        is_synthetic_demo=True,
        before_metrics={"ci_failure_rate": 45.0, "pr_review_latency_days": 4.1},
        after_metrics={"ci_failure_rate": 6.0, "pr_review_latency_days": 1.2},
        key_lessons=[
            "Flaky integration tests compounded across branches must be quarantined immediately."
        ]
    ),
    HistoricalCase(
        id="case_horizon_04",
        name="Project Horizon (Healthcare AI)",
        company_alias="Horizon Health Platform",
        industry="Healthtech",
        pattern="OPERATIONAL_BURNOUT_DEBT",
        signals=["overtime_increasing", "pr_review_latency", "developer_burnout"],
        failure="Engineering team sustained 60-hour workweeks to meet artificial launch date, leading to 3 senior engineer resignations.",
        intervention="Re-negotiated fixed milestone scope, eliminated 4 uncommitted partner integrations, and capped sprint points.",
        outcome="Team overtime normalized to 40 hours; PR review latency dropped from 3.8 days to 1.1 days.",
        outcome_type="RECOVERED",
        similarity=84,
        confidence=0.89,
        visibility="GLOBAL_ANONYMIZED",
        is_synthetic_demo=True,
        before_metrics={"workweek_hours": 60.0, "pr_review_latency_days": 3.8},
        after_metrics={"workweek_hours": 40.0, "pr_review_latency_days": 1.1},
        key_lessons=[
            "Fixed launch deadlines with expanding PRD scope guarantees quality regression."
        ]
    ),
    HistoricalCase(
        id="case_polaris_05",
        name="Project Polaris (B2B Marketplace)",
        company_alias="Polaris Logistics",
        industry="Logistics Tech",
        pattern="HEALTHY_EXPANSION_TRAJECTORY",
        signals=["growth", "retention_increasing", "incidents_decreasing"],
        failure="No failure observed; model company that executed incremental rollout gates.",
        intervention="Maintained strict automated canary deployments and user cohort feedback loops.",
        outcome="Achieved 99.95% availability with 78% 90-day retention.",
        outcome_type="RECOVERED",
        similarity=80,
        confidence=0.91,
        visibility="GLOBAL_ANONYMIZED",
        is_synthetic_demo=True,
        before_metrics={"retention_rate": 65.0},
        after_metrics={"retention_rate": 78.0},
        key_lessons=[
            "Gated beta rollouts prevent premature customer trust deterioration."
        ]
    )
]

def search_historical_failure_cases(
    project_id: str,
    organization_id: str,
    signal_packet: SignalPacket,
    dna_packet: Optional[FailureDNAPacket] = None,
    caller_org_id: Optional[str] = None
) -> HistoricalMemoryPacket:
    """
    Queries permitted historical failure cases matching the project's Failure DNA and active signals.
    Enforces strict 3-tier privacy boundaries: PRIVATE, ORGANIZATION, GLOBAL_ANONYMIZED.
    """
    signals = signal_packet.signals
    auth_org = caller_org_id or organization_id

    active_pattern = "UNKNOWN"
    all_sig_names = " ".join([f"{s.name} {s.category}".lower() for s in signals])

    if any(kw in all_sig_names for kw in ["ci", "pipeline", "bug", "defect", "technical"]):
        active_pattern = "TECHNICAL_PIPELINE_COLLAPSE"
    elif any(kw in all_sig_names for kw in ["overtime", "hours", "pr review", "burnout"]):
        active_pattern = "OPERATIONAL_BURNOUT_DEBT"
    elif any(kw in all_sig_names for kw in ["onboarding", "activation", "signup", "adoption"]):
        active_pattern = "ONBOARDING_ADOPTION_COLLAPSE"
    elif any(kw in all_sig_names for kw in ["growth", "increased from"]):
        active_pattern = "HEALTHY_EXPANSION_TRAJECTORY"

    matched_cases: List[HistoricalCase] = []

    for case in BENCHMARK_HISTORICAL_CASES:
        if case.is_synthetic_demo and not settings.DEMO_MODE:
            continue
        # Privacy policy enforcement
        if case.visibility == "PRIVATE":
            if case.source_project_id != project_id or case.organization_id != auth_org:
                continue # Block unauthorized private case

        elif case.visibility == "ORGANIZATION":
            if case.organization_id != auth_org:
                continue # Block cross-organization case

        # GLOBAL_ANONYMIZED is permitted across all authorized clients

        # Compute dynamic similarity score based on pattern alignment and signal overlap
        sim_score = case.similarity
        if case.pattern == active_pattern:
            sim_score = min(96, sim_score + 4)
        else:
            sim_score = max(50, sim_score - 15)

        # Clone and update similarity for this project run
        matched_case = case.model_copy(update={"similarity": sim_score})
        matched_cases.append(matched_case)

    # Sort descending by similarity
    matched_cases.sort(key=lambda c: c.similarity, reverse=True)

    return HistoricalMemoryPacket(
        project_id=project_id,
        analysis_id=signal_packet.analysis_id,
        organization_id=organization_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        current_pattern=active_pattern.replace("_", " ").title(),
        total_matches=len(matched_cases),
        matched_cases=matched_cases[:4]
    )
