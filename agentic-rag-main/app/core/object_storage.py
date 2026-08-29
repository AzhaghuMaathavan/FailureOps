"""
S3-compatible object storage for original uploaded documents.

RustFS (when RUSTFS_ENDPOINT is set) is the durable source of truth.
Local filesystem is used only when RustFS is not configured, so standalone
RAG still works without Docker object storage.
"""
from __future__ import annotations

import hashlib
import logging
import os
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Iterator, Optional
from urllib.parse import unquote, urlparse

logger = logging.getLogger(__name__)

DEFAULT_BUCKET = "failureops-documents"


@dataclass
class StoredObject:
    provider: str
    bucket: Optional[str]
    key: str
    size: int
    checksum: str
    exists: bool
    content_type: str
    uri: str
    error: Optional[str] = None


def storage_provider() -> str:
    explicit = os.getenv("STORAGE_PROVIDER", "").strip().lower()
    if explicit in {"rustfs", "s3", "local"}:
        if explicit == "s3":
            return "rustfs"
        return explicit
    if os.getenv("RUSTFS_ENDPOINT", "").strip():
        return "rustfs"
    return "local"


def rustfs_endpoint() -> str:
    return os.getenv("RUSTFS_ENDPOINT", "").strip().rstrip("/")


def rustfs_bucket() -> str:
    return os.getenv("RUSTFS_BUCKET", DEFAULT_BUCKET).strip() or DEFAULT_BUCKET


def object_key(project_id: str, document_id: str, filename: str) -> str:
    safe_name = os.path.basename(filename or "upload.bin") or "upload.bin"
    return f"projects/{project_id}/documents/{document_id}/{safe_name}"


def object_uri(bucket: str, key: str, provider: str = "rustfs") -> str:
    if provider == "local":
        return key
    return f"s3://{bucket}/{key}"


def parse_object_uri(uri: str) -> tuple[Optional[str], str]:
    if not uri:
        return None, ""
    if uri.startswith("s3://"):
        parsed = urlparse(uri)
        return parsed.netloc, unquote(parsed.path.lstrip("/"))
    return None, uri


def sha256_hex(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _s3_client():
    try:
        import boto3
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError("boto3 is required for RustFS/S3 object storage") from exc

    endpoint = rustfs_endpoint()
    if not endpoint:
        raise RuntimeError("RUSTFS_ENDPOINT is not configured")

    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=os.getenv("RUSTFS_ACCESS_KEY", ""),
        aws_secret_access_key=os.getenv("RUSTFS_SECRET_KEY", ""),
        region_name=os.getenv("RUSTFS_REGION", "us-east-1"),
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def ensure_bucket(bucket: Optional[str] = None) -> None:
    bucket = bucket or rustfs_bucket()
    client = _s3_client()
    try:
        client.head_bucket(Bucket=bucket)
        return
    except Exception:
        pass
    try:
        client.create_bucket(Bucket=bucket)
        logger.info("[RUSTFS] created bucket=%s", bucket)
    except Exception as exc:
        logger.warning("[RUSTFS] create_bucket bucket=%s error=%s", bucket, exc)


def upload_object(
    *,
    content: bytes,
    project_id: str,
    document_id: str,
    filename: str,
    content_type: str = "application/octet-stream",
    provider: Optional[str] = None,
) -> StoredObject:
    provider = (provider or storage_provider()).strip().lower()
    key = object_key(project_id, document_id, filename)
    checksum = sha256_hex(content)
    size = len(content)

    if provider == "rustfs":
        bucket = rustfs_bucket()
        ensure_bucket(bucket)
        client = _s3_client()
        client.put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            ContentLength=size,
            Metadata={"sha256": checksum, "project_id": project_id, "document_id": document_id},
        )
        head = client.head_object(Bucket=bucket, Key=key)
        stored_size = int(head.get("ContentLength") or 0)
        exists = stored_size > 0
        logger.info(
            "[RUSTFS] bucket=%s key=%s size=%s exists=%s checksum=%s",
            bucket,
            key,
            stored_size,
            exists,
            checksum,
        )
        if not exists or stored_size != size:
            return StoredObject(
                provider="rustfs",
                bucket=bucket,
                key=key,
                size=stored_size,
                checksum=checksum,
                exists=False,
                content_type=content_type,
                uri=object_uri(bucket, key),
                error="Stored size does not match uploaded bytes",
            )
        return StoredObject(
            provider="rustfs",
            bucket=bucket,
            key=key,
            size=stored_size,
            checksum=checksum,
            exists=True,
            content_type=content_type,
            uri=object_uri(bucket, key),
        )

    from app.core.storage import get_upload_dir

    dest = os.path.join(get_upload_dir(), f"{document_id}_{os.path.basename(filename)}")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as handle:
        handle.write(content)
        handle.flush()
        os.fsync(handle.fileno())
    saved = os.path.getsize(dest) if os.path.exists(dest) else 0
    logger.info("[STORAGE] provider=local path=%s exists=%s size=%s", dest, os.path.exists(dest), saved)
    return StoredObject(
        provider="local",
        bucket=None,
        key=dest,
        size=saved,
        checksum=checksum,
        exists=saved > 0 and saved == size,
        content_type=content_type,
        uri=dest,
        error=None if saved == size and saved > 0 else "Failed to persist local file",
    )


