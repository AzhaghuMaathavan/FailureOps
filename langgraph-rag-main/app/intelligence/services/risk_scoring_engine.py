import re
import logging
from enum import Enum
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class Polarity(str, Enum):
    HIGHER_IS_WORSE = "HIGHER_IS_WORSE"       # Latency, Bugs, Error Rate, Overtime, Dropout
    LOWER_IS_WORSE = "LOWER_IS_WORSE"         # Availability, Uptime, Throughput, CSAT, Retention
    TARGET_BAND = "TARGET_BAND"               # Team Utilization (70-85%), Battery SOC, Temp
    NEUTRAL_INFORMATIONAL = "NEUTRAL_INFORMATIONAL" # Request Volume, Headcount, Total Records

class RiskScoringMethod(str, Enum):
    EXPLICIT_SLA_BENCHMARK = "EXPLICIT_SLA_BENCHMARK"
    DOMAIN_ARCHETYPE = "DOMAIN_ARCHETYPE"
    BASELINE_RELATIVE_DELTA = "BASELINE_RELATIVE_DELTA"
    NEUTRAL_TELEMETRY = "NEUTRAL_TELEMETRY"

class BenchmarkConfig(BaseModel):
    target: float
    critical: float
    polarity: Polarity
    unit: Optional[str] = None
    description: str

class RiskScoreResult(BaseModel):
    risk_score: float = Field(..., ge=0.0, le=100.0)
    scoring_method: RiskScoringMethod
    polarity: Polarity
    benchmark_target: Optional[float] = None
    benchmark_critical: Optional[float] = None
    baseline_value: Optional[float] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    baseline_to_current_change_percent: Optional[float] = None
    unit: Optional[str] = None
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    explanation: str
    supporting_evidence_ids: List[str] = Field(default_factory=list)


