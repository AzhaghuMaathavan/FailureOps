import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.core.config import settings
from app.services.retrieval_service import search_knowledge_base, expand_chunk_context

logger = logging.getLogger(__name__)

# 16 Core Evidence Dimensions and targeted search query intents
EVIDENCE_DIMENSIONS: Dict[str, Dict[str, Any]] = {
    "ADOPTION": {
        "intent": "Find measurable evidence about product adoption, activation rate, user retention, churn rate, trial drop-off, signup abandonment, and daily/monthly active users.",
        "bm25_terms": "activation rate adoption churn retention trial drop-off abandonment MAU WAU DAU",
        "category": "ADOPTION"
    },
    "CUSTOMER": {
        "intent": "Find customer feedback, qualitative reviews, user complaints, onboarding frustration, support ticket clusters, Net Promoter Score (NPS), and user interview statements.",
        "bm25_terms": "customer feedback complaints satisfaction NPS support ticket user frustration survey interview",
        "category": "CUSTOMER"
    },
    "TECHNICAL": {
        "intent": "Find technical incidents, bug reports, system outages, CI/CD build failures, test suite breakage, latency spikes, downtime, and architectural limitations.",
        "bm25_terms": "incident bug outage CI/CD failure crash latency downtime architecture error exception P1 P2",
        "category": "TECHNICAL"
    },
    "OPERATIONAL": {
        "intent": "Find operational bottlenecks, process friction, engineer overtime, pull request review delays, sprint velocity slowdowns, and deployment queue friction.",
        "bm25_terms": "bottleneck overtime PR review delay sprint velocity process friction workweek backlog queue",
        "category": "OPERATIONAL"
    },
    "FINANCIAL": {
        "intent": "Find documented financial metrics, Monthly Recurring Revenue (MRR), Annual Recurring Revenue (ARR), burn rate, runway, cost overruns, and pricing changes.",
        "bm25_terms": "MRR ARR revenue burn rate runway budget cost pricing cash flow profit",
        "category": "FINANCIAL"
    },
    "DELIVERY": {
        "intent": "Find evidence about project delivery deadlines, release milestones, schedule delays, launch readiness, postponed features, and missed commitments.",
        "bm25_terms": "deadline milestone delay launch release schedule postponed timeline roadmap beta",
        "category": "DELIVERY"
    },
    "QUALITY": {
        "intent": "Find test coverage erosion, QA bottlenecks, flaky integration tests, regression escapes, and defect resolution cycle times.",
        "bm25_terms": "test coverage QA flaky test regression defect quality test suite pass rate",
        "category": "QUALITY"
    },
    "RESOURCE": {
        "intent": "Find engineering capacity constraints, staffing shortages, contractor dependencies, under-resourced teams, and hiring delays.",
        "bm25_terms": "capacity staffing headcount engineers hiring bandwidth resource contractor shortage",
        "category": "RESOURCE"
    },
    "TEAM": {
        "intent": "Find team sentiment, developer morale, burnout risks, workload imbalances, attrition, and collaboration friction.",
        "bm25_terms": "team morale burnout sentiment workload fatigue attrition turnover collaboration",
        "category": "TEAM"
    },
    "MARKET": {
        "intent": "Find market timing constraints, competitive pressure, competitor feature launches, and shifting customer expectations.",
        "bm25_terms": "market competitor competition timing industry benchmark differentiation",
        "category": "MARKET"
    },
    "STRATEGY": {
        "intent": "Find documented strategic goals, pivot decisions, target market adjustments, value propositions, and core business assumptions.",
        "bm25_terms": "strategy goal objective pivot target market assumption positioning mission KPI",
        "category": "STRATEGY"
    },
    "SECURITY": {
        "intent": "Find security vulnerabilities, compliance blockers (SOC2, HIPAA, GDPR), audit findings, authentication issues, and data privacy restrictions.",
        "bm25_terms": "security vulnerability compliance SOC2 HIPAA GDPR audit auth KYC privacy leak",
        "category": "SECURITY"
    },
    "DEPENDENCY": {
        "intent": "Find third-party API dependencies, vendor blockers, external integration delays, and upstream service outages.",
        "bm25_terms": "dependency vendor third-party API integration upstream provider SLA blocker",
        "category": "DEPENDENCY"
    },
    "PERFORMANCE": {
        "intent": "Find performance benchmarks, slow database queries, response time degradation, throughput limits, and resource utilization spikes.",
        "bm25_terms": "performance slow latency response time throughput CPU memory IOPS database bottleneck",
        "category": "PERFORMANCE"
    },
    "RISK": {
        "intent": "Find explicitly documented project risks, executive concerns, critical warnings, team escalations, and blocker flags.",
        "bm25_terms": "risk concern warning blocker escalation critical threat obstacle caution",
        "category": "RISK"
    },
    "OTHER": {
        "intent": "Find any miscellaneous documented project events, executive decisions, or external context notes.",
        "bm25_terms": "decision event update announcement status notes context",
        "category": "OTHER"
    }
}


