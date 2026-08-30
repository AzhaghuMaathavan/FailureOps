import time
import logging
from typing import Dict, Any
from ..state import FailureOpsGraphState
from ...rag.adapter import RAGAdapter
from ...schemas.analysis import ValidationWarning

logger = logging.getLogger(__name__)

def retrieve_evidence_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    RAG Retrieval Node: Invokes existing RAG search via RAGAdapter.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("retrieve_evidence")
    warnings = list(state.get("warnings", []))

    if state.get("status") == "failed":
        node_latencies["retrieve_evidence"] = 0.0
        return {"node_path": node_path, "node_latencies": node_latencies}

    db = state.get("db")
    query = state.get("query", "")
    project_id = state.get("project_id", "")
    company_id = state.get("company_id")
    document_ids = state.get("document_ids")
    options = state.get("options", {})

    if not db:
        logger.warning("[RetrievalNode] Database session not provided in state.")
        # If no DB session passed directly, attempt fallback import
        from app.db.database import SessionLocal
        if SessionLocal:
            db_session = SessionLocal()
            close_db = True
        else:
            db_session = None
            close_db = False
    else:
        db_session = db
        close_db = False

    try:
        if db_session:
            chunks, metrics = RAGAdapter.retrieve(
                db=db_session,
                query=query,
                project_id=project_id,
                company_id=company_id,
                document_ids=document_ids,
                options=options
            )
            for k, v in metrics.items():
                if isinstance(v, (int, float)):
                    node_latencies[f"rag_{k}"] = round(v, 4)
        else:
            chunks = []
            warnings.append(ValidationWarning(
                code="RAG_DB_UNAVAILABLE",
                message="Database connection was not available for retrieval.",
                severity="HIGH"
            ))
    except Exception as e:
        logger.error(f"[RetrievalNode] Unexpected retrieval failure: {e}")
        chunks = []
        warnings.append(ValidationWarning(
            code="RETRIEVAL_EXCEPTION",
            message=f"Retrieval error: {str(e)}",
            severity="HIGH"
        ))
    finally:
        if close_db and db_session:
            db_session.close()

    elapsed = round(time.time() - t0, 4)
    node_latencies["retrieve_evidence"] = elapsed

    if not chunks:
        warnings.append(ValidationWarning(
            code="ZERO_CHUNKS_RETRIEVED",
            message=f"No relevant document evidence was retrieved for query '{query[:50]}...'.",
            severity="MEDIUM"
        ))

    logger.info(f"[RetrievalNode] Completed with {len(chunks)} chunks in {elapsed:.2f}s.")
    return {
        "retrieved_chunks": chunks,
        "warnings": warnings,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
