import logging
import os
from typing import Optional

from fastapi import HTTPException, UploadFile

from app.core.object_storage import (
    StoredObject,
    sha256_hex,
    stored_object_from_document,
    upload_object,
)

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"


def get_backend_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_upload_dir() -> str:
    override = os.getenv("RAG_STORAGE_DIR", "").strip()
    path = override if override else os.path.join(get_backend_root(), "storage", "documents")
    os.makedirs(path, exist_ok=True)
    return path


def get_pages_dir(document_id: str) -> str:
    path = os.path.join(get_backend_root(), "storage", "pages", document_id)
    os.makedirs(path, exist_ok=True)
    return path


def file_size_or_zero(path: Optional[str]) -> int:
    if not path or str(path).startswith("s3://") or not os.path.exists(path):
        return 0
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def merge_storage_metadata(existing: Optional[dict], stored: StoredObject) -> dict:
    meta = dict(existing or {}) if isinstance(existing, dict) else {}
    meta["storage"] = {
        "provider": stored.provider,
        "bucket": stored.bucket,
        "key": stored.key,
        "size": stored.size,
        "checksum": stored.checksum,
        "content_type": stored.content_type,
        "exists": stored.exists,
        "uri": stored.uri,
    }
    return meta


async def persist_upload(
    file: UploadFile,
    doc_id: str,
    project_id: str = "aurora",
) -> StoredObject:
    """
    Read multipart bytes, reject empty payloads, and persist ORIGINAL bytes
    to RustFS (or local fallback). A document is stored only when exists AND size > 0.
    """
    original_name = os.path.basename(file.filename or "upload.bin") or "upload.bin"
    content_type = file.content_type or "application/octet-stream"

    content = await file.read()
    size = len(content)

    logger.info(
        "[UPLOAD] document_id=%s project_id=%s filename=%s content_type=%s bytes=%s",
        doc_id,
        project_id,
        original_name,
        content_type,
        size,
    )

    if size == 0:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Uploaded file is empty",
                "document_id": doc_id,
                "stage": "upload",
                "filename": original_name,
            },
        )

    max_size = int(os.getenv("MAX_FILE_SIZE", "10485760"))
    if size > max_size:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "Uploaded file exceeds MAX_FILE_SIZE",
                "document_id": doc_id,
                "stage": "upload",
                "bytes": size,
            },
        )

    ext = os.path.splitext(original_name)[1].lower()
    if ext == ".pdf" and not content.startswith(PDF_MAGIC):
        raise HTTPException(
            status_code=400,
            detail={
                "error": "File is not a valid PDF (missing %PDF header)",
                "document_id": doc_id,
                "stage": "upload",
                "filename": original_name,
            },
        )

    try:
        stored = upload_object(
            content=content,
            project_id=project_id,
            document_id=doc_id,
            filename=original_name,
            content_type=content_type,
        )
    except Exception as exc:
        from app.core.object_storage import storage_provider
        if storage_provider() == "rustfs":
            logger.error(
                "[STORAGE] RustFS upload failed document_id=%s error=%s; falling back to local filesystem",
                doc_id,
                exc,
            )
            try:
                stored = upload_object(
                    content=content,
                    project_id=project_id,
                    document_id=doc_id,
                    filename=original_name,
                    content_type=content_type,
                    provider="local",
                )
            except Exception as local_exc:
                logger.error("[STORAGE] local fallback failed document_id=%s error=%s", doc_id, local_exc)
                raise HTTPException(
                    status_code=503,
                    detail={
                        "error": "Object storage upload failed",
                        "document_id": doc_id,
                        "stage": "storage",
                        "reason": str(local_exc),
                    },
                ) from local_exc
        else:
            logger.error("[STORAGE] upload failed document_id=%s error=%s", doc_id, exc)
            raise HTTPException(
                status_code=503,
                detail={
                    "error": "Object storage upload failed",
                    "document_id": doc_id,
                    "stage": "storage",
                    "reason": str(exc),
                },
            ) from exc

    logger.info(
        "[STORAGE] provider=%s bucket=%s key=%s exists=%s size=%s checksum=%s",
        stored.provider,
        stored.bucket,
        stored.key,
        stored.exists,
        stored.size,
        stored.checksum,
    )

    if not stored.exists or stored.size <= 0:
        raise HTTPException(
            status_code=500,
            detail={
                "error": stored.error or "Failed to persist uploaded file",
                "document_id": doc_id,
                "stage": "storage",
            },
        )

    if stored.size != size:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Persisted file size does not match uploaded bytes",
                "document_id": doc_id,
                "stage": "storage",
                "bytes": size,
                "saved": stored.size,
            },
        )

    return stored


def document_storage_fields(doc) -> dict:
    stored = stored_object_from_document(doc)
    return {
        "file_size": stored.size,
        "file_exists": stored.exists,
        "storage_provider": stored.provider,
        "storage_bucket": stored.bucket,
        "storage_key": stored.key,
        "storage_checksum": stored.checksum,
        "storage_uri": stored.uri,
        "storage_error": stored.error,
    }
