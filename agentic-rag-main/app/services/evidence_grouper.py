import re
import logging
from typing import List, Dict, Any, Optional
from app.schemas.signal_input import SignalInputContext, VerifiedEvidenceContextItem
from app.schemas.evidence_group import EvidenceGroup, EvidenceGroupCollection

logger = logging.getLogger(__name__)

# Domain topic clustering definitions
TOPIC_CLUSTERS: Dict[str, Dict[str, Any]] = {
    "ONBOARDING_ADOPTION": {
        "name": "Onboarding & Adoption Dynamics",
        "category": "ADOPTION",
        "keywords": ["activation", "onboarding", "signup", "drop-off", "abandonment", "trial", "conversion", "setup", "kyc", "invitation", "invite"],
    },
    "PRICING_VALUE": {
        "name": "Pricing & Commercial Value Perception",
        "category": "CUSTOMER",
        "keywords": ["pricing", "cost", "price", "seat", "tier", "subscription", "plan", "$"],
    },
    "CUSTOMER_SUPPORT_SENTIMENT": {
        "name": "Qualitative Customer Support & Sentiment",
        "category": "CUSTOMER",
        "keywords": ["support", "ticket", "survey", "nps", "sentiment", "complaint", "feedback", "interview"],
    },
    "PIPELINE_STABILITY": {
        "name": "CI/CD & Deployment Pipeline Stability",
        "category": "TECHNICAL",
        "keywords": ["ci/cd", "pipeline", "build", "deployment", "staging", "flaky", "test suite", "branch", "merge"],
    },
    "DEFECTS_BACKLOG": {
        "name": "Defect Compounding & Bug Backlog",
        "category": "QUALITY",
        "keywords": ["bug", "defect", "p1", "p2", "regression", "backlog", "mttr", "resolution", "deadlock"],
    },
    "TEAM_OPERATIONS_FATIGUE": {
        "name": "Engineering Workload & Review Latency",
        "category": "OPERATIONAL",
        "keywords": ["overtime", "hours", "workweek", "pr review", "pull request", "review latency", "morale", "burnout", "context switching"],
    },
    "DELIVERY_TIMELINE": {
        "name": "Scope Evolution & Release Milestones",
        "category": "DELIVERY",
        "keywords": ["milestone", "deadline", "schedule", "mvp", "beta", "roadmap", "scope", "launch", "october"],
    },
    "FINANCIAL_METRICS": {
        "name": "Financial & Revenue Trajectory",
        "category": "FINANCIAL",
        "keywords": ["arr", "mrr", "revenue", "burn rate", "runway", "cash flow", "budget", "profit"],
    },
    "SYSTEM_PERFORMANCE": {
        "name": "Latency & Architectural Throughput",
        "category": "PERFORMANCE",
        "keywords": ["latency", "throughput", "cpu", "memory", "response time", "deadlock", "database query"],
    },
    "SECURITY_COMPLIANCE": {
        "name": "Security & Governance Posture",
        "category": "SECURITY",
        "keywords": ["soc2", "hipaa", "gdpr", "auth", "compliance", "vulnerability", "leak"],
    }
}

def extract_item_topic_affinity(item: VerifiedEvidenceContextItem) -> str:
    """
    Identifies the specific operational topic cluster for an evidence item.
    """
    stmt_clean = item.statement.lower()
    metric_name = (item.normalized_value.metric.lower() if item.normalized_value else "")
    cat = item.category.upper()

    # Match against topic clusters
    for cluster_id, cluster_info in TOPIC_CLUSTERS.items():
        if any(kw in stmt_clean or kw in metric_name for kw in cluster_info["keywords"]):
            return cluster_id

    # Fallback to category-based cluster
    return f"CATEGORY_{cat}"

def group_verified_evidence(context: SignalInputContext) -> EvidenceGroupCollection:
    """
    Deterministically groups verified evidence items into cohesive, non-overlapping operational clusters.
    Ensures zero evidence loss and preserves all source lineages and IDs.
    """
    if not context.verified_evidence:
        return EvidenceGroupCollection(
            project_id=context.project_id,
            analysis_id=context.analysis_id,
            organization_id=context.organization_id,
            total_groups=0,
            groups=[]
        )

    cluster_buckets: Dict[str, List[VerifiedEvidenceContextItem]] = {}
    for it in context.verified_evidence:
        topic_id = extract_item_topic_affinity(it)
        cluster_buckets.setdefault(topic_id, []).append(it)

    groups: List[EvidenceGroup] = []
    group_counter = 1

    for topic_id, items in cluster_buckets.items():
        if not items:
            continue

        if topic_id in TOPIC_CLUSTERS:
            group_name = TOPIC_CLUSTERS[topic_id]["name"]
            primary_cat = TOPIC_CLUSTERS[topic_id]["category"]
        else:
            primary_cat = items[0].category
            group_name = f"{primary_cat.title()} Observations"

        ev_ids = [it.evidence_id for it in items]
        metrics_list = []
        for it in items:
            if it.normalized_value and it.normalized_value.metric:
                if it.normalized_value.metric not in metrics_list:
                    metrics_list.append(it.normalized_value.metric)

        # Average confidence
        avg_conf = round(sum(it.confidence for it in items) / len(items), 3)

        # Determine time period if available
        first_period = next((it.time_period for it in items if it.time_period), None)

        groups.append(
            EvidenceGroup(
                group_id=f"grp_{group_counter:03d}",
                group_name=group_name,
                primary_category=primary_cat,
                evidence_ids=ev_ids,
                evidence_items=items,
                metrics_tracked=metrics_list,
                time_period=first_period,
                group_confidence=avg_conf
            )
        )
        group_counter += 1

    return EvidenceGroupCollection(
        project_id=context.project_id,
        analysis_id=context.analysis_id,
        organization_id=context.organization_id,
        total_groups=len(groups),
        groups=groups
    )
