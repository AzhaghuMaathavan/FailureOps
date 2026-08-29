import logging
import os
from typing import Optional, Tuple

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

PDF_MAGIC = b"%PDF"


def get_backend_root() -> str:
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def get_upload_dir() -> str:
    override = os.getenv("RAG_STORAGE_DIR", "").strip()
    path = override if override else os.path.join(get_backend_root(), "storage", "documents")
    os.makedirs(path, exist_ok=True)
    return path


def file_size_or_zero(path: Optional[str]) -> int:
    if not path or not os.path.exists(path):
        return 0
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


async def persist_upload(file: UploadFile, doc_id: str) -> Tuple[str, int]:
    """
    Read multipart bytes, reject empty payloads, and write them under RAG storage.

    A document is stored only when the destination exists AND size > 0.
    """
    original_name = os.path.basename(file.filename or "upload.bin") or "upload.bin"
    dest = os.path.join(get_upload_dir(), f"{doc_id}_{original_name}")
    content_type = file.content_type or "application/octet-stream"

    content = await file.read()
    size = len(content)

    logger.info(
        "[UPLOAD] document_id=%s filename=%s content_type=%s bytes=%s dest=%s",
        doc_id,
        original_name,
        content_type,
        size,
        dest,
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

    with open(dest, "wb") as handle:
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())

    exists = os.path.exists(dest)
    saved = file_size_or_zero(dest)
    logger.info("[FILE SAVED] document_id=%s path=%s exists=%s size=%s", doc_id, dest, exists, saved)

    if not exists or saved <= 0:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Failed to persist uploaded file",
                "document_id": doc_id,
                "stage": "upload",
            },
        )

    if saved != size:
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Persisted file size does not match uploaded bytes",
                "document_id": doc_id,
                "stage": "upload",
                "bytes": size,
                "saved": saved,
            },
        )

    return dest, saved
