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

CATEGORY_ALLOWED_EXTENSIONS = {
    "PRODUCT_PLAN": {".pdf", ".docx", ".md", ".txt"},
    "CUSTOMER_FEEDBACK": {".csv", ".json", ".txt"},
    "PRODUCT_METRICS": {".csv", ".xlsx", ".json"},
    "ENGINEERING_METRICS": {".csv", ".json", ".txt"},
    "TEAM_OPERATIONS": {".csv", ".json", ".txt"},
    "INCIDENT_REPORTS": {".pdf", ".md", ".txt", ".docx"},
}


def infer_category_from_filename(filename: str, ext: str) -> str:
    fn = filename.lower()
    if ext == ".xlsx":
        return "PRODUCT_METRICS"
    if ext in {".pdf", ".docx"} and any(k in fn for k in ["incident", "postmortem", "rca", "outage", "deadlock"]):
        return "INCIDENT_REPORTS"
    if ext in {".pdf", ".docx", ".md", ".txt"} and any(k in fn for k in ["plan", "prd", "roadmap", "spec", "fintech", "design", "doc"]):
        return "PRODUCT_PLAN"
    if any(k in fn for k in ["feedback", "survey", "nps", "interview", "review", "user", "ticket", "customer"]):
        return "CUSTOMER_FEEDBACK"
    if any(k in fn for k in ["ci", "build", "deploy", "pipeline", "test", "eng", "latency"]):
        return "ENGINEERING_METRICS"
    if any(k in fn for k in ["ops", "sprint", "team", "workload", "overtime", "turnaround"]):
        return "TEAM_OPERATIONS"
    if any(k in fn for k in ["metric", "telemetry", "activation", "retention", "churn", "conversion", "kpi"]):
        return "PRODUCT_METRICS"
    if ext in {".csv", ".json"}:
        return "CUSTOMER_FEEDBACK"
    return "PRODUCT_PLAN"


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
            detail=f"Unsupported file format '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Normalize category: use provided category if compatible, otherwise infer accurately from file
    doc_type_key = str(document_type or "").strip().upper()
    if doc_type_key in CATEGORY_ALLOWED_EXTENSIONS and ext in CATEGORY_ALLOWED_EXTENSIONS[doc_type_key]:
        final_doc_type = doc_type_key
    elif doc_type_key and doc_type_key not in CATEGORY_ALLOWED_EXTENSIONS and doc_type_key != "PROJECT_DOC":
        final_doc_type = doc_type_key
    else:
        final_doc_type = infer_category_from_filename(filename, ext)

    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    logger.info("[UPLOAD] document_id=%s project_id=%s filename=%s type=%s", doc_id, project_id, filename, final_doc_type)

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
        document_type=final_doc_type,
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
        "storage_provider": stored.provider,
        "storage_bucket": stored.bucket,
        "storage_key": stored.key,
        "storage_uri": stored.uri,
        "file_exists": stored.exists,
        "file_size": stored.size,
        "storage": {
            "provider": stored.provider,
            "bucket": stored.bucket,
            "key": stored.key,
            "uri": stored.uri,
            "exists": stored.exists,
            "size": stored.size,
            "checksum": stored.checksum,
        },
    }