# Central Configurable Domain Archetype Registry (Version 1.0)
DOMAIN_ARCHETYPES: Dict[str, BenchmarkConfig] = {
    # 1. Latency & Response Times (HIGHER_IS_WORSE)
    "LATENCY": BenchmarkConfig(
        target=200.0, critical=500.0, polarity=Polarity.HIGHER_IS_WORSE, unit="ms",
        description="Standard API/Service P95/P99 latency (Target: <=200ms, Critical: >=500ms)"
    ),
    "RESPONSE_TIME": BenchmarkConfig(
        target=250.0, critical=600.0, polarity=Polarity.HIGHER_IS_WORSE, unit="ms",
        description="Application response time (Target: <=250ms, Critical: >=600ms)"
    ),
    "PAGE_LOAD_TIME": BenchmarkConfig(
        target=1.5, critical=4.0, polarity=Polarity.HIGHER_IS_WORSE, unit="s",
        description="Web page load duration (Target: <=1.5s, Critical: >=4.0s)"
    ),

    # 2. Availability & Reliability (LOWER_IS_WORSE)
    "AVAILABILITY": BenchmarkConfig(
        target=99.9, critical=95.0, polarity=Polarity.LOWER_IS_WORSE, unit="%",
        description="Platform uptime / availability percentage (Target: >=99.9%, Critical: <=95.0%)"
    ),
    "UPTIME": BenchmarkConfig(
        target=99.9, critical=95.0, polarity=Polarity.LOWER_IS_WORSE, unit="%",
        description="System uptime percentage (Target: >=99.9%, Critical: <=95.0%)"
    ),
    "SUCCESS_RATE": BenchmarkConfig(
        target=99.0, critical=90.0, polarity=Polarity.LOWER_IS_WORSE, unit="%",
        description="Transaction or job success rate (Target: >=99.0%, Critical: <=90.0%)"
    ),

    # 3. Error Rates & Defect Densities (HIGHER_IS_WORSE)
    "ERROR_RATE": BenchmarkConfig(
        target=0.5, critical=5.0, polarity=Polarity.HIGHER_IS_WORSE, unit="%",
        description="HTTP/Service error rate percentage (Target: <=0.5%, Critical: >=5.0%)"
    ),
    "FAILURE_RATE": BenchmarkConfig(
        target=1.0, critical=10.0, polarity=Polarity.HIGHER_IS_WORSE, unit="%",
        description="Pipeline or job failure rate (Target: <=1.0%, Critical: >=10.0%)"
    ),
    "DEFECT_DENSITY": BenchmarkConfig(
        target=2.0, critical=8.0, polarity=Polarity.HIGHER_IS_WORSE, unit="defects/kloc",
        description="Defect density (Target: <=2.0, Critical: >=8.0)"
    ),

    # 4. User Satisfaction & CSAT (LOWER_IS_WORSE)
    "CSAT": BenchmarkConfig(
        target=4.5, critical=3.0, polarity=Polarity.LOWER_IS_WORSE, unit="rating/5",
        description="Customer satisfaction score on 1-5 scale (Target: >=4.5, Critical: <=3.0)"
    ),
    "CUSTOMER_RATING": BenchmarkConfig(
        target=4.5, critical=2.5, polarity=Polarity.LOWER_IS_WORSE, unit="rating/5",
        description="Customer review rating on 1-5 scale (Target: >=4.5, Critical: <=2.5)"
    ),
    "NPS": BenchmarkConfig(
        target=50.0, critical=0.0, polarity=Polarity.LOWER_IS_WORSE, unit="score",
        description="Net Promoter Score (Target: >=50, Critical: <=0)"
    ),

    # 5. Engineering Defect Backlog (HIGHER_IS_WORSE)
    "UNRESOLVED_BUGS": BenchmarkConfig(
        target=15.0, critical=50.0, polarity=Polarity.HIGHER_IS_WORSE, unit="count",
        description="Open unresolved bug backlog (Target: <=15, Critical: >=50)"
    ),
    "OPEN_BUGS": BenchmarkConfig(
        target=15.0, critical=50.0, polarity=Polarity.HIGHER_IS_WORSE, unit="count",
        description="Open bugs count (Target: <=15, Critical: >=50)"
    ),
    "SECURITY_VULNERABILITIES": BenchmarkConfig(
        target=0.0, critical=5.0, polarity=Polarity.HIGHER_IS_WORSE, unit="count",
        description="Known security vulnerabilities (Target: 0, Critical: >=5)"
    ),

    # 6. Workload & Overtime (HIGHER_IS_WORSE)
    "DEVELOPER_OVERTIME": BenchmarkConfig(
        target=5.0, critical=25.0, polarity=Polarity.HIGHER_IS_WORSE, unit="hrs/week",
        description="Team overtime hours per week (Target: <=5h, Critical: >=25h)"
    ),
    "OVERTIME_HOURS": BenchmarkConfig(
        target=5.0, critical=25.0, polarity=Polarity.HIGHER_IS_WORSE, unit="hrs/week",
        description="Overtime hours (Target: <=5h, Critical: >=25h)"
    ),
}

# Neutral keywords that indicate scale/capacity/volume rather than intrinsic operational failure
NEUTRAL_METRIC_KEYWORDS = {
    "REQUESTS", "VOLUME", "COUNT", "RECORDS", "READINGS", "STAFF", "HEADCOUNT",
    "SIZE", "EMPLOYEES", "FACILITIES", "USERS", "CUSTOMERS", "DEVICES", "SENSORS",
    "ENERGY_ANALYSTS", "DATA_ENGINEERS", "OPERATIONS_STAFF", "TEAM_SIZE"
}


