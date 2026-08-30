import uuid
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from ..schemas.analysis import AnalysisRequest, AnalysisResponse
from ..services.security import authenticate_service_request
from ..graph.workflow import get_compiled_graph
from ..graph.state import FailureOpsGraphState

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse, summary="Execute FailureOps X Intelligence Analysis")
def execute_analysis(
    request: AnalysisRequest,
    authenticated: bool = Depends(authenticate_service_request),
    db: Session = Depends(get_db)
) -> AnalysisResponse:
    """
    Executes the FailureOps X LangGraph Intelligence pipeline:
    RAG Retrieval -> Evidence Agent -> Evidence Validation -> Signal Agent -> Signal Validation -> Structured Output.
    """
    analysis_id = request.analysis_id or str(uuid.uuid4())
    req_id = str(uuid.uuid4())
    logger.info(f"[API] Received intelligence analysis request: analysis_id={analysis_id}, project_id={request.project_id}")

    initial_state: FailureOpsGraphState = {
        "request_id": req_id,
        "analysis_id": analysis_id,
        "project_id": request.project_id,
        "company_id": request.company_id,
        "query": request.query,
        "document_ids": request.document_ids,
        "options": request.options,
        "db": db,
        "retrieved_chunks": [],
        "raw_evidence": [],
        "raw_events": [],
        "raw_claims": [],
        "validated_evidence": [],
        "validated_events": [],
        "validated_claims": [],
        "signals": [],
        "relationships": [],
        "citations": [],
        "warnings": [],
        "status": "in_progress",
        "node_latencies": {},
        "node_path": []
    }

    try:
        compiled_graph = get_compiled_graph()
        result_state = compiled_graph.invoke(initial_state)
        final_response = result_state.get("final_response")

        if not final_response:
            raise RuntimeError("LangGraph execution completed without producing final_response.")

        return final_response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[API] Unhandled error during intelligence analysis: {e}", exc_info=True)
        return AnalysisResponse(
            analysis_id=analysis_id,
            project_id=request.project_id,
            company_id=request.company_id,
            status="failed",
            error_message=f"Internal Intelligence Service error: {str(e)}"
        )
