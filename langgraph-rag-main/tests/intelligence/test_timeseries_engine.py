import pytest
from datetime import datetime
from app.intelligence.services.timeseries_engine import (
    TemporalColumnDetector,
    TabularObservationParser,
    TimeSeriesEngine,
    MetricObservation,
    MetricSeries
)
from app.intelligence.schemas.evidence import Direction

def test_temporal_column_detection_and_parsing():
    # ISO Dates
    is_temp, _ = TemporalColumnDetector.is_temporal_header("week_start")
    assert is_temp is True
    rank, val = TemporalColumnDetector.parse_temporal_value("2026-06-01")
    assert rank == 0
    assert val == datetime(2026, 6, 1)

    # Standard Dates
    rank, val = TemporalColumnDetector.parse_temporal_value("06/01/2026")
    assert rank == 0
    assert val == datetime(2026, 6, 1)

    # Sprints
    is_temp, _ = TemporalColumnDetector.is_temporal_header("sprint_id")
    assert is_temp is True
    rank, val = TemporalColumnDetector.parse_temporal_value("Sprint 14")
    assert rank == 1
    assert val == 14.0

    # Quarters
    rank, val = TemporalColumnDetector.parse_temporal_value("Q3 2026")
    assert rank == 0
    assert val == datetime(2026, 7, 1)

    # Month-Year
    rank, val = TemporalColumnDetector.parse_temporal_value("June 2026")
    assert rank == 0
    assert val == datetime(2026, 6, 1)

@pytest.mark.parametrize("input_values,expected_baseline,expected_prev,expected_curr,expected_trend", [
    ([10.0, 20.0, 30.0], 10.0, 20.0, 30.0, "INCREASING"),
    ([100.0, 80.0, 60.0], 100.0, 80.0, 60.0, "DECREASING"),
    ([5.0, 5.0, 5.0], 5.0, 5.0, 5.0, "STABLE"),
    ([42.0], 42.0, None, 42.0, "STABLE"),
    ([10.0, 30.0], 10.0, 10.0, 30.0, "INCREASING"),
])
def test_parameterized_time_series_extraction(input_values, expected_baseline, expected_prev, expected_curr, expected_trend):
    lines = []
    for idx, v in enumerate(input_values, 1):
        lines.append(f"week_start: 2026-06-{idx:02d} | custom_risk_metric: {v}")
    
    chunk = {
        "document_id": "doc_test_generic",
        "document_name": "metrics.csv",
        "chunk_id": "chunk_test_1",
        "citation": "metrics.csv",
        "content": "\n".join(lines)
    }

    series = TimeSeriesEngine.extract_metric_series([chunk], "proj_generic")
    assert len(series) == 1
    s = series[0]
    assert s.baseline_value == expected_baseline
    assert s.previous_value == expected_prev
    assert s.current_value == expected_curr
    assert s.trend == expected_trend

def test_reverse_chronological_rows_normalized():
    # Rows written in reverse chronological order in source
    content = """week_start: 2026-08-24 | latency_p95: 370
week_start: 2026-08-17 | latency_p95: 365
week_start: 2026-08-10 | latency_p95: 360
week_start: 2026-06-01 | latency_p95: 318"""
    
    chunk = {
        "document_id": "doc_rev",
        "document_name": "perf.csv",
        "chunk_id": "chunk_rev",
        "citation": "perf.csv",
        "content": content
    }

    series = TimeSeriesEngine.extract_metric_series([chunk], "proj_1")
    assert len(series) == 1
    s = series[0]
    # Earliest date is 2026-06-01 (318), latest is 2026-08-24 (370), previous is 2026-08-17 (365)
    assert s.baseline_value == 318.0
    assert s.baseline_timestamp == "2026-06-01"
    assert s.previous_value == 365.0
    assert s.previous_timestamp == "2026-08-17"
    assert s.current_value == 370.0
    assert s.current_timestamp == "2026-08-24"
    assert s.baseline_to_current_change == 16.35
    assert s.previous_to_current_change == 1.37
    assert s.trend == "INCREASING"

