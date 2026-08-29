import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
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

def retrieve_project_evidence_candidates(
    db: Session,
    organization_id: str,
    project_id: str,
    document_ids: Optional[List[str]] = None,
    dimensions: Optional[List[str]] = None
) -> Tuple[Dict[str, List[Dict[str, Any]]], Dict[str, Any]]:
    """
    Executes targeted hybrid retrieval across all evidence dimensions.
    Enforces strict tenant isolation by organization_id and project_id.
    """
    target_dims = dimensions or list(EVIDENCE_DIMENSIONS.keys())
    results_by_dimension: Dict[str, List[Dict[str, Any]]] = {}
    
    total_searched = 0
    t0 = time.time()
    
    for dim in target_dims:
        if dim not in EVIDENCE_DIMENSIONS:
            continue
            
        dim_info = EVIDENCE_DIMENSIONS[dim]
        query_intent = dim_info["intent"]
        
        # Hybrid retrieval with tenant filtering
        final_evidence, metrics, raw_candidates = search_knowledge_base(
            db=db,
            query_text=query_intent,
            document_ids=document_ids,
            organization_id=organization_id,
            project_id=project_id,
            filters={"retrieval_scope": "MULTI_FACT"}
        )
        
        # Clean & expand context
        expanded = expand_chunk_context(db, final_evidence[:settings.EVIDENCE_FINAL_TOP_K])
        
        # Retrieval Acceptance Gate:
        # Filter out generic/irrelevant chunks that do not meet relevance thresholds or dimension affinity
        gated_chunks = []
        dim_terms = [t.lower() for t in dim_info.get("bm25_terms", "").split() if len(t) > 2]
        
        for chunk in expanded:
            content_lower = chunk.get("content", "").lower()
            rerank_score = chunk.get("rerank_score", 0.0)
            hybrid_score = chunk.get("hybrid_score", 0.0)
            bm25_score = chunk.get("bm25_score", 0.0)
            
            # Acceptance conditions:
            # 1. Has direct keyword match with dimension domain terms OR
            # 2. Strong rerank score exceeding threshold (for deep semantic matches)
            has_term_match = any(t in content_lower for t in dim_terms)
            meets_rerank = rerank_score >= settings.RETRIEVAL_MIN_RERANK_SCORE
            meets_hybrid = hybrid_score >= settings.RETRIEVAL_MIN_HYBRID_SCORE
            meets_bm25 = bm25_score >= settings.RETRIEVAL_MIN_BM25_SCORE
            
            if (has_term_match and (meets_rerank or meets_hybrid or meets_bm25)) or (rerank_score >= 4.0):
                gated_chunks.append(chunk)
                
        results_by_dimension[dim] = gated_chunks
        total_searched += len(raw_candidates)
        
    duration = time.time() - t0
    
    operational_metrics = {
        "dimensions_queried": len(target_dims),
        "total_raw_candidates": total_searched,
        "retrieval_duration_seconds": round(duration, 3)
    }
    
    return results_by_dimension, operational_metrics

