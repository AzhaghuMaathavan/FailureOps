import logging
import uuid
import re
from typing import List, Dict, Any, Tuple, Optional
from app.services.agent_service import call_llm, extract_json
from ..config import intelligence_settings
from ..services.timeseries_engine import TimeSeriesEngine
from ..services.normalization import normalize_signal_name

logger = logging.getLogger(__name__)

def safe_float(v: Any, default: Optional[float] = 1.0) -> Optional[float]:
    """Safely coerces any value to float, handling trailing periods, percent signs, and whitespace."""
    if v is None:
        return default
    if isinstance(v, (int, float)):
        return float(v)
    try:
        clean = str(v).strip().rstrip(".").rstrip("%")
        return float(clean)
    except Exception:
        return default

def format_chunk_content(content: str) -> str:
    """
    Formats and compresses large repetitive tabular lines to keep extraction crisp
    without dropping qualitative data, feedback, narrative text, or incident descriptions.
    """
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    table_lines = [l for l in lines if "|" in l and ":" in l]
    
    qualitative_keywords = {
        "feedback", "comment", "note", "notes", "statement", "description", 
        "quote", "review", "opinion", "recommendation", "assessment", 
        "observation", "narrative", "issue", "reason", "detail", "details", 
        "summary", "message", "complaint", "suggestion", "incident", "event", "claim"
    }
    
    has_qualitative_text = False
    for l in table_lines:
        l_lower = l.lower()
        if any(k in l_lower for k in qualitative_keywords):
            has_qualitative_text = True
            break
        if len(l) > 90:
            has_qualitative_text = True
            break
        # Count alphabetic words with length >= 4
        words = re.findall(r'[a-zA-Z]{4,}', l)
        if len(words) >= 4:
            has_qualitative_text = True
            break
            
    if len(table_lines) > 4 and not has_qualitative_text:
        header_line = [lines[0]] if lines and not ("|" in lines[0]) else []
        compact = header_line + [
            f"[Baseline Period]: {table_lines[0]}",
            f"[Intermediate Period]: {table_lines[len(table_lines)//2]}",
            f"[Latest Period]: {table_lines[-1]}"
        ]
        return "\n".join(compact)
    return content[:4000]

