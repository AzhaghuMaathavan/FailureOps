import re
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple, Any, List, Dict, Set
from dataclasses import dataclass, field
from app.intelligence.services.normalization import normalize_signal_name
from app.intelligence.schemas.evidence import Direction, FactType

logger = logging.getLogger(__name__)

@dataclass
class MetricObservation:
    metric_name: str
    temporal_raw: Optional[str]
    temporal_sort_key: Any
    value: float
    unit: Optional[str]
    source_row: int
    source_chunk_id: str
    source_document_id: str
    source_document_name: str
    project_id: str
    raw_row_text: str = ""

@dataclass
class MetricSeries:
    metric_name: str
    canonical_name: str
    category: str
    project_id: str
    source_document_id: str
    source_document_name: str
    citation: str
    unit: Optional[str]
    observations: List[MetricObservation] = field(default_factory=list)
    
    baseline_value: Optional[float] = None
    previous_value: Optional[float] = None
    current_value: Optional[float] = None
    
    baseline_timestamp: Optional[str] = None
    previous_timestamp: Optional[str] = None
    current_timestamp: Optional[str] = None
    
    baseline_to_current_change: Optional[float] = None
    previous_to_current_change: Optional[float] = None
    baseline_to_current_change_percent: Optional[float] = None
    previous_to_current_change_percent: Optional[float] = None
    percentage_change: Optional[float] = None # Canonical FailureOps trend change (baseline -> current)
    direction: str = "UNKNOWN"
    trend: str = "UNKNOWN"
    supporting_chunk_ids: List[str] = field(default_factory=list)
    supporting_rows: List[int] = field(default_factory=list)

class TemporalColumnDetector:
    """
    Detects and parses temporal fields (dates, timestamps, weeks, sprints, periods, cycles, releases, etc.)
    without hardcoding column names or date formats.
    """
    TEMPORAL_HEADER_WEIGHTS = [
        (re.compile(r'timestamp|epoch', re.I), 10),
        (re.compile(r'datetime', re.I), 9),
        (re.compile(r'week_start|period_start|start_date|end_date', re.I), 8),
        (re.compile(r'date|day|time', re.I), 7),
        (re.compile(r'week|wk', re.I), 6),
        (re.compile(r'month|reporting_month', re.I), 5),
        (re.compile(r'quarter|qtr', re.I), 4),
        (re.compile(r'year|yr', re.I), 3),
        (re.compile(r'sprint|cycle|release|period|batch', re.I), 2),
    ]

    @classmethod
    def is_temporal_header(cls, header: str) -> Tuple[bool, int]:
        h_clean = header.strip().lower().replace(" ", "_").replace("-", "_")
        for regex, weight in cls.TEMPORAL_HEADER_WEIGHTS:
            if regex.search(h_clean):
                return True, weight
        return False, 0

    @classmethod
    def parse_temporal_value(cls, val_str: Optional[str]) -> Tuple[int, Any]:
        """
        Returns a sortable tuple: (type_rank, normalized_key)
        type_rank:
          0 = datetime / timestamp (ISO / calendar)
          1 = ordinal number (sprint 1, week 12, etc.)
          2 = raw string fallback
          3 = missing
        """
        if not val_str:
            return (3, "")
            
        s = str(val_str).strip()
        if not s:
            return (3, "")
        
        # 1. ISO date: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
        iso_m = re.match(r'^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?', s)
        if iso_m:
            try:
                y, m, d = int(iso_m.group(1)), int(iso_m.group(2)), int(iso_m.group(3))
                hr = int(iso_m.group(4) or 0)
                mn = int(iso_m.group(5) or 0)
                sec = int(iso_m.group(6) or 0)
                return (0, datetime(y, m, d, hr, mn, sec))
            except Exception:
                pass

        # 2. Month-Year: e.g. "2026-06" or "June 2026" or "Jun 2026"
        month_m = re.match(r'^(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-/\s,]+(\d{4})|(\d{4})[-/](\d{1,2}))$', s, re.I)
        if month_m:
            try:
                if month_m.group(1) and month_m.group(2):
                    dt = datetime.strptime(f"{month_m.group(1)[:3]} {month_m.group(2)}", "%b %Y")
                    return (0, dt)
                elif month_m.group(3) and month_m.group(4):
                    return (0, datetime(int(month_m.group(3)), int(month_m.group(4)), 1))
            except Exception:
                pass

        # 3. Quarter: e.g. "Q1 2026", "2026-Q1", "2026 Q3"
        q_m = re.match(r'^(?:Q([1-4])[-/\s]+(\d{4})|(\d{4})[-/\s]+Q([1-4]))$', s, re.I)
        if q_m:
            q = int(q_m.group(1) or q_m.group(4))
            y = int(q_m.group(2) or q_m.group(3))
            return (0, datetime(y, (q - 1) * 3 + 1, 1))

        # 4. Standard Date: MM/DD/YYYY or DD-MM-YYYY
        for fmt in ["%m/%d/%Y", "%d/%m/%Y", "%d-%m-%Y", "%m-%d-%Y"]:
            try:
                dt = datetime.strptime(s, fmt)
                return (0, dt)
            except Exception:
                pass

        # 5. Ordinal format: Sprint 12, Week 3, Release 2.0, Period 4, W05
        ord_m = re.search(r'(?:sprint|week|wk|w|release|rel|cycle|period|batch|r)[_\s-]*(\d+(?:\.\d+)?)', s, re.I)
        if ord_m:
            try:
                return (1, float(ord_m.group(1)))
            except Exception:
                pass

        # 6. Integer Year: e.g. 2026
        if re.match(r'^\d{4}$', s):
            try:
                return (0, datetime(int(s), 1, 1))
            except Exception:
                pass

        # 7. Numeric timestamp / epoch / integer sequence
        try:
            num = float(s)
            if num > 1000000000: # epoch
                return (0, datetime.fromtimestamp(num))
            return (1, num)
        except Exception:
            pass

        return (2, s)