def object_exists(uri: str, bucket: Optional[str] = None, key: Optional[str] = None) -> bool:
    provider = storage_provider()
    if uri and not uri.startswith("s3://") and os.path.exists(uri):
        return os.path.getsize(uri) > 0
    if provider != "rustfs":
        return bool(uri and os.path.exists(uri) and os.path.getsize(uri) > 0)
    try:
        parsed_bucket, parsed_key = parse_object_uri(uri)
        bucket = bucket or parsed_bucket or rustfs_bucket()
        key = key or parsed_key
        if not bucket or not key:
            return False
        head = _s3_client().head_object(Bucket=bucket, Key=key)
        return int(head.get("ContentLength") or 0) > 0
    except Exception as exc:
        logger.warning("[RUSTFS] object_exists failed uri=%s error=%s", uri, exc)
        return False


def get_object_size(uri: str, bucket: Optional[str] = None, key: Optional[str] = None) -> int:
    if uri and not uri.startswith("s3://") and os.path.exists(uri):
        try:
            return os.path.getsize(uri)
        except OSError:
            return 0
    if storage_provider() != "rustfs" and not (uri or "").startswith("s3://"):
        return 0
    try:
        parsed_bucket, parsed_key = parse_object_uri(uri)
        bucket = bucket or parsed_bucket or rustfs_bucket()
        key = key or parsed_key
        if not bucket or not key:
            return 0
        head = _s3_client().head_object(Bucket=bucket, Key=key)
        return int(head.get("ContentLength") or 0)
    except Exception:
        return 0


def download_object_bytes(uri: str, bucket: Optional[str] = None, key: Optional[str] = None) -> bytes:
    if uri and not uri.startswith("s3://") and os.path.exists(uri):
        with open(uri, "rb") as handle:
            return handle.read()
    parsed_bucket, parsed_key = parse_object_uri(uri)
    bucket = bucket or parsed_bucket or rustfs_bucket()
    key = key or parsed_key
    response = _s3_client().get_object(Bucket=bucket, Key=key)
    return response["Body"].read()


def delete_object(uri: str, bucket: Optional[str] = None, key: Optional[str] = None) -> None:
    if uri and not uri.startswith("s3://"):
        try:
            if os.path.exists(uri):
                os.remove(uri)
        except OSError:
            pass
        return
    try:
        parsed_bucket, parsed_key = parse_object_uri(uri)
        bucket = bucket or parsed_bucket or rustfs_bucket()
        key = key or parsed_key
        if bucket and key:
            _s3_client().delete_object(Bucket=bucket, Key=key)
    except Exception as exc:
        logger.warning("[RUSTFS] delete_object failed uri=%s error=%s", uri, exc)


@contextmanager
def materialize_document_file(doc, fallback_path: Optional[str] = None) -> Iterator[str]:
    """
    Yield a local filesystem path the parser can open.

    Original bytes are read from RustFS when the document URI is s3://.
    Temporary files are deleted after the parser finishes.
    """
    uri = getattr(doc, "original_path", None) or fallback_path or ""
    meta = (getattr(doc, "extracted_metadata", None) or {}).get("storage") or {}
    bucket = meta.get("bucket")
    key = meta.get("key")

    if uri and not str(uri).startswith("s3://") and os.path.exists(uri) and os.path.getsize(uri) > 0:
        yield uri
        return

    suffix = os.path.splitext(getattr(doc, "filename", "") or "upload.bin")[1] or ".bin"
    fd, tmp_path = tempfile.mkstemp(prefix=f"{getattr(doc, 'id', 'doc')}_", suffix=suffix)
    os.close(fd)
    try:
        content = download_object_bytes(uri, bucket=bucket, key=key)
        with open(tmp_path, "wb") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        logger.info(
            "[STORAGE] materialized document_id=%s tmp=%s size=%s",
            getattr(doc, "id", None),
            tmp_path,
            len(content),
        )
        yield tmp_path
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass


def storage_health() -> dict:
    provider = storage_provider()
    result = {
        "provider": provider,
        "reachable": False,
        "bucket": rustfs_bucket() if provider == "rustfs" else None,
        "endpoint_configured": bool(rustfs_endpoint()),
        "error": None,
    }
    if provider == "local":
        from app.core.storage import get_upload_dir

        path = get_upload_dir()
        result["reachable"] = os.path.isdir(path)
        result["path"] = path
        return result
    try:
        ensure_bucket()
        client = _s3_client()
        client.head_bucket(Bucket=rustfs_bucket())
        result["reachable"] = True
    except Exception as exc:
        result["error"] = str(exc)
        result["reachable"] = False
    return result


def stored_object_from_document(doc) -> StoredObject:
    meta = (getattr(doc, "extracted_metadata", None) or {}).get("storage") or {}
    uri = getattr(doc, "original_path", "") or ""
    bucket = meta.get("bucket")
    key = meta.get("key") or uri
    provider = meta.get("provider") or ("rustfs" if str(uri).startswith("s3://") else "local")
    size = int(meta.get("size") or 0)
    if size <= 0:
        size = get_object_size(uri, bucket=bucket, key=key if provider == "rustfs" else None)
    exists = object_exists(uri, bucket=bucket, key=key if provider == "rustfs" else None)
    return StoredObject(
        provider=provider,
        bucket=bucket,
        key=str(key or ""),
        size=size,
        checksum=str(meta.get("checksum") or ""),
        exists=exists,
        content_type=str(meta.get("content_type") or "application/octet-stream"),
        uri=uri,
        error=None if exists else "Object missing from storage",
    )
