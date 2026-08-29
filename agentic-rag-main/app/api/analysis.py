import os
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException, Header
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
from app.models.document import Document
from app.models.chunk import Chunk
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.schemas.analysis import StartAnalysisRequest, StartAnalysisResponse, AnalysisStatusResponse
from app.schemas.evidence_packet import EvidencePacket
from app.services.document_service import process_document
from app.services.analysis_orchestrator import run_project_analysis_pipeline

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "storage", "documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_tenant_context(
    x_organization_id: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
) -> str:
    """
    Derives authenticated organization identity from server-side headers.
    Defaults to configured default organization if not supplied.
    """
    return x_organization_id or settings.DEFAULT_ORGANIZATION_ID


@router.post("/projects/{project_id}/analysis", response_model=StartAnalysisResponse)
def start_project_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    request: StartAnalysisRequest = StartAnalysisRequest(),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Starts an asynchronous FailureOps Evidence Intelligence analysis run for a project.
    """
    analysis_id = f"anl_{uuid.uuid4().hex[:12]}"
    
    db_analysis = ProjectAnalysis(
        id=analysis_id,
        organization_id=org_id,
        project_id=project_id,
        status="QUEUED",
        current_stage="QUEUED",
        progress_percent=0
    )
    db.add(db_analysis)
    db.commit()

    # Trigger background worker pipeline
    background_tasks.add_task(
        run_project_analysis_pipeline,
        analysis_id=analysis_id,
        organization_id=org_id,
        project_id=project_id
    )

    return StartAnalysisResponse(
        analysis_id=analysis_id,
        project_id=project_id,
        organization_id=org_id,
        status="QUEUED",
        message="Analysis job queued successfully"
    )


@router.get("/projects/{project_id}/analysis/{analysis_id}", response_model=AnalysisStatusResponse)
def get_analysis_status(
    project_id: str,
    analysis_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Polls the current status and progress of an analysis run with tenant authorization checks.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.id == analysis_id,
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found or unauthorized")

    return AnalysisStatusResponse(
        analysis_id=analysis.id,
        project_id=analysis.project_id,
        organization_id=analysis.organization_id,
        status=analysis.status,
        current_stage=analysis.current_stage,
        progress_percent=analysis.progress_percent,
        error_message=analysis.error_message,
        created_at=analysis.created_at.isoformat() if analysis.created_at else None,
        completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
        metrics=analysis.metrics
    )


@router.get("/projects/{project_id}/analysis/{analysis_id}/evidence", response_model=EvidencePacket)
def get_analysis_evidence_packet(
    project_id: str,
    analysis_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the verified structured Evidence Packet produced by the Evidence Agent.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.id == analysis_id,
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found or unauthorized")

    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=400, 
            detail=f"Analysis is still in progress (Current status: {analysis.status}, Progress: {analysis.progress_percent}%)"
        )

    if not analysis.evidence_packet:
        raise HTTPException(status_code=500, detail="Evidence packet unavailable")

    return EvidencePacket(**analysis.evidence_packet)


@router.post("/projects/{project_id}/documents/upload")
async def upload_project_document(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    document_type: Optional[str] = Form("PROJECT_DOC"),
    description: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PRIVATE"),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Uploads a project document, attaches tenant metadata, and queues format-aware parsing.
    """
    allowed_extensions = {".pdf", ".docx", ".pptx", ".xlsx", ".csv", ".txt", ".md", ".json"}
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported format. Allowed: {', '.join(allowed_extensions)}")

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    file_path = os.path.join(UPLOAD_DIR, f"{doc_id}_{file.filename}")

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    db_doc = Document(
        id=doc_id,
        filename=file.filename,
        original_path=file_path,
        organization_id=org_id,
        project_id=project_id,
        visibility=visibility or "PRIVATE",
        global_learning_allowed=False,
        status="PENDING",
        title=title or file.filename,
        document_type=document_type,
        description=description
    )
    db.add(db_doc)
    db.commit()

    background_tasks.add_task(process_document, doc_id, file_path)

    return {
        "document_id": doc_id,
        "filename": file.filename,
        "project_id": project_id,
        "organization_id": org_id,
        "status": "PENDING",
        "visibility": visibility or "PRIVATE"
    }


@router.get("/projects/{project_id}/documents")
def list_project_documents(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Lists all documents for a project with multi-tenant filtering.
    """
    docs = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id
    ).order_by(Document.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "filename": d.filename,
            "title": d.title,
            "document_type": d.document_type,
            "status": d.status,
            "visibility": d.visibility,
            "chunk_count": db.query(Chunk).filter(Chunk.document_id == d.id).count(),
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in docs
    ]