class MetricSemanticProfiler:
    """
    Profiles raw or canonical metric names and units to classify polarity,
    archetypes, and operational semantics.
    """

    @classmethod
    def profile_metric(
        cls,
        canonical_name: str,
        unit: Optional[str] = None
    ) -> Tuple[Polarity, Optional[BenchmarkConfig]]:
        """
        Determines the polarity and matching domain benchmark archetype for a metric.
        """
        clean_name = canonical_name.upper().strip()
        clean_unit = (unit or "").lower().strip()

        # 0. Direct Pre-computed Risk Score Metrics (e.g. TECHNICAL_RISK, DELIVERY_RISK)
        if any(k in clean_name for k in ["RISK", "SCORE"]) and not any(k in clean_name for k in ["CSAT", "NPS"]):
            return Polarity.HIGHER_IS_WORSE, None

        # 1. Direct Archetype Key Match
        for arch_key, config in DOMAIN_ARCHETYPES.items():
            if arch_key in clean_name:
                return config.polarity, config

        # 2. Unit-based inference for explicit latency and availability
        if clean_unit in ["ms", "milliseconds"] or (clean_unit in ["seconds", "s", "sec"] and any(k in clean_name for k in ["LATENCY", "P95", "P99", "RESPONSE_TIME", "PAGE_LOAD", "RENDER_TIME"])):
            config = DOMAIN_ARCHETYPES["LATENCY"] if "ms" in clean_unit else DOMAIN_ARCHETYPES["PAGE_LOAD_TIME"]
            return Polarity.HIGHER_IS_WORSE, config

        if clean_unit in ["%"] and any(k in clean_name for k in ["AVAILAB", "UPTIME", "SUCCESS"]):
            return Polarity.LOWER_IS_WORSE, DOMAIN_ARCHETYPES["AVAILABILITY"]

        if clean_unit in ["%"] and any(k in clean_name for k in ["ERROR", "FAIL", "DROP", "DEFECT"]):
            return Polarity.HIGHER_IS_WORSE, DOMAIN_ARCHETYPES["ERROR_RATE"]

        # 3. Negative stems indicating defects, latency, failures (HIGHER_IS_WORSE)
        negative_stems = [
            "BUG", "DEFECT", "ERROR", "FAIL", "INCIDENT", "OUTAGE", "VULNERAB",
            "DELAY", "OVERTIME", "DROPOUT", "LATENCY", "DISCREPAN", "ISSUE", 
            "WARN", "ANOMAL", "UNRESOLV", "BACKLOG"
        ]
        if any(stem in clean_name for stem in negative_stems):
            return Polarity.HIGHER_IS_WORSE, None

        # 4. Positive stems indicating uptime, success, satisfaction (LOWER_IS_WORSE)
        positive_stems = [
            "AVAILAB", "UPTIME", "SUCCESS", "THROUGHPUT", "SATISFAC", "CSAT",
            "NPS", "RATING", "COVERAG", "RETENTION", "ACCURACY", "EFFICIEN"
        ]
        if any(stem in clean_name for stem in positive_stems):
            return Polarity.LOWER_IS_WORSE, None

        # 5. Neutral Informational Telemetry
        if any(k in clean_name for k in NEUTRAL_METRIC_KEYWORDS):
            return Polarity.NEUTRAL_INFORMATIONAL, None

        return Polarity.NEUTRAL_INFORMATIONAL, None


