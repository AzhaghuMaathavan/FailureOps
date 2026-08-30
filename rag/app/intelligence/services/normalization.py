import re
from typing import Tuple, Dict, Any
from ..schemas.signals import SignalCategory

CANONICAL_SIGNAL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "UNRESOLVED_BUGS": {
        "category": SignalCategory.TECHNICAL,
        "aliases": [
            "open bugs", "unresolved defects", "pending bugs", "bug backlog", 
            "defect count", "issues open", "active bugs", "jira bugs", "unresolved issues"
        ]
    },
    "CI_FAILURES": {
        "category": SignalCategory.TECHNICAL,
        "aliases": [
            "build failures", "pipeline failures", "ci errors", "failed builds", 
            "ci test failures", "ci failures", "broken builds", "workflow failures"
        ]
    },
    "CODE_REVIEW_VELOCITY": {
        "category": SignalCategory.TECHNICAL,
        "aliases": [
            "code review activity", "pr review time", "pull request throughput", 
            "review velocity", "pr turnaround", "github pr activity", "code reviews"
        ]
    },
    "DEPLOYMENT_FREQUENCY": {
        "category": SignalCategory.TECHNICAL,
        "aliases": [
            "deploy frequency", "release cadence", "deploys per day", "deploy rate", "deployment rate"
        ]
    },
    "ERROR_RATE": {
        "category": SignalCategory.TECHNICAL,
        "aliases": [
            "http errors", "api 500s", "exception rate", "crash rate", "failure rate", "error rate"
        ]
    },
    "DEVELOPER_OVERTIME": {
        "category": SignalCategory.OPERATIONAL,
        "aliases": [
            "overtime", "extra hours", "weekend work", "dev overtime", 
            "team overtime", "developer overtime", "burnout hours"
        ]
    },
    "RELEASE_DELAY": {
        "category": SignalCategory.OPERATIONAL,
        "aliases": [
            "release postponed", "delayed release", "schedule slippage", 
            "launch delay", "release delay", "timeline slip"
        ]
    },
    "SPRINT_VELOCITY_DROP": {
        "category": SignalCategory.OPERATIONAL,
        "aliases": [
            "velocity drop", "reduced velocity", "story points deficit", "sprint slip"
        ]
    },
    "ATTENDANCE_DROP": {
        "category": SignalCategory.ACADEMIC,
        "aliases": [
            "attendance drop", "low attendance", "absenteeism", "attendance deficit", 
            "student attendance", "attendance percentage drop"
        ]
    },
    "EXAM_RESCHEDULING": {
        "category": SignalCategory.ACADEMIC,
        "aliases": [
            "exam postponed", "rescheduled exams", "exam delay", "examination change"
        ]
    },
    "FEE_DEFAULT_RATE": {
        "category": SignalCategory.FINANCIAL,
        "aliases": [
            "unpaid fees", "fee default", "dues pending", "tuition arrears", "fee collection drop"
        ]
    }
}

def normalize_signal_name(raw_name: str) -> Tuple[str, SignalCategory]:
    """
    Deterministic rule-based normalizer mapping arbitrary/raw metric or signal names
    to the FailureOps canonical signal taxonomy.
    """
    if not raw_name:
        return "UNKNOWN_SIGNAL", SignalCategory.TECHNICAL

    cleaned = re.sub(r"[^a-zA-Z0-9\s_]", " ", raw_name).strip().lower()
    
    # 1. Direct registry key match
    upper_candidate = cleaned.upper().replace(" ", "_")
    if upper_candidate in CANONICAL_SIGNAL_REGISTRY:
        return upper_candidate, CANONICAL_SIGNAL_REGISTRY[upper_candidate]["category"]

    # 2. Alias matching
    for canonical_name, config in CANONICAL_SIGNAL_REGISTRY.items():
        for alias in config["aliases"]:
            if alias in cleaned or cleaned in alias:
                return canonical_name, config["category"]

    # 3. Heuristic category inference
    if any(k in cleaned for k in ["bug", "ci", "build", "code", "deploy", "error", "test", "commit"]):
        return upper_candidate, SignalCategory.TECHNICAL
    elif any(k in cleaned for k in ["overtime", "team", "staff", "sprint", "schedule", "delay", "hiring"]):
        return upper_candidate, SignalCategory.OPERATIONAL
    elif any(k in cleaned for k in ["cost", "fee", "budget", "revenue", "expense", "financial"]):
        return upper_candidate, SignalCategory.FINANCIAL
    elif any(k in cleaned for k in ["attendance", "exam", "course", "grade", "student", "faculty"]):
        return upper_candidate, SignalCategory.ACADEMIC

    return upper_candidate, SignalCategory.TECHNICAL