def test_shuffled_retrieval_order_multi_chunk():
    # Chunk 1 has later weeks, Chunk 0 has earlier weeks
    chunk_1 = {
        "document_id": "doc_multi",
        "document_name": "ops.csv",
        "chunk_id": "chunk_later",
        "citation": "ops.csv Chunk 2",
        "content": """week_start: 2026-08-17 | failure_count: 28
week_start: 2026-08-24 | failure_count: 32"""
    }
    chunk_0 = {
        "document_id": "doc_multi",
        "document_name": "ops.csv",
        "chunk_id": "chunk_earlier",
        "citation": "ops.csv Chunk 1",
        "content": """week_start: 2026-06-01 | failure_count: 7
week_start: 2026-07-01 | failure_count: 15
week_start: 2026-08-03 | failure_count: 22"""
    }

    # Retrieve in SHUFFLED order (chunk_1 before chunk_0)
    series_shuffled = TimeSeriesEngine.extract_metric_series([chunk_1, chunk_0], "proj_1")
    assert len(series_shuffled) == 1
    s = series_shuffled[0]

    # Verify true earliest (7) and true latest (32), NOT 22
    assert s.baseline_value == 7.0
    assert s.baseline_timestamp == "2026-06-01"
    assert s.previous_value == 28.0
    assert s.previous_timestamp == "2026-08-17"
    assert s.current_value == 32.0
    assert s.current_timestamp == "2026-08-24"
    assert s.baseline_to_current_change == 357.14
    assert s.previous_to_current_change == 14.29
    assert s.trend == "INCREASING"
    assert set(s.supporting_chunk_ids) == {"chunk_earlier", "chunk_later"}

def test_multi_document_isolation():
    # Document A and Document B both have "open_bugs"
    chunk_a = {
        "document_id": "doc_service_alpha",
        "document_name": "alpha_metrics.csv",
        "chunk_id": "chunk_a",
        "citation": "alpha_metrics.csv",
        "content": "date: 2026-06-01 | open_bugs: 5\ndate: 2026-08-01 | open_bugs: 10"
    }
    chunk_b = {
        "document_id": "doc_service_beta",
        "document_name": "beta_metrics.csv",
        "chunk_id": "chunk_b",
        "citation": "beta_metrics.csv",
        "content": "date: 2026-06-01 | open_bugs: 100\ndate: 2026-08-01 | open_bugs: 50"
    }

    series = TimeSeriesEngine.extract_metric_series([chunk_a, chunk_b], "proj_1")
    # Must produce 2 separate series, NOT merge them
    assert len(series) == 2
    doc_ids = {s.source_document_id for s in series}
    assert doc_ids == {"doc_service_alpha", "doc_service_beta"}

    alpha_s = next(s for s in series if s.source_document_id == "doc_service_alpha")
    beta_s = next(s for s in series if s.source_document_id == "doc_service_beta")

    assert alpha_s.baseline_value == 5.0
    assert alpha_s.current_value == 10.0
    assert alpha_s.trend == "INCREASING"

    assert beta_s.baseline_value == 100.0
    assert beta_s.current_value == 50.0
    assert beta_s.trend == "DECREASING"

def test_markdown_table_parsing():
    chunk_md = {
        "document_id": "doc_pdf_report",
        "document_name": "ExecutiveReport.pdf",
        "chunk_id": "chunk_md",
        "citation": "ExecutiveReport.pdf Page 2",
        "content": """| Quarter | Server Errors | Latency P95 |
|---|---|---|
| Q1 2026 | 120 | 250 |
| Q2 2026 | 145 | 280 |
| Q3 2026 | 210 | 340 |"""
    }

    series = TimeSeriesEngine.extract_metric_series([chunk_md], "proj_1")
    assert len(series) == 2

    err_s = next(s for s in series if "error" in s.metric_name.lower())
    assert err_s.baseline_value == 120.0
    assert err_s.previous_value == 145.0
    assert err_s.current_value == 210.0
    assert err_s.trend == "INCREASING"

