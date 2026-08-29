"""Single document ingest path used by all upload routes."""
from __future__ import annotations

import logging
import os
import uuid
from typing import Optional

from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.storage import merge_storage_metadata, persist_upload
from app.models.document import Document
from app.services.document_service import process_document

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".xlsx", ".csv", ".txt", ".md", ".json"}


def _truthy(value: Optional[str]) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


async def ingest_upload(
    db: Session,
    file: UploadFile,
    *,
    project_id: str,
    organization_id: str,
    title: Optional[str] = None,
    document_type: Optional[str] = None,
    description: Optional[str] = None,
    visibility: str = "PRIVATE",
    sync: Optional[str] = None,
    background_tasks: Optional[BackgroundTasks] = None,
) -> dict:
    filename = file.filename or "upload.bin"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    logger.info("[UPLOAD] document_id=%s project_id=%s filename=%s", doc_id, project_id, filename)

    stored = await persist_upload(file, doc_id, project_id=project_id)

    db_doc = Document(
        id=doc_id,
        filename=filename,
        original_path=stored.uri,
        organization_id=organization_id,
        project_id=project_id,
        visibility=visibility or "PRIVATE",
        global_learning_allowed=False,
        status="PENDING",
        title=title or filename,
        document_type=document_type,
        description=description,
        extracted_metadata=merge_storage_metadata({}, stored),
    )
    db.add(db_doc)
    db.commit()

    local_hint = stored.uri if stored.provider == "local" else None
    run_sync = _truthy(sync) or background_tasks is None
    if run_sync:
        logger.info("[UPLOAD] document_id=%s processing=sync", doc_id)
        process_document(doc_id, local_hint)
        db.expire_all()
        db_doc = db.query(Document).filter(Document.id == doc_id).first() or db_doc
    else:
        logger.info("[UPLOAD] document_id=%s processing=background", doc_id)
        background_tasks.add_task(process_document, doc_id, local_hint)

    return {
        "document_id": doc_id,
        "filename": filename,
        "project_id": project_id,
        "organization_id": organization_id,
        "status": db_doc.status,
        "error_message": db_doc.error_message,
        "visibility": visibility or "PRIVATE",
        "bytes": stored.size,
        "storage": {
            "provider": stored.provider,
            "bucket": stored.bucket,
            "key": stored.key,
            "exists": stored.exists,
            "size": stored.size,
            "checksum": stored.checksum,
        },
    }
