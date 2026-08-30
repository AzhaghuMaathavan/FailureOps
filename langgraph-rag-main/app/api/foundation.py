import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.tenant import get_tenant_context
from app.db.database import get_db
from app.models.chunk import Chunk
from app.models.document import Document, Page
from app.core.storage import document_storage_fields
from app.services.ingest_service import ingest_upload
from app.services.rag_response import NO_EVIDENCE_ANSWER, empty_rag_response, sources_from_evidence
from app.api.health import probe_database

logger = logging.getLogger(__name__)
router = APIRouter()


class RagQueryRequest(BaseModel):
    query: str
    project_id: Optional[str] = "aurora"
    conversation_id: Optional[str] = None


def _serialize_document(db: Session, doc: Document) -> dict:
    return {
        "id": doc.id,
        "filename": doc.filename,
        "title": doc.title,
        "document_type": doc.document_type,
        "status": doc.status,
        "error_message": doc.error_message,
        "visibility": doc.visibility,
        "project_id": doc.project_id,
        "page_count": db.query(Page).filter(Page.document_id == doc.id).count(),
        "chunk_count": db.query(Chunk).filter(Chunk.document_id == doc.id).count(),
        "embedded_count": db.query(Chunk).filter(
            Chunk.document_id == doc.id,
            Chunk.embedding_status == "COMPLETED",
        ).count(),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        **document_storage_fields(doc),
    }


@router.get("/health")
def api_liveness():
    return {"status": "ok"}


@router.get("/health/db")
def api_db_health(db: Session = Depends(get_db)):
    return probe_database(db)


@router.get("/documents")
def list_documents(
    project_id: str = "aurora",
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(Document)
        .filter(Document.organization_id == org_id, Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return [_serialize_document(db, d) for d in docs]


@router.post("/documents/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: str = Form("aurora"),
    title: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    source_type: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PRIVATE"),
    sync: Optional[str] = Form("false"),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    doc_type = source_type or document_type or "PROJECT_DOC"
    return await ingest_upload(
        db,
        file,
        project_id=project_id,
        organization_id=org_id,
        title=title,
        document_type=doc_type,
        description=description,
        visibility=visibility or "PRIVATE",
        sync=sync,
        background_tasks=background_tasks,
    )


@router.post("/rag/query")
def rag_query(
    request: RagQueryRequest,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db),
):
    query = (request.query or "").strip()
    project_id = request.project_id or "aurora"
    if not query:
        raise HTTPException(status_code=400, detail="query is required")

    logger.info("[QUERY] project_id=%s organization_id=%s chars=%s", project_id, org_id, len(query))

    from app.services.agent_service import orchestrate_rag

    docs = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id,
    ).all()
    document_ids = [d.id for d in docs] or None

    try:
        result = orchestrate_rag(
            db,
            query,
            [query],
            document_ids,
            original_query=query,
            organization_id=org_id,
            project_id=project_id,
        )
    except ValueError as exc:
        logger.error("[QUERY] provider error: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("[QUERY] failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"RAG query failed: {exc}") from exc

    evidence = result.get("retrieved_evidence") or []
    citations = result.get("citations") or []
    sources = result.get("sources")
    if sources is None:
        sources = sources_from_evidence(citations or evidence)

    answer = result.get("answer") or ""
    if result.get("evidence_state") in {"NONE", "RETRIEVAL_ERROR"} or not evidence and not citations:
        if not answer or "couldn't find" in answer.lower() or "could not find" in answer.lower():
            return empty_rag_response(
                project_id=project_id,
                organization_id=org_id,
                conversation_id=request.conversation_id,
            )

    logger.info("[RESPONSE] project_id=%s sources=%s", project_id, len(sources))
    return {
        "answer": answer,
        "sources": sources,
        "citations": citations,
        "retrieved_evidence": evidence,
        "project_id": project_id,
        "organization_id": org_id,
        "evidence_state": result.get("evidence_state"),
        "domain_state": result.get("domain_state"),
        "conversation_id": request.conversation_id or result.get("conversation_id"),
    }