class RiskScoringEngine:
    """
    Production-Quality Deterministic Metric-Aware Risk Scoring Engine for FailureOps.
    Maps arbitrary metric telemetry onto a strictly bounded 0-100 normalized risk score.
    """

    @classmethod
    def calculate_risk_profile(
        cls,
        current_value: Optional[float],
        baseline_value: Optional[float] = None,
        previous_value: Optional[float] = None,
        baseline_to_current_change_percent: Optional[float] = None,
        canonical_name: str = "UNKNOWN_METRIC",
        unit: Optional[str] = None,
        explicit_target: Optional[float] = None,
        explicit_critical: Optional[float] = None,
        supporting_evidence_ids: Optional[List[str]] = None
    ) -> RiskScoreResult:
        """
        Authoritative deterministic entrypoint for metric risk scoring.
        """
        ev_ids = list(supporting_evidence_ids or [])
        unit_str = f" {unit}" if unit else ""

        if current_value is None:
            return RiskScoreResult(
                risk_score=0.0,
                scoring_method=RiskScoringMethod.NEUTRAL_TELEMETRY,
                polarity=Polarity.NEUTRAL_INFORMATIONAL,
                baseline_value=baseline_value,
                previous_value=previous_value,
                current_value=None,
                baseline_to_current_change_percent=baseline_to_current_change_percent,
                unit=unit,
                confidence=0.5,
                explanation="No numerical observation available for metric.",
                supporting_evidence_ids=ev_ids
            )

        curr = float(current_value)
        base = float(baseline_value) if baseline_value is not None else None
        prev = float(previous_value) if previous_value is not None else None
        base_delta = baseline_to_current_change_percent

        # Direct Pre-computed Risk Scores (e.g. TECHNICAL_RISK = 76, RISK_SCORE = 80)
        clean_upper = canonical_name.upper().strip()
        if any(k in clean_upper for k in ["RISK", "SCORE"]) and not any(k in clean_upper for k in ["CSAT", "NPS"]):
            score = max(0.0, min(100.0, curr))
            explanation = f"{canonical_name} evaluated as a direct 0-100 risk assessment score: {score:.1f}/100."
            return RiskScoreResult(
                risk_score=round(score, 2),
                scoring_method=RiskScoringMethod.EXPLICIT_SLA_BENCHMARK,
                polarity=Polarity.HIGHER_IS_WORSE,
                baseline_value=base,
                previous_value=prev,
                current_value=curr,
                baseline_to_current_change_percent=base_delta,
                unit="score",
                confidence=0.95,
                explanation=explanation,
                supporting_evidence_ids=ev_ids
            )

        # Profile semantic archetype and polarity
        inferred_polarity, archetype = MetricSemanticProfiler.profile_metric(canonical_name, unit)

        # -------------------------------------------------------------
        # TIER 1: Explicit In-Document SLA / Benchmark
        # -------------------------------------------------------------
        if explicit_target is not None and explicit_critical is not None and explicit_target != explicit_critical:
            target = float(explicit_target)
            crit = float(explicit_critical)
            pol = Polarity.HIGHER_IS_WORSE if target < crit else Polarity.LOWER_IS_WORSE
            
            score = cls._score_against_benchmarks(curr, target, crit, pol)
            score = max(0.0, min(100.0, score))
            
            explanation = (
                f"{canonical_name} ({curr}{unit_str}) scored against in-document SLA benchmark "
                f"[Target: {target}{unit_str}, Critical: {crit}{unit_str}]. Computed Risk Score: {score:.1f}/100."
            )
            return RiskScoreResult(
                risk_score=round(score, 2),
                scoring_method=RiskScoringMethod.EXPLICIT_SLA_BENCHMARK,
                polarity=pol,
                benchmark_target=target,
                benchmark_critical=crit,
                baseline_value=base,
                previous_value=prev,
                current_value=curr,
                baseline_to_current_change_percent=base_delta,
                unit=unit,
                confidence=0.98,
                explanation=explanation,
                supporting_evidence_ids=ev_ids
            )

        # -------------------------------------------------------------
        # TIER 2: Domain Standard Archetype Benchmark
        # -------------------------------------------------------------
        if archetype is not None:
            score = cls._score_against_benchmarks(curr, archetype.target, archetype.critical, archetype.polarity)
            score = max(0.0, min(100.0, score))
            
            explanation = (
                f"{canonical_name} ({curr}{unit_str}) evaluated against domain standard benchmark "
                f"[{archetype.description}]. Computed Risk Score: {score:.1f}/100."
            )
            return RiskScoreResult(
                risk_score=round(score, 2),
                scoring_method=RiskScoringMethod.DOMAIN_ARCHETYPE,
                polarity=archetype.polarity,
                benchmark_target=archetype.target,
                benchmark_critical=archetype.critical,
                baseline_value=base,
                previous_value=prev,
                current_value=curr,
                baseline_to_current_change_percent=base_delta,
                unit=unit,
                confidence=0.92,
                explanation=explanation,
                supporting_evidence_ids=ev_ids
            )

        # -------------------------------------------------------------
        # TIER 3: Baseline-Relative Trajectory Degradation
        # -------------------------------------------------------------
        if base is not None and base_delta is not None and inferred_polarity != Polarity.NEUTRAL_INFORMATIONAL:
            score = cls._score_baseline_relative(base_delta, inferred_polarity)
            score = max(0.0, min(100.0, score))
            
            delta_sign = f"+{base_delta:.2f}%" if base_delta > 0 else f"{base_delta:.2f}%"
            explanation = (
                f"{canonical_name} evaluated via baseline trajectory: changed from baseline {base}{unit_str} to current {curr}{unit_str} "
                f"({delta_sign} total change, polarity: {inferred_polarity.value}). Computed Risk Score: {score:.1f}/100."
            )
            return RiskScoreResult(
                risk_score=round(score, 2),
                scoring_method=RiskScoringMethod.BASELINE_RELATIVE_DELTA,
                polarity=inferred_polarity,
                baseline_value=base,
                previous_value=prev,
                current_value=curr,
                baseline_to_current_change_percent=base_delta,
                unit=unit,
                confidence=0.85,
                explanation=explanation,
                supporting_evidence_ids=ev_ids
            )

        # -------------------------------------------------------------
        # TIER 4: Neutral Informational Telemetry / Uncalibrated Metric
        # -------------------------------------------------------------
        # Safe default for scale/volume metrics or single-point observations with no baseline or benchmark
        score = 15.0 if inferred_polarity == Polarity.NEUTRAL_INFORMATIONAL else 20.0
        delta_str = f" [Total Change: {base_delta:+.2f}%]" if base_delta is not None else ""
        explanation = (
            f"{canonical_name} ({curr}{unit_str}){delta_str} observed as uncalibrated operational telemetry "
            f"with no historical baseline or explicit benchmark. Scored at baseline neutral risk ({score:.0f}/100)."
        )
        return RiskScoreResult(
            risk_score=score,
            scoring_method=RiskScoringMethod.NEUTRAL_TELEMETRY,
            polarity=inferred_polarity,
            baseline_value=base,
            previous_value=prev,
            current_value=curr,
            baseline_to_current_change_percent=base_delta,
            unit=unit,
            confidence=0.70,
            explanation=explanation,
            supporting_evidence_ids=ev_ids
        )

    @classmethod
    def _score_against_benchmarks(
        cls,
        val: float,
        target: float,
        critical: float,
        polarity: Polarity
    ) -> float:
        """
        Authoritative piecewise continuous interpolation for benchmark scoring.
        """
        if polarity == Polarity.HIGHER_IS_WORSE:
            if val <= 0.0:
                return 0.0
            if val <= target:
                # 0 to Target maps linearly to [0, 20] (Healthy/Normal)
                return (val / max(1e-6, target)) * 20.0
            elif val <= critical:
                # Target to Critical maps linearly to [20, 80] (Elevated/Warning)
                span = max(1e-6, critical - target)
                return 20.0 + ((val - target) / span) * 60.0
            else:
                # Above Critical maps from [80, 100]
                excess_ratio = (val - critical) / max(1e-6, critical)
                return min(100.0, 80.0 + excess_ratio * 40.0)

        elif polarity == Polarity.LOWER_IS_WORSE:
            if val >= target:
                # Above Target is healthy [0, 20]
                return 10.0
            elif val >= critical:
                # Target to Critical maps linearly to [20, 80]
                span = max(1e-6, target - critical)
                return 20.0 + ((target - val) / span) * 60.0
            else:
                # Below Critical maps to [80, 100]
                deficit_ratio = (critical - val) / max(1e-6, critical)
                return min(100.0, 80.0 + deficit_ratio * 40.0)

        elif polarity == Polarity.TARGET_BAND:
            # Target is low bound, Critical is high bound
            low, high = min(target, critical), max(target, critical)
            if low <= val <= high:
                return 10.0
            elif val > high:
                excess = (val - high) / max(1e-6, high)
                return min(100.0, 20.0 + excess * 80.0)
            else:
                deficit = (low - val) / max(1e-6, low)
                return min(100.0, 20.0 + deficit * 80.0)

        else:
            return 15.0

    @classmethod
    def _score_baseline_relative(
        cls,
        delta_pct: float,
        polarity: Polarity
    ) -> float:
        """
        Authoritative piecewise mathematical formula for baseline-relative degradation.
        """
        if polarity == Polarity.HIGHER_IS_WORSE:
            if delta_pct <= 0.0:
                # Metric improved or remained stable
                return max(5.0, 20.0 + delta_pct * 0.15)
            elif delta_pct <= 10.0:
                return 20.0 + delta_pct * 0.5
            elif delta_pct <= 30.0:
                return 25.0 + (delta_pct - 10.0) * 1.5
            elif delta_pct <= 75.0:
                return 55.0 + (delta_pct - 30.0) * 0.55
            else:
                return min(100.0, 80.0 + (delta_pct - 75.0) * 0.4)

        elif polarity == Polarity.LOWER_IS_WORSE:
            if delta_pct >= 0.0:
                return max(5.0, 20.0 - delta_pct * 0.15)
            abs_delta = abs(delta_pct)
            if abs_delta <= 10.0:
                return 20.0 + abs_delta * 0.5
            elif abs_delta <= 30.0:
                return 25.0 + (abs_delta - 10.0) * 1.5
            elif abs_delta <= 75.0:
                return 55.0 + (abs_delta - 30.0) * 0.55
            else:
                return min(100.0, 80.0 + (abs_delta - 75.0) * 0.4)

        else:
            # Neutral telemetry with large scale shift
            abs_delta = abs(delta_pct)
            if abs_delta > 100.0:
                return 25.0
            return 15.0