class EvidenceAgent:
    """
    Evidence Agent extracts structured, verifiable facts, events, claims, and metrics
    from retrieved RAG chunks using a combination of deterministic time-series analysis
    and LLM semantic extraction.
    """

    @classmethod
    def extract_evidence(
        cls,
        query: str,
        retrieved_chunks: List[Dict[str, Any]],
        project_id: str,
        company_id: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Extracts (evidence_items, events, claims, warnings) from retrieved chunks.
        """
        if not retrieved_chunks:
            logger.info("[EvidenceAgent] No chunks provided; returning empty extraction.")
            return [], [], [], []

        # 1. Deterministic Multi-Chunk Time-Series Extraction
        deterministic_series = TimeSeriesEngine.extract_metric_series(
            retrieved_chunks=retrieved_chunks,
            project_id=project_id,
            company_id=company_id
        )
        deterministic_evidence = TimeSeriesEngine.series_to_evidence_items(
            series_list=deterministic_series,
            company_id=company_id
        )
        time_series_prompt_summary = TimeSeriesEngine.format_time_series_prompt_summary(deterministic_series)

        # 2. Construct Untrusted Document Context
        formatted_chunks_text = []
        chunk_map = {}
        top_chunks = retrieved_chunks[:intelligence_settings.MAX_RETRIEVED_CHUNKS]

        for idx, c in enumerate(top_chunks):
            cid = c.get("chunk_id") or f"chunk_{idx+1}"
            chunk_map[idx + 1] = c
            doc_name = c.get("document_name", "Unknown Document")
            citation = c.get("citation", doc_name)
            raw_content = c.get("content", "").strip()
            content = format_chunk_content(raw_content)

            formatted_chunks_text.append(
                f"--- [CHUNK {idx+1} | Source: {citation} | ID: {cid}] ---\n{content}"
            )

        context_str = "\n\n".join(formatted_chunks_text)

        # 3. Formulate Strict Extraction System Prompt and User Prompt
        system_prompt = (
            "You are a rigorous information extraction engine for FailureOps.\n"
            "Your objective is to extract source-grounded factual evidence, concrete operational/project events, and subjective customer/stakeholder claims from the provided document chunks.\n"
            "CRITICAL DEFINITIONS:\n"
            "1. EVIDENCE (Factual Observation / Metric): A source-grounded factual observation, measurement, metric change, architecture property, or objective status statement.\n"
            "2. EVENT (Concrete Occurrence): A concrete occurrence, milestone, release, delay, incident, outage, deployment, or state transition described in the text.\n"
            "3. CLAIM (Subjective Assertion / Opinion / Feedback): A statement, opinion, assertion, belief, customer feedback quote, or stakeholder sentiment made by a user, customer, or document author.\n"
            "OUTPUT FORMAT: You MUST output ONLY a valid JSON object matching the requested schema. Start immediately with '{' and end with '}'."
        )

        user_prompt = (
            "Extract all source-grounded concrete operational events, qualitative customer/stakeholder claims, and non-time-series factual evidence from the document chunks into this exact JSON schema:\n"
            "{\n"
            '  "events": [\n'
            '    {\n'
            '      "description": "Concrete occurrence, milestone, incident, outage, or release described in the source",\n'
            '      "event_type": "DEPLOYMENT",\n'
            '      "timestamp": null,\n'
            '      "source_chunk_index": 1,\n'
            '      "confidence": 0.90\n'
            '    }\n'
            '  ],\n'
            '  "claims": [\n'
            '    {\n'
            '      "statement": "Subjective claim, opinion, assertion, complaint, or customer feedback quote",\n'
            '      "source_speaker": "Customer type, author, or role if known else null",\n'
            '      "source_chunk_index": 1,\n'
            '      "confidence": 0.85\n'
            '    }\n'
            '  ],\n'
            '  "evidence": [\n'
            '    {\n'
            '      "statement": "Explicit factual observation, target, or architectural property",\n'
            '      "fact_type": "METRIC",\n'
            '      "metric_name": "Standardized metric name",\n'
            '      "previous_value": null,\n'
            '      "current_value": null,\n'
            '      "unit": null,\n'
            '      "direction": "UNKNOWN",\n'
            '      "timestamp": null,\n'
            '      "period": null,\n'
            '      "source_chunk_index": 1,\n'
            '      "confidence": 0.95\n'
            '    }\n'
            '  ]\n'
            "}\n\n"
            f"CHRONOLOGICAL TIME-SERIES CONTEXT:\n{time_series_prompt_summary}\n\n"
            "EXTRACTION RULES & BUDGETING:\n"
            "1. EVENTS: If the source text describes concrete occurrences, milestones, incidents, outages, or releases (e.g. 'Release delayed by two weeks', 'Grid inverter sync failed on June 12', 'Blackbox telemetry initialized'), extract up to 10 events into 'events'.\n"
            "2. CLAIMS: If the source contains opinions, subjective assertions, executive statements, customer feedback, complaints, or stakeholder sentiments (e.g. 'Demand forecasts have been consistent', 'Our team is spending more time checking data', 'Incomplete meter readings are confusing operators'), extract up to 15 key qualitative claims into 'claims'.\n"
            "3. EVIDENCE: Extract up to 5 key non-time-series factual status or architectural observations. (Do NOT repeat tabular time-series metrics that are already summarized above).\n"
            "4. Do NOT force events or claims if the source only contains pure numerical telemetry (e.g. CSVs with only numbers should have empty events and claims).\n"
            "5. Keep descriptions concise (1 short sentence). Output ONLY the JSON object. Zero commentary.\n\n"
            f"ANALYSIS QUERY: {query}\n\n"
            f"DOCUMENT CHUNKS:\n{context_str}\n\n"
            "JSON:"
        )

        extraction_warnings = []
        try:
            raw_response = call_llm(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                json_mode=True,
                max_tokens=4096,
                timeout=intelligence_settings.INTELLIGENCE_TIMEOUT_SECONDS
            )
            try:
                with open("scratch/last_raw_response.txt", "w", encoding="utf-8") as f:
                    f.write(raw_response)
            except Exception:
                pass
            parsed_data = extract_json(raw_response)
        except Exception as e:
            logger.error(f"[EvidenceAgent] LLM extraction error: {e}")
            extraction_warnings.append({
                "code": "EVIDENCE_AGENT_PARSE_ERROR",
                "message": f"Evidence Agent failed to parse LLM response: {str(e)}",
                "field": "evidence_agent",
                "severity": "HIGH"
            })
            parsed_data = {"evidence": [], "events": [], "claims": []}

        # 4. Post-Process LLM Extractions and Attach Complete Chunk Provenance
        raw_evidence = parsed_data.get("evidence", []) if isinstance(parsed_data, dict) else []
        raw_events = parsed_data.get("events", []) if isinstance(parsed_data, dict) else []
        raw_claims = parsed_data.get("claims", []) if isinstance(parsed_data, dict) else []

        # Index canonical names of deterministic series to avoid duplication
        deterministic_canonical_names = {
            (s.project_id, s.source_document_id, s.canonical_name) for s in deterministic_series
        }

        merged_evidence = list(deterministic_evidence)

        for idx, item in enumerate(raw_evidence):
            try:
                chunk_idx = item.get("source_chunk_index", 1)
                matched_chunk = chunk_map.get(chunk_idx, retrieved_chunks[0])
                doc_id = matched_chunk.get("document_id", "unknown")
                doc_name = matched_chunk.get("document_name", "Unknown Document")
                citation = matched_chunk.get("citation", doc_name)
                page_numbers = matched_chunk.get("lineage", {}).get("page_numbers", [])
                
                metric_raw = item.get("metric_name") or item.get("statement", "")
                can_name, _ = normalize_signal_name(metric_raw)

                # If this metric is already accurately represented by deterministic time series, skip duplicate
                if (project_id, doc_id, can_name) in deterministic_canonical_names:
                    continue

                prev_val = safe_float(item.get("previous_value"), default=None) if item.get("previous_value") is not None else None
                curr_val = safe_float(item.get("current_value"), default=None) if item.get("current_value") is not None else None

                ev_id = f"ev_llm_{str(uuid.uuid4())[:8]}"
                merged_evidence.append({
                    "evidence_id": ev_id,
                    "project_id": project_id,
                    "company_id": company_id,
                    "statement": item.get("statement", ""),
                    "fact_type": item.get("fact_type", "METRIC"),
                    "metric_name": item.get("metric_name"),
                    "baseline_value": prev_val,
                    "previous_value": prev_val,
                    "current_value": curr_val,
                    "baseline_timestamp": None,
                    "previous_timestamp": None,
                    "current_timestamp": item.get("timestamp"),
                    "baseline_to_current_change": None,
                    "previous_to_current_change": None,
                    "baseline_to_current_change_percent": None,
                    "previous_to_current_change_percent": None,
                    "unit": item.get("unit"),
                    "direction": item.get("direction", "UNKNOWN"),
                    "timestamp": item.get("timestamp"),
                    "period": item.get("period"),
                    "source_document_id": doc_id,
                    "source_document_name": doc_name,
                    "source_chunk_id": matched_chunk.get("chunk_id", "unknown"),
                    "supporting_chunk_ids": [matched_chunk.get("chunk_id", "unknown")],
                    "citation": citation,
                    "source_metadata": matched_chunk.get("lineage", {}).get("source_metadata", {}),
                    "page_numbers": page_numbers,
                    "observations_count": 1,
                    "extraction_confidence": safe_float(item.get("confidence"), default=1.0) or 1.0
                })
            except Exception as e:
                logger.warning(f"[EvidenceAgent] Error post-processing evidence item: {e}")

        processed_events = []
        for idx, evt in enumerate(raw_events):
            try:
                chunk_idx = evt.get("source_chunk_index", 1)
                matched_chunk = chunk_map.get(chunk_idx, retrieved_chunks[0])
                doc_id = matched_chunk.get("document_id", "unknown")
                doc_name = matched_chunk.get("document_name", "Unknown Document")
                citation = matched_chunk.get("citation", doc_name)
                page_numbers = matched_chunk.get("lineage", {}).get("page_numbers", [])
                
                if page_numbers:
                    loc_type = "page"
                    loc_val = f"Page {', '.join(str(p) for p in page_numbers)}"
                else:
                    loc_type = "chunk"
                    loc_val = citation

                processed_events.append({
                    "event_id": f"evt_{str(uuid.uuid4())[:8]}",
                    "project_id": project_id,
                    "description": evt.get("description", ""),
                    "event_type": evt.get("event_type", "OTHER"),
                    "timestamp": evt.get("timestamp"),
                    "source_document_id": doc_id,
                    "source_document_name": doc_name,
                    "source_chunk_id": matched_chunk.get("chunk_id", "unknown"),
                    "supporting_chunk_ids": [matched_chunk.get("chunk_id", "unknown")],
                    "location_type": loc_type,
                    "location_value": loc_val,
                    "page_numbers": page_numbers,
                    "citation": citation,
                    "source_metadata": matched_chunk.get("lineage", {}).get("source_metadata", {}),
                    "confidence": safe_float(evt.get("confidence"), default=1.0) or 1.0
                })
            except Exception as e:
                logger.warning(f"[EvidenceAgent] Error post-processing event item: {e}")

        processed_claims = []
        for idx, clm in enumerate(raw_claims):
            try:
                chunk_idx = clm.get("source_chunk_index", 1)
                matched_chunk = chunk_map.get(chunk_idx, retrieved_chunks[0])
                doc_id = matched_chunk.get("document_id", "unknown")
                doc_name = matched_chunk.get("document_name", "Unknown Document")
                citation = matched_chunk.get("citation", doc_name)
                page_numbers = matched_chunk.get("lineage", {}).get("page_numbers", [])
                
                if page_numbers:
                    loc_type = "page"
                    loc_val = f"Page {', '.join(str(p) for p in page_numbers)}"
                else:
                    loc_type = "chunk"
                    loc_val = citation

                processed_claims.append({
                    "claim_id": f"clm_{str(uuid.uuid4())[:8]}",
                    "project_id": project_id,
                    "statement": clm.get("statement", ""),
                    "source_speaker_or_entity": clm.get("source_speaker") or clm.get("source_speaker_or_entity"),
                    "source_document_id": doc_id,
                    "source_document_name": doc_name,
                    "source_chunk_id": matched_chunk.get("chunk_id", "unknown"),
                    "supporting_chunk_ids": [matched_chunk.get("chunk_id", "unknown")],
                    "location_type": loc_type,
                    "location_value": loc_val,
                    "page_numbers": page_numbers,
                    "citation": citation,
                    "source_metadata": matched_chunk.get("lineage", {}).get("source_metadata", {}),
                    "confidence": safe_float(clm.get("confidence"), default=1.0) or 1.0,
                    "verified_as_fact": False
                })
            except Exception as e:
                logger.warning(f"[EvidenceAgent] Error post-processing claim item: {e}")

        logger.info(f"[EvidenceAgent] Extracted {len(merged_evidence)} total evidence items ({len(deterministic_evidence)} deterministic series, {len(merged_evidence) - len(deterministic_evidence)} LLM items), {len(processed_events)} events, {len(processed_claims)} claims.")
        return merged_evidence, processed_events, processed_claims, extraction_warnings