class TabularObservationParser:
    """
    Parses structured tabular lines from chunks into raw metric observations.
    Supports key-value rows, pipe-delimited tables, markdown tables, and CSV lines.
    """
    NON_METRIC_KEYWORDS = {
        "id", "uuid", "guid", "key", "index", "row", "customer_type", "user_type",
        "facility_size", "category", "feedback_id", "status", "comment", "notes",
        "name", "type", "description", "document", "section", "page"
    }

    @classmethod
    def parse_chunk_tables(
        cls,
        chunk: Dict[str, Any],
        project_id: str
    ) -> List[MetricObservation]:
        content = chunk.get("content", "")
        lineage = chunk.get("lineage") or {}
        doc_id = chunk.get("document_id") or lineage.get("document_id") or "unknown_doc"
        doc_name = chunk.get("document_name") or lineage.get("document_name") or chunk.get("filename") or lineage.get("filename") or "Unknown Document"
        chunk_id = chunk.get("chunk_id") or chunk.get("id") or "unknown_chunk"
        
        lines = [l.strip() for l in content.split("\n") if l.strip()]
        observations: List[MetricObservation] = []
        
        md_table_headers = None
        for row_idx, line in enumerate(lines, 1):
            # 1. Check if chunk line is a Markdown table row
            if line.startswith("|") and line.endswith("|"):
                cols = [c.strip() for c in line.strip("|").split("|")]
                if all(re.match(r'^:?-+:?$', c) for c in cols if c):
                    continue # separator line
                if md_table_headers is None:
                    md_table_headers = cols
                    continue
                elif len(cols) == len(md_table_headers):
                    row_dict = {md_table_headers[i]: cols[i] for i in range(len(cols))}
                    cls._process_row_dict(
                        row_dict=row_dict,
                        row_idx=row_idx,
                        chunk_id=chunk_id,
                        doc_id=doc_id,
                        doc_name=doc_name,
                        project_id=project_id,
                        raw_line=line,
                        observations=observations
                    )
                    continue

            # 2. Check Key: Value pipe or comma delimited rows
            if ":" in line and ("|" in line or "," in line):
                parts = [p.strip() for p in re.split(r'\|', line) if p.strip()]
                row_dict: Dict[str, str] = {}
                for p in parts:
                    if ":" in p:
                        k, v = p.split(":", 1)
                        row_dict[k.strip()] = v.strip()
                        
                if len(row_dict) >= 2:
                    cls._process_row_dict(
                        row_dict=row_dict,
                        row_idx=row_idx,
                        chunk_id=chunk_id,
                        doc_id=doc_id,
                        doc_name=doc_name,
                        project_id=project_id,
                        raw_line=line,
                        observations=observations
                    )

        return observations

    @classmethod
    def _process_row_dict(
        cls,
        row_dict: Dict[str, str],
        row_idx: int,
        chunk_id: str,
        doc_id: str,
        doc_name: str,
        project_id: str,
        raw_line: str,
        observations: List[MetricObservation]
    ):
        best_temporal_col = None
        highest_weight = -1
        
        for k, v in row_dict.items():
            is_temp, weight = TemporalColumnDetector.is_temporal_header(k)
            if is_temp and weight > highest_weight:
                highest_weight = weight
                best_temporal_col = k

        temporal_raw = row_dict.get(best_temporal_col) if best_temporal_col else None
        temporal_sort_key = TemporalColumnDetector.parse_temporal_value(temporal_raw) if temporal_raw else (3, row_idx)

        for col_name, raw_val in row_dict.items():
            if col_name == best_temporal_col:
                continue
                
            clean_col = col_name.strip().lower().replace(" ", "_")
            if clean_col in cls.NON_METRIC_KEYWORDS:
                continue
                
            val_clean = raw_val.strip().rstrip("%").lstrip("$").replace(",", "")
            try:
                val_float = float(val_clean)
            except Exception:
                continue

            unit = None
            if "%" in raw_val:
                unit = "%"
            elif "$" in raw_val:
                unit = "USD"
            elif "ms" in raw_val.lower() or "ms" in col_name.lower():
                unit = "ms"
            elif "hour" in raw_val.lower() or "hour" in col_name.lower():
                unit = "hours"
            elif "sec" in raw_val.lower() or "sec" in col_name.lower():
                unit = "seconds"
            elif any(w in col_name.lower() for w in ["count", "bug", "error", "incident", "task", "rate", "failure"]):
                unit = "count"

            observations.append(MetricObservation(
                metric_name=col_name.strip(),
                temporal_raw=temporal_raw,
                temporal_sort_key=temporal_sort_key,
                value=val_float,
                unit=unit,
                source_row=row_idx,
                source_chunk_id=chunk_id,
                source_document_id=doc_id,
                source_document_name=doc_name,
                project_id=project_id,
                raw_row_text=raw_line
            ))

