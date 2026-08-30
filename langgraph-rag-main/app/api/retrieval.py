from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.services.retrieval_service import search_knowledge_base

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None

@router.post("/search")
def dev_search_endpoint(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Internal Developer Endpoint to test retrieval + reranking.
    Do NOT use this as the public chat endpoint.
    """
    results, metrics, _ = search_knowledge_base(db, request.query, request.document_ids)
    
    return {
        "query": request.query,
        "results": results, "metrics": metrics
    }
