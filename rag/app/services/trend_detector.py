import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.evidence_group import EvidenceGroupCollection, EvidenceGroup
from app.schemas.trend import DetectedTrend, DetectedTrendCollection

logger = logging.getLogger(__name__)

# Metrics where HIGHER value indicates IMPROVEMENT (Positive)
HIGHER_IS_BETTER_KEYWORDS = [
    "activation", "retention", "conversion", "revenue", "mrr", "arr", 
    "nps", "csat", "satisfaction", "pass_rate", "uptime", "throughput", 
    "velocity", "adoption", "growth", "margin", "coverage"
]

# Metrics where LOWER value indicates IMPROVEMENT (Positive)
LOWER_IS_BETTER_KEYWORDS = [
    "churn", "failure", "incident", "bug", "defect", "drop-off", "abandonment", 
    "complaint", "ticket", "latency", "workweek", "overtime", "downtime", 
    "delay", "mttr", "cost", "burn", "queue", "unresolved"
]

def calculate_numerical_trend(points: List[float]) -> Tuple[str, Optional[float], Optional[float]]:
    """
    Deterministically computes trend direction and deltas over a series of numbers.
    Returns: (direction, delta_value, delta_percent)
    """
    if not points or len(points) < 2:
        return "INSUFFICIENT_DATA", None, None

    first = points[0]
    last = points[-1]
    delta_val = round(last - first, 3)
    
    if abs(first) > 1e-6:
        delta_pct = round(((last - first) / abs(first)) * 100.0, 2)
    else:
        delta_pct = 0.0

    # Check for stability / low variation
    avg_val = sum(points) / len(points)
    spread = max(points) - min(points)
    rel_spread = (spread / abs(avg_val)) if abs(avg_val) > 1e-6 else spread

    if rel_spread < 0.05 or abs(delta_pct) < 3.0:
        return "STABLE", delta_val, delta_pct

    # Monotonicity check
    diffs = [points[i+1] - points[i] for i in range(len(points) - 1)]
    all_decreasing = all(d <= 0 for d in diffs) and any(d < 0 for d in diffs)
    all_increasing = all(d >= 0 for d in diffs) and any(d > 0 for d in diffs)

    if all_decreasing or delta_pct < -5.0:
        return "DECREASING", delta_val, delta_pct
    elif all_increasing or delta_pct > 5.0:
        return "INCREASING", delta_val, delta_pct
    else:
        # Oscillating / fluctuating
        return "FLUCTUATING", delta_val, delta_pct

def evaluate_metric_polarity(metric_name: str, direction: str) -> str:
    """
    Maps numerical direction to semantic polarity (POSITIVE, NEGATIVE, NEUTRAL, UNKNOWN).
    Applies domain rules rather than assuming decrease is always bad.
    """
    if direction in ["INSUFFICIENT_DATA", "UNKNOWN"]:
        return "UNKNOWN"
    if direction == "STABLE":
        return "NEUTRAL"

    m_lower = metric_name.lower().replace("_", " ")

    is_higher_better = any(kw in m_lower for kw in HIGHER_IS_BETTER_KEYWORDS)
    is_lower_better = any(kw in m_lower for kw in LOWER_IS_BETTER_KEYWORDS)

    if is_higher_better and not is_lower_better:
        if direction == "INCREASING":
            return "POSITIVE"
        elif direction == "DECREASING":
            return "NEGATIVE"
        else:
            return "MIXED" if direction == "FLUCTUATING" else "NEUTRAL"

    elif is_lower_better and not is_higher_better:
        if direction == "DECREASING":
            return "POSITIVE" # Fewer incidents / lower churn is GOOD!
        elif direction == "INCREASING":
            return "NEGATIVE" # Higher CI failures / more complaints is BAD!
        else:
            return "MIXED" if direction == "FLUCTUATING" else "NEUTRAL"

    else:
        # Unknown metric semantics -> Do not guess!
        return "UNKNOWN"

def detect_trends_from_groups(group_collection: EvidenceGroupCollection) -> DetectedTrendCollection:
    """
    Detects mathematical trends from evidence groups across the project.
    """
    trends: List[DetectedTrend] = []
    trend_idx = 1

    for grp in group_collection.groups:
        # Collect metric data points
        metric_points_map: Dict[str, List[Tuple[float, str]]] = {} # metric -> [(value, ev_id)]
        
        for it in grp.evidence_items:
            norm = it.normalized_value
            if norm:
                m_name = norm.metric or grp.group_name
                # If before and after are present:
                if norm.before is not None and norm.after is not None:
                    metric_points_map.setdefault(m_name, []).extend([
                        (norm.before, it.evidence_id),
                        (norm.after, it.evidence_id)
                    ])
                elif norm.after is not None:
                    metric_points_map.setdefault(m_name, []).append((norm.after, it.evidence_id))
            else:
                # Check for percentage / number inside statement
                nums = re.findall(r'\b\d+(?:\.\d+)?%?\b', it.statement)
                clean_nums = [float(n.replace('%', '')) for n in nums if re.match(r'^\d+(?:\.\d+)?%?$', n)]
                if len(clean_nums) >= 2:
                    metric_points_map.setdefault(f"{grp.primary_category.lower()}_indicator", []).extend([
                        (clean_nums[0], it.evidence_id),
                        (clean_nums[1], it.evidence_id)
                    ])
                elif len(clean_nums) == 1:
                    metric_points_map.setdefault(f"{grp.primary_category.lower()}_indicator", []).append(
                        (clean_nums[0], it.evidence_id)
                    )

        # Process each metric series
        for m_name, pts in metric_points_map.items():
            raw_vals = [p[0] for p in pts]
            ev_ids = list(dict.fromkeys(p[1] for p in pts))
            
            direction, delta_val, delta_pct = calculate_numerical_trend(raw_vals)
            polarity = evaluate_metric_polarity(m_name, direction)

            # Build readable explanation
            if direction == "INSUFFICIENT_DATA":
                exp = f"Single observation recorded for {m_name} ({raw_vals[0] if raw_vals else 'N/A'}); trend trajectory cannot be inferred without multi-period telemetry."
            elif direction == "STABLE":
                exp = f"{m_name.replace('_', ' ').title()} maintained stable operational baseline across observed data points."
            else:
                unit_str = "%" if any(v <= 100 for v in raw_vals) else "units"
                exp = f"{m_name.replace('_', ' ').title()} shifted from {raw_vals[0]} to {raw_vals[-1]} ({'+' if delta_pct and delta_pct > 0 else ''}{delta_pct}% delta, direction: {direction.lower()})."

            trends.append(
                DetectedTrend(
                    trend_id=f"trd_{trend_idx:03d}",
                    metric_name=m_name,
                    category=grp.primary_category,
                    data_points=raw_vals,
                    direction=direction,
                    polarity=polarity,
                    delta_value=delta_val,
                    delta_percent=delta_pct,
                    unit="percent" if "%" in exp else "units",
                    evidence_ids=ev_ids,
                    explanation=exp,
                    confidence=grp.group_confidence
                )
            )
            trend_idx += 1

    return DetectedTrendCollection(
        project_id=group_collection.project_id,
        analysis_id=group_collection.analysis_id,
        total_trends=len(trends),
        trends=trends
    )
