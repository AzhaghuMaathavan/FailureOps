import time
import logging
from typing import Dict, Any
from ..state import FailureOpsGraphState
from ...services.security import validate_project_and_documents
from ...schemas.analysis import ValidationWarning

logger = logging.getLogger(__name__)

def validate_request_node(state: FailureOpsGraphState) -> Dict[str, Any]:
    """
    Validates the incoming analysis request context, project authorization, and document existence.
    """
    t0 = time.time()
    node_latencies = dict(state.get("node_latencies", {}))
    node_path = list(state.get("node_path", []))
    node_path.append("validate_request")
    warnings = list(state.get("warnings", []))

    project_id = state.get("project_id", "").strip()
    query = state.get("query", "").strip()
    company_id = state.get("company_id")
    document_ids = state.get("document_ids")
    db = state.get("db")

    if not project_id:
        node_latencies["validate_request"] = round(time.time() - t0, 4)
        return {
            "status": "failed",
            "error_message": "Validation Error: 'project_id' is mandatory.",
            "node_latencies": node_latencies,
            "node_path": node_path
        }

    if not query:
        node_latencies["validate_request"] = round(time.time() - t0, 4)
        return {
            "status": "failed",
            "error_message": "Validation Error: 'query' must not be empty.",
            "node_latencies": node_latencies,
            "node_path": node_path
        }

    verified_doc_ids = document_ids or []
    if db and document_ids:
        try:
            verified_doc_ids = validate_project_and_documents(
                project_id=project_id,
                company_id=company_id,
                document_ids=document_ids,
                db=db
            )
        except Exception as e:
            logger.warning(f"[ValidationNode] Security validation exception: {e}")
            warnings.append(ValidationWarning(
                code="DOCUMENT_AUTHORIZATION_FAILED",
                message=str(e),
                severity="HIGH"
            ))
            node_latencies["validate_request"] = round(time.time() - t0, 4)
            return {
                "status": "failed",
                "error_message": f"Security Error: {str(e)}",
                "warnings": warnings,
                "node_latencies": node_latencies,
                "node_path": node_path
            }

    node_latencies["validate_request"] = round(time.time() - t0, 4)
    logger.info(f"[ValidationNode] Request validated successfully for project '{project_id}'.")
    return {
        "status": "in_progress",
        "document_ids": verified_doc_ids,
        "warnings": warnings,
        "node_latencies": node_latencies,
        "node_path": node_path
    }
