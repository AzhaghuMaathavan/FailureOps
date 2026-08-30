from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.retrieval_service import search_knowledge_base
from app.core.tenant import get_tenant_context
from app.models.document import Document

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None
    project_id: Optional[str] = None

@router.post("/search")
def tenant_search_endpoint(
    request: SearchRequest,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Organization-scoped hybrid retrieval (BM25 + dense + RRF + rerank).
    Optionally restrict to a project and/or explicit document IDs.
    """
    document_ids = request.document_ids
    if request.project_id and not document_ids:
        docs = db.query(Document).filter(
            Document.organization_id == org_id,
            Document.project_id == request.project_id
        ).all()
        document_ids = [d.id for d in docs] or None

    results, metrics, _ = search_knowledge_base(
        db,
        request.query,
        document_ids,
        organization_id=org_id,
        project_id=request.project_id,
    )

    return {
        "query": request.query,
        "organization_id": org_id,
        "project_id": request.project_id,
        "results": results,
        "metrics": metrics,
    }