def test_evidence_conversion_and_provenance():
    chunk = {
        "document_id": "doc_prov",
        "document_name": "data.csv",
        "chunk_id": "chunk_p1",
        "citation": "data.csv",
        "content": "sprint: Sprint 1 | defect_density: 2.1\nsprint: Sprint 2 | defect_density: 4.5"
    }

    series = TimeSeriesEngine.extract_metric_series([chunk], "proj_prov")
    evidence_items = TimeSeriesEngine.series_to_evidence_items(series, "company_1")
    
    assert len(evidence_items) == 1
    ev = evidence_items[0]
    assert ev["baseline_value"] == 2.1
    assert ev["previous_value"] == 2.1
    assert ev["current_value"] == 4.5
    assert ev["baseline_timestamp"] == "Sprint 1"
    assert ev["current_timestamp"] == "Sprint 2"
    assert ev["baseline_to_current_change"] == 114.29
    assert ev["direction"] == "INCREASING"
    assert ev["supporting_chunk_ids"] == ["chunk_p1"]
    assert "all_observations" in ev["source_metadata"]

def test_zero_baseline_and_negative_values():
    chunk = {
        "document_id": "doc_edge",
        "document_name": "edge.csv",
        "chunk_id": "chunk_edge",
        "citation": "edge.csv",
        "content": """period: P1 | delta_score: -10 | zero_metric: 0
period: P2 | delta_score: -2 | zero_metric: 15"""
    }

    series = TimeSeriesEngine.extract_metric_series([chunk], "proj_edge")
    assert len(series) == 2

    zero_s = next(s for s in series if s.metric_name == "zero_metric")
    assert zero_s.baseline_value == 0.0
    assert zero_s.current_value == 15.0
    assert zero_s.baseline_to_current_change is None # Zero baseline safe
    assert zero_s.trend == "INCREASING"

    neg_s = next(s for s in series if s.metric_name == "delta_score")
    assert neg_s.baseline_value == -10.0
    assert neg_s.current_value == -2.0
    assert neg_s.baseline_to_current_change == 80.0
    assert neg_s.trend == "INCREASING"

def test_baseline_change_vs_previous_period_change_multi_point_series():
    """
    Test 13-point chronological series:
    4.8, 5.0, 5.2, 5.4, 5.6, 5.8, 6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2
    """
    values = [4.8, 5.0, 5.2, 5.4, 5.6, 5.8, 6.0, 6.2, 6.4, 6.6, 6.8, 7.0, 7.2]
    dates = [
        "2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29",
        "2026-07-06", "2026-07-13", "2026-07-20", "2026-07-27", "2026-08-03",
        "2026-08-10", "2026-08-17", "2026-08-24"
    ]
    lines = [f"week_start: {d} | api_requests_millions: {v}" for d, v in zip(dates, values)]

    chunk = {
        "document_id": "doc_api_req",
        "document_name": "engineeringmetrics.csv",
        "chunk_id": "chunk_api_1",
        "citation": "engineeringmetrics.csv",
        "content": "\n".join(lines)
    }

    series_list = TimeSeriesEngine.extract_metric_series([chunk], "proj_eng")
    assert len(series_list) == 1
    s = series_list[0]

    assert s.baseline_value == 4.8
    assert s.baseline_timestamp == "2026-06-01"
    assert s.previous_value == 7.0
    assert s.previous_timestamp == "2026-08-17"
    assert s.current_value == 7.2
    assert s.current_timestamp == "2026-08-24"

    # Baseline -> Current (Total Change): (7.2 - 4.8) / 4.8 * 100 = +50.00%
    assert s.baseline_to_current_change == 50.0
    assert s.baseline_to_current_change_percent == 50.0

    # Previous -> Current (Period Change): (7.2 - 7.0) / 7.0 * 100 = +2.86%
    assert s.previous_to_current_change == 2.86
    assert s.previous_to_current_change_percent == 2.86

    # Convert to EvidenceItem
    evidence_items = TimeSeriesEngine.series_to_evidence_items(series_list)
    assert len(evidence_items) == 1
    ev = evidence_items[0]
    assert ev["baseline_value"] == 4.8
    assert ev["previous_value"] == 7.0
    assert ev["current_value"] == 7.2
    assert ev["baseline_to_current_change_percent"] == 50.0
    assert ev["previous_to_current_change_percent"] == 2.86
    assert "50.00% total change" in ev["statement"]
    assert "2.86% period change" in ev["statement"]
