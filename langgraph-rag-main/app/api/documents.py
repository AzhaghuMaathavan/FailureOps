import os
import uuid
import glob
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.document import Document
from app.models.chunk import Chunk
from app.core.storage import persist_upload, document_storage_fields, merge_storage_metadata
from app.core.object_storage import delete_object
from app.services.document_service import process_document
from app.services.embedding_service import generate_embeddings
from app.services.ingest_service import ingest_upload
from app.core.tenant import get_tenant_context

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
def list_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    results = []
    from app.models.document import Page
    for d in docs:
        chunk_count = db.query(Chunk).filter(Chunk.document_id == d.id).count()
        embedded_count = db.query(Chunk).filter(Chunk.document_id == d.id, Chunk.embedding_status == "COMPLETED").count()
        page_count = db.query(Page).filter(Page.document_id == d.id).count()

        file_fields = document_storage_fields(d)

        results.append({
            "id": d.id,
            "filename": d.filename,
            "status": d.status,
            "error_message": d.error_message,
            "created_at": d.created_at.isoformat() if d.created_at else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            "chunk_count": chunk_count,
            "embedded_count": embedded_count,
            "page_count": page_count,
            "title": d.title,
            "document_type": d.document_type,
            "department": d.department,
            "academic_year": d.academic_year,
            "topics": d.topics,
            "version": d.version,
            **file_fields,
        })
    return results

from fastapi import Form
import json

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    project_id: str = Form("aurora"),
    title: str = Form(None),
    document_type: str = Form(None),
    department: str = Form(None),
    academic_year: str = Form(None),
    semester: str = Form(None),
    applicable_audience: str = Form(None),
    description: str = Form(None),
    topics: str = Form(None),
    keywords: str = Form(None),
    example_questions: str = Form(None),
    effective_from: str = Form(None),
    effective_until: str = Form(None),
    version: str = Form(None),
    priority: int = Form(1),
    sync: str = Form("false"),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    result = await ingest_upload(
        db,
        file,
        project_id=project_id,
        organization_id=org_id,
        title=title,
        document_type=document_type,
        description=description,
        sync=sync,
        background_tasks=background_tasks,
    )
    return result

@router.get("/{document_id}")
def get_document_status(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    chunk_count = db.query(Chunk).filter(Chunk.document_id == doc.id).count()
    embedded_count = db.query(Chunk).filter(Chunk.document_id == doc.id, Chunk.embedding_status == "COMPLETED").count()

    return {
        "id": doc.id,
        "filename": doc.filename,
        "status": doc.status,
        "error_message": doc.error_message,
        "chunk_count": chunk_count,
        "embedded_count": embedded_count
    }

@router.get("/{document_id}/download")
def download_document(
    document_id: str,
    project_id: str = None,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(
        (Document.id == document_id) | (Document.filename == document_id)
    )
    if project_id:
        query = query.filter(Document.project_id == project_id)

    doc = query.order_by(Document.created_at.desc()).first()
    if not doc:
        # Fallback without project filter if not found
        doc = db.query(Document).filter(
            (Document.id == document_id) | (Document.filename == document_id)
        ).order_by(Document.created_at.desc()).first()

    if not doc:
        raise HTTPException(status_code=404, detail=f"Document '{document_id}' not found")

    # Multi-tenant privacy verification
    if doc.organization_id and doc.organization_id != org_id and doc.visibility == "PRIVATE":
        raise HTTPException(status_code=403, detail="Unauthorized to access this private document")

    from fastapi.responses import Response
    import urllib.parse
    from app.core.object_storage import download_object_bytes, stored_object_from_document

    content = None
    stored = stored_object_from_document(doc)

    # 1. Try reading directly from original_path if local file
    if doc.original_path and not doc.original_path.startswith("s3://") and os.path.exists(doc.original_path):
        try:
            with open(doc.original_path, "rb") as f:
                content = f.read()
        except Exception:
            pass

    # 2. Try reading from RustFS / Object storage
    if content is None and (stored.exists or (doc.original_path and doc.original_path.startswith("s3://"))):
        try:
            content = download_object_bytes(
                doc.original_path,
                bucket=stored.bucket,
                key=stored.key if stored.provider == "rustfs" else None
            )
        except Exception as exc:
            pass

    # 3. Try reading from relative storage document paths
    if content is None:
        potential_paths = [
            doc.original_path,
            os.path.join("storage", "documents", f"{doc.id}_{doc.filename}"),
            os.path.join("rag", "storage", "documents", f"{doc.id}_{doc.filename}"),
            os.path.join("storage", "documents", doc.filename),
            os.path.join("rag", "storage", "documents", doc.filename),
        ]
        for p in potential_paths:
            if p and os.path.exists(p):
                try:
                    with open(p, "rb") as f:
                        content = f.read()
                    break
                except Exception:
                    pass

    if content is None:
        raise HTTPException(status_code=404, detail="Original document file not found in storage")

    filename = urllib.parse.quote(doc.filename)
    ext = os.path.splitext(doc.filename)[1].lower()

    mime_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".md": "text/markdown",
        ".txt": "text/plain",
        ".json": "application/json"
    }
    media_type = mime_map.get(ext, "application/octet-stream")

    renderable_exts = {".pdf", ".csv", ".md", ".txt", ".json"}
    disp_type = "inline" if ext in renderable_exts else "attachment"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"{disp_type}; filename*=utf-8''{filename}",
            "Cache-Control": "private, no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )

@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete from DB (Cascade takes care of pages, blocks, and chunks)
    db.delete(doc)
    db.commit()

    try:
        delete_object(doc.original_path)
    except Exception:
        pass

    # Try to clean up page images
    page_img_dir = os.path.join(os.getcwd(), "storage", "pages", document_id)
    try:
        import shutil
        if os.path.exists(page_img_dir):
            shutil.rmtree(page_img_dir)
    except Exception:
        pass

    return {"status": "DELETED", "document_id": document_id}

@router.post("/{document_id}/retry")
def retry_document(
    document_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status not in ["FAILED", "ERROR"]:
        raise HTTPException(status_code=400, detail="Only failed documents can be retried")

    # Clean up incomplete relationships
    from app.models.document import Page
    db.query(Page).filter(Page.document_id == doc.id).delete()
    db.query(Chunk).filter(Chunk.document_id == doc.id).delete()

    doc.status = "PENDING"
    doc.error_message = None
    db.commit()

    background_tasks.add_task(process_document, doc.id, doc.original_path)

    return {"status": "PENDING", "document_id": doc.id}

@router.post('/{document_id}/embed')
def embed_document(document_id: str, force: bool = False, db: Session = Depends(get_db)):
    return generate_embeddings(db, document_id, force)