class TimeSeriesEngine:
    """
    Core Deterministic Time-Series Engine.
    Aggregates multi-chunk observations, sorts chronologically, prevents cross-document
    contamination, and extracts baseline, previous, and current observations.
    """

    @classmethod
    def extract_metric_series(
        cls,
        retrieved_chunks: List[Dict[str, Any]],
        project_id: str,
        company_id: Optional[str] = None
    ) -> List[MetricSeries]:
        all_obs: List[MetricObservation] = []
        chunk_citation_map: Dict[str, str] = {}
        
        for c in retrieved_chunks:
            cid = c.get("chunk_id", "unknown")
            chunk_citation_map[cid] = c.get("citation") or c.get("document_name", "Document")
            obs = TabularObservationParser.parse_chunk_tables(c, project_id)
            all_obs.extend(obs)

        if not all_obs:
            return []

        # Group strictly by (project_id, source_document_id, canonical_metric_name)
        grouped_series: Dict[Tuple[str, str, str], List[MetricObservation]] = {}
        metric_raw_name_map: Dict[Tuple[str, str, str], str] = {}
        metric_category_map: Dict[Tuple[str, str, str], str] = {}
        metric_doc_name_map: Dict[Tuple[str, str, str], str] = {}

        for ob in all_obs:
            canonical_name, category = normalize_signal_name(ob.metric_name)
            key = (ob.project_id, ob.source_document_id, canonical_name)
            
            if key not in grouped_series:
                grouped_series[key] = []
                metric_raw_name_map[key] = ob.metric_name
                metric_category_map[key] = category.value if hasattr(category, "value") else str(category)
                metric_doc_name_map[key] = ob.source_document_name
                
            grouped_series[key].append(ob)

        result_series: List[MetricSeries] = []

        for key, obs_list in grouped_series.items():
            proj_id, doc_id, can_name = key
            raw_name = metric_raw_name_map[key]
            category = metric_category_map[key]
            doc_name = metric_doc_name_map[key]

            # 1. Deduplicate by (temporal_raw, value)
            unique_obs: List[MetricObservation] = []
            seen_tuples: Set[Tuple[Optional[str], float]] = set()
            for o in obs_list:
                tup = (o.temporal_raw, o.value)
                if tup not in seen_tuples:
                    seen_tuples.add(tup)
                    unique_obs.append(o)

            # 2. Sort chronologically by parsed temporal sort key, then source row
            sorted_obs = sorted(unique_obs, key=lambda x: (x.temporal_sort_key, x.source_row))

            if not sorted_obs:
                continue

            # 3. Extract baseline, previous, current
            baseline_obs = sorted_obs[0]
            current_obs = sorted_obs[-1]
            previous_obs = sorted_obs[-2] if len(sorted_obs) >= 2 else None

            baseline_val = baseline_obs.value
            current_val = current_obs.value
            previous_val = previous_obs.value if previous_obs else None

            baseline_ts = baseline_obs.temporal_raw
            current_ts = current_obs.temporal_raw
            previous_ts = previous_obs.temporal_raw if previous_obs else None

            # Calculate baseline-to-current change
            if baseline_val != 0:
                base_to_curr_pct = round(((current_val - baseline_val) / abs(baseline_val)) * 100, 2)
            else:
                base_to_curr_pct = None

            # Calculate previous-to-current change
            if previous_val is not None and previous_val != 0:
                prev_to_curr_pct = round(((current_val - previous_val) / abs(previous_val)) * 100, 2)
            else:
                prev_to_curr_pct = None

            # Trend determination (baseline -> current)
            if current_val > baseline_val:
                trend = Direction.INCREASING.value
            elif current_val < baseline_val:
                trend = Direction.DECREASING.value
            else:
                trend = Direction.STABLE.value

            supporting_chunks = list(dict.fromkeys(o.source_chunk_id for o in sorted_obs))
            supporting_rows = list(dict.fromkeys(o.source_row for o in sorted_obs))
            unit = current_obs.unit or baseline_obs.unit

            # Primary citation from latest chunk
            citation = chunk_citation_map.get(current_obs.source_chunk_id, doc_name)

            series = MetricSeries(
                metric_name=raw_name,
                canonical_name=can_name,
                category=category,
                project_id=proj_id,
                source_document_id=doc_id,
                source_document_name=doc_name,
                citation=citation,
                unit=unit,
                observations=sorted_obs,
                baseline_value=baseline_val,
                previous_value=previous_val,
                current_value=current_val,
                baseline_timestamp=baseline_ts,
                previous_timestamp=previous_ts,
                current_timestamp=current_ts,
                baseline_to_current_change=base_to_curr_pct,
                previous_to_current_change=prev_to_curr_pct,
                baseline_to_current_change_percent=base_to_curr_pct,
                previous_to_current_change_percent=prev_to_curr_pct,
                percentage_change=base_to_curr_pct, # FailureOps canonical trend change
                direction=trend,
                trend=trend,
                supporting_chunk_ids=supporting_chunks,
                supporting_rows=supporting_rows
            )
            result_series.append(series)

        return result_series

    @classmethod
    def series_to_evidence_items(
        cls,
        series_list: List[MetricSeries],
        company_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Transforms deterministic MetricSeries into structured EvidenceItem dictionaries.
        """
        evidence_items = []
        for s in series_list:
            ev_id = f"ev_ts_{str(uuid.uuid4())[:8]}"
            
            # Construct human-readable statement with explicit baseline -> current values and timestamps
            unit_suffix = f" {s.unit}" if s.unit else ""
            if s.baseline_timestamp and s.current_timestamp and s.baseline_timestamp != s.current_timestamp:
                time_ctx = f"between {s.baseline_timestamp} and {s.current_timestamp}"
            elif s.current_timestamp:
                time_ctx = f"as of {s.current_timestamp}"
            else:
                time_ctx = "over the observed series"

            if s.previous_value is not None and s.previous_value != s.baseline_value:
                prev_details = f", previous: {s.previous_value}{unit_suffix} on {s.previous_timestamp or 'N/A'} ({s.previous_to_current_change:+.2f}% period change)" if s.previous_to_current_change is not None else f", previous: {s.previous_value}{unit_suffix}"
            else:
                prev_details = ""

            if s.baseline_to_current_change is not None:
                statement = f"{s.metric_name} changed from baseline {s.baseline_value}{unit_suffix} to latest {s.current_value}{unit_suffix} {time_ctx} ({s.baseline_to_current_change:+.2f}% total change{prev_details})."
            else:
                statement = f"{s.metric_name} observed at {s.current_value}{unit_suffix} {time_ctx}."

            evidence_items.append({
                "evidence_id": ev_id,
                "project_id": s.project_id,
                "company_id": company_id,
                "statement": statement,
                "fact_type": FactType.METRIC.value,
                "metric_name": s.metric_name,
                "baseline_value": s.baseline_value,
                "previous_value": s.previous_value,
                "current_value": s.current_value,
                "baseline_timestamp": s.baseline_timestamp,
                "previous_timestamp": s.previous_timestamp,
                "current_timestamp": s.current_timestamp,
                "baseline_to_current_change": s.baseline_to_current_change,
                "previous_to_current_change": s.previous_to_current_change,
                "baseline_to_current_change_percent": s.baseline_to_current_change,
                "previous_to_current_change_percent": s.previous_to_current_change,
                "unit": s.unit,
                "direction": s.direction,
                "timestamp": s.current_timestamp,
                "period": s.current_timestamp,
                "source_document_id": s.source_document_id,
                "source_document_name": s.source_document_name,
                "source_chunk_id": s.supporting_chunk_ids[-1] if s.supporting_chunk_ids else "unknown",
                "supporting_chunk_ids": s.supporting_chunk_ids,
                "citation": s.citation,
                "source_metadata": {
                    "series_length": len(s.observations),
                    "supporting_rows": s.supporting_rows,
                    "baseline_timestamp": s.baseline_timestamp,
                    "previous_timestamp": s.previous_timestamp,
                    "current_timestamp": s.current_timestamp,
                    "baseline_to_current_change": s.baseline_to_current_change,
                    "previous_to_current_change": s.previous_to_current_change,
                    "baseline_to_current_change_percent": s.baseline_to_current_change,
                    "previous_to_current_change_percent": s.previous_to_current_change,
                    "all_observations": [
                        {"t": o.temporal_raw, "v": o.value} for o in s.observations
                    ]
                },
                "page_numbers": [],
                "observations_count": len(s.observations),
                "extraction_confidence": 1.0
            })
            
        return evidence_items

    @classmethod
    def format_time_series_prompt_summary(cls, series_list: List[MetricSeries]) -> str:
        """
        Creates a high-signal chronological summary of all deterministic metric series
        to provide complete context across all retrieved chunks for LLM extractions.
        """
        if not series_list:
            return "No structured time-series tables detected in retrieved chunks."
            
        summaries = []
        for s in series_list:
            unit_str = f" ({s.unit})" if s.unit else ""
            base_str = f"{s.baseline_value} [{s.baseline_timestamp or 'Baseline'}]"
            curr_str = f"{s.current_value} [{s.current_timestamp or 'Latest'}]"
            
            change_str = f"{s.baseline_to_current_change:+.2f}%" if s.baseline_to_current_change is not None else "N/A"
            if s.previous_value is not None:
                prev_str = f"{s.previous_value} [{s.previous_timestamp or 'Previous'}]"
                line = (
                    f"METRIC: {s.metric_name}{unit_str} | Source: {s.source_document_name}\n"
                    f" - Baseline: {base_str} -> Previous: {prev_str} -> Latest: {curr_str}\n"
                    f" - Total Change (Baseline->Latest): {change_str} | Trend: {s.trend} (Series Points: {len(s.observations)})"
                )
            else:
                line = (
                    f"METRIC: {s.metric_name}{unit_str} | Source: {s.source_document_name}\n"
                    f" - Baseline: {base_str} -> Latest: {curr_str}\n"
                    f" - Total Change: {change_str} | Trend: {s.trend}"
                )
            summaries.append(line)
            
        return "\n\n".join(summaries)