def _retrieve_single_dimension(
    dim: str,
    organization_id: str,
    project_id: str,
    document_ids: Optional[List[str]] = None
) -> Tuple[str, List[Dict[str, Any]], int]:
    """
    Executes hybrid retrieval for a single dimension with local DB session and graceful error handling.
    """
    dim_info = EVIDENCE_DIMENSIONS.get(dim)
    if not dim_info:
        return dim, [], 0

    query_intent = dim_info["intent"]
    thread_db = SessionLocal()
    try:
        final_evidence, metrics, raw_candidates = search_knowledge_base(
            db=thread_db,
            query_text=query_intent,
            document_ids=document_ids,
            organization_id=organization_id,
            project_id=project_id,
            filters={"retrieval_scope": "MULTI_FACT"}
        )

        expanded = expand_chunk_context(thread_db, final_evidence[:settings.EVIDENCE_FINAL_TOP_K])
        dim_terms = [t.lower() for t in dim_info.get("bm25_terms", "").split() if len(t) > 2]

        gated_chunks = []
        for chunk in expanded:
            content_lower = chunk.get("content", "").lower()
            rerank_score = chunk.get("rerank_score", 0.0)
            hybrid_score = chunk.get("hybrid_score", 0.0)
            bm25_score = chunk.get("bm25_score", 0.0)

            has_term_match = any(t in content_lower for t in dim_terms)
            meets_rerank = rerank_score >= settings.RETRIEVAL_MIN_RERANK_SCORE
            meets_hybrid = hybrid_score >= settings.RETRIEVAL_MIN_HYBRID_SCORE
            meets_bm25 = bm25_score >= settings.RETRIEVAL_MIN_BM25_SCORE

            if (has_term_match and (meets_rerank or meets_hybrid or meets_bm25)) or (rerank_score >= 4.0):
                gated_chunks.append(chunk)

        return dim, gated_chunks, len(raw_candidates)
    except Exception as e:
        logger.warning(f"[evidence_retriever] Dimension '{dim}' retrieval exception: {e}")
        return dim, [], 0
    finally:
        thread_db.close()


def retrieve_project_evidence_candidates(
    db: Session,
    organization_id: str,
    project_id: str,
    document_ids: Optional[List[str]] = None,
    dimensions: Optional[List[str]] = None,
    max_workers: int = 4,
    timeout_seconds: float = 20.0
) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, Any]]:
    """
    Executes concurrent targeted hybrid retrieval across evidence dimensions with timeout protection.
    Enforces strict tenant isolation by organization_id and project_id.
    """
    target_dims = dimensions or list(EVIDENCE_DIMENSIONS.keys())
    results_by_dimension: Dict[str, List[Dict[str, Any]]] = {}
    
    total_searched = 0
    t0 = time.time()

    # Run dimension queries concurrently using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_dim = {
            executor.submit(_retrieve_single_dimension, dim, organization_id, project_id, document_ids): dim
            for dim in target_dims
        }

        try:
            for future in as_completed(future_to_dim, timeout=timeout_seconds):
                dim_name = future_to_dim[future]
                try:
                    dim, chunks, raw_count = future.result()
                    results_by_dimension[dim] = chunks
                    total_searched += raw_count
                except Exception as exc:
                    logger.warning(f"[evidence_retriever] Dimension {dim_name} failed with {exc}")
                    results_by_dimension[dim_name] = []
        except TimeoutError:
            logger.warning(f"[evidence_retriever] Retrieval timeout after {timeout_seconds}s; returning partial results")
            for future, dim_name in future_to_dim.items():
                if dim_name not in results_by_dimension:
                    results_by_dimension[dim_name] = []

    # Ensure all target dimensions exist in the results map
    for d in target_dims:
        if d not in results_by_dimension:
            results_by_dimension[d] = []

    # Guarantee multi-document representation for all uploaded documents in the project
    seen_doc_ids = set()
    for chunks_list in results_by_dimension.values():
        for chk in chunks_list:
            d_id = chk.get("document_id")
            if d_id:
                seen_doc_ids.add(d_id)

    try:
        from app.models.document import Document
        from app.models.chunk import Chunk
        all_docs = db.query(Document).filter(
            Document.project_id == project_id,
            Document.organization_id == organization_id
        ).all()
        for doc in all_docs:
            if doc.id not in seen_doc_ids:
                doc_chunks = db.query(Chunk).filter(Chunk.document_id == doc.id).order_by(Chunk.chunk_index).limit(2).all()
                if doc_chunks:
                    st = doc.document_type or "PRODUCT_PLAN"
                    target_dim = "TECHNICAL" if st == "ENGINEERING_METRICS" else ("TEAM" if st == "TEAM_OPERATIONS" else ("CUSTOMER" if st == "CUSTOMER_FEEDBACK" else ("FINANCIAL" if st == "PRODUCT_METRICS" else "STRATEGY")))
                    for c in doc_chunks:
                        lin = dict(c.lineage or {})
                        lin["document_name"] = doc.filename
                        lin["document_type"] = st
                        lin["source_type"] = st
                        c_dict = {
                            "id": c.id,
                            "chunk_id": c.id,
                            "document_id": doc.id,
                            "content": c.content,
                            "lineage": lin,
                            "rerank_score": 5.0,
                            "hybrid_score": 0.5,
                            "bm25_score": 0.5
                        }
                        results_by_dimension[target_dim].append(c_dict)
    except Exception as e:
        logger.warning(f"[evidence_retriever] Supplemental document chunk representation error: {e}")

    duration = time.time() - t0

    operational_metrics = {
        "dimensions_queried": len(target_dims),
        "total_raw_candidates": total_searched,
        "retrieval_duration_seconds": round(duration, 3)
    }

    return results_by_dimension, operational_metrics

