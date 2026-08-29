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
    db: Session = Depends(get_db)
):
    allowed_extensions = {".pdf", ".docx", ".pptx", ".xlsx", ".csv", ".txt", ".md"}
    ext = os.path.splitext(file.filename)[1].lower()

    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}")

    doc_id = str(uuid.uuid4())
    stored = await persist_upload(file, doc_id, project_id="aurora")

    def safe_json(val):
        if not val: return []
        try: return json.loads(val)
        except: return []

    db_doc = Document(
        id=doc_id,
        filename=file.filename,
        original_path=stored.uri,
        status="PENDING",
        title=title,
        document_type=document_type,
        department=department,
        academic_year=academic_year,
        semester=semester,
        applicable_audience=applicable_audience,
        description=description,
        topics=safe_json(topics),
        keywords=safe_json(keywords),
        example_questions=safe_json(example_questions),
        effective_from=effective_from,
        effective_until=effective_until,
        version=version,
        priority=priority,
        extracted_metadata=merge_storage_metadata({}, stored),
    )
    db.add(db_doc)
    db.commit()

    local_hint = stored.uri if stored.provider == "local" else None
    background_tasks.add_task(process_document, doc_id, local_hint)

    return {
        "document_id": doc_id,
        "status": "PENDING",
        "bytes": stored.size,
        "storage": {
            "provider": stored.provider,
            "bucket": stored.bucket,
            "key": stored.key,
            "exists": stored.exists,
            "size": stored.size,
        },
    }

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
def download_document(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    from fastapi.responses import Response
    import urllib.parse
    from app.core.object_storage import download_object_bytes, stored_object_from_document

    stored = stored_object_from_document(doc)
    if not stored.exists:
        raise HTTPException(status_code=404, detail="Original document file not found in object storage")

    try:
        content = download_object_bytes(doc.original_path, bucket=stored.bucket, key=stored.key if stored.provider == "rustfs" else None)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Unable to read original document from storage: {exc}") from exc

    filename = urllib.parse.quote(doc.filename)
    ext = os.path.splitext(doc.filename)[1].lower()

    mime_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".csv": "text/csv",
        ".md": "text/markdown",
        ".txt": "text/plain"
    }
    media_type = mime_map.get(ext, "application/octet-stream")

    # Use inline for browser-renderable types, attachment for others
    renderable_exts = {".pdf", ".csv", ".md", ".txt"}
    disp_type = "inline" if ext in renderable_exts else "attachment"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"{disp_type}; filename*=utf-8''{filename}"}
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
