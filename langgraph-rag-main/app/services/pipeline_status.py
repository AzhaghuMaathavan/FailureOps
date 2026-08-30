"""
Backend-authoritative RAG pipeline snapshot.

Every status and count is derived from documents, storage, chunks, embeddings,
and the latest analysis row. Downstream stages are BLOCKED when an upstream
stage failed or never produced input.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.object_storage import storage_health, stored_object_from_document
from app.models.analysis import ProjectAnalysis
from app.models.chunk import Chunk
from app.models.document import Document, Page
from app.models.evidence import EvidenceItem
from app.models.signal import SignalItem

logger = logging.getLogger(__name__)

StageStatus = str


def _stage(
    key: str,
    label: str,
    status: StageStatus,
    detail: str,
    *,
    count: Optional[int] = None,
    error: Optional[str] = None,
    input_count: Optional[int] = None,
    output_count: Optional[int] = None,
    started_at: Optional[str] = None,
    completed_at: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "status": status,
        "detail": detail,
        "count": count,
        "error": error,
        "input_count": input_count,
        "output_count": output_count if output_count is not None else count,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_ms": None,
    }


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.isoformat()
    return str(value)


def _blocked(status: StageStatus, blocked: bool) -> StageStatus:
    if blocked and status in {"PENDING", "RUNNING"}:
        return "BLOCKED"
    return status


def document_pipeline_dict(db: Session, doc: Document) -> Dict[str, Any]:
    stored = stored_object_from_document(doc)
    page_count = db.query(Page).filter(Page.document_id == doc.id).count()
    chunk_count = db.query(Chunk).filter(Chunk.document_id == doc.id).count()
    embedded_count = db.query(Chunk).filter(
        Chunk.document_id == doc.id,
        Chunk.embedding_status == "COMPLETED",
    ).count()
    failed_embeds = db.query(Chunk).filter(
        Chunk.document_id == doc.id,
        Chunk.embedding_status == "FAILED",
    ).count()

    parser_failed = doc.status == "FAILED"
    ingest_running = doc.status in {"PENDING", "PROCESSING"}

    received = "COMPLETED"
    storage_status = "COMPLETED" if stored.exists and stored.size > 0 else ("FAILED" if parser_failed or stored.size == 0 else "PENDING")
    if not stored.exists:
        storage_status = "FAILED"

    if parser_failed:
        parser_status = "FAILED"
    elif ingest_running:
        parser_status = "RUNNING"
    elif page_count > 0 or chunk_count > 0:
        parser_status = "COMPLETED"
    else:
        parser_status = "PENDING"

    storage_blocked = storage_status == "FAILED"
    parser_blocked = parser_status == "FAILED" or storage_blocked

    if parser_blocked:
        chunk_status = "BLOCKED"
    elif ingest_running and chunk_count == 0:
        chunk_status = "RUNNING"
    elif chunk_count > 0:
        chunk_status = "COMPLETED"
    else:
        chunk_status = "PENDING"

    if parser_blocked or chunk_status == "BLOCKED":
        embed_status = "BLOCKED"
    elif chunk_count > 0 and embedded_count == chunk_count:
        embed_status = "COMPLETED"
    elif failed_embeds > 0 and embedded_count == 0:
        embed_status = "FAILED"
    elif chunk_count > 0:
        embed_status = "RUNNING" if ingest_running or embedded_count > 0 else "PENDING"
    else:
        embed_status = "PENDING"

    vector_status = embed_status

    return {
        "id": doc.id,
        "document_id": doc.id,
        "filename": doc.filename,
        "document_type": doc.document_type,
        "status": doc.status,
        "error_message": doc.error_message,
        "created_at": _iso(doc.created_at),
        "file_size": stored.size,
        "file_exists": stored.exists,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "embedded_count": embedded_count,
        "vector_count": embedded_count,
        "storage": {
            "provider": stored.provider,
            "bucket": stored.bucket,
            "key": stored.key,
            "exists": stored.exists,
            "size": stored.size,
            "checksum": stored.checksum,
            "uri": stored.uri,
        },
        "parser": {
            "status": parser_status,
            "pages": page_count,
            "error": doc.error_message if parser_status == "FAILED" else None,
        },
        "chunking": {"status": chunk_status, "chunks": chunk_count},
        "embedding": {"status": embed_status, "embeddings": embedded_count},
        "vector_storage": {"status": vector_status, "vectors": embedded_count},
    }


def build_project_pipeline(db: Session, organization_id: str, project_id: str) -> Dict[str, Any]:
    docs = (
        db.query(Document)
        .filter(Document.organization_id == organization_id, Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    snapshots = [document_pipeline_dict(db, d) for d in docs]

    stored_ok = [s for s in snapshots if s.get("file_exists") and int(s.get("file_size") or 0) > 0]
    stored_bad = [s for s in snapshots if not s.get("file_exists") or int(s.get("file_size") or 0) <= 0]
    total_bytes = sum(s["file_size"] for s in snapshots)
    chunk_count = sum(s["chunk_count"] for s in snapshots)
    embedded_count = sum(s["embedded_count"] for s in snapshots)
    page_count = sum(s["page_count"] for s in snapshots)
    failed_docs = [s for s in snapshots if s["status"] == "FAILED"]
    processing_docs = [s for s in snapshots if s["status"] in {"PENDING", "PROCESSING"}]
    ready_docs = [s for s in snapshots if s["status"] in {"COMPLETED", "PARTIAL_SUCCESS"}]
    parser_all_failed = bool(failed_docs) and not ready_docs and not processing_docs
    ingest_blocked = parser_all_failed and chunk_count == 0

    latest_analysis = (
        db.query(ProjectAnalysis)
        .filter(
            ProjectAnalysis.organization_id == organization_id,
            ProjectAnalysis.project_id == project_id,
        )
        .order_by(ProjectAnalysis.created_at.desc())
        .first()
    )
    latest_completed = (
        db.query(ProjectAnalysis)
        .filter(
            ProjectAnalysis.organization_id == organization_id,
            ProjectAnalysis.project_id == project_id,
            ProjectAnalysis.status == "COMPLETED",
        )
        .order_by(ProjectAnalysis.created_at.desc())
        .first()
    )
    analysis_for_agents = latest_analysis if (latest_analysis and latest_analysis.status == "COMPLETED") else latest_completed

    agent_row = analysis_for_agents
    analysis_metrics = {}
    if latest_analysis and latest_analysis.metrics:
        analysis_metrics = latest_analysis.metrics
    elif agent_row and agent_row.metrics:
        analysis_metrics = agent_row.metrics
    evidence_status_flag = analysis_metrics.get("evidence_agent_status")
    signal_status_flag = analysis_metrics.get("signal_agent_status")
    retrieval_status_flag = analysis_metrics.get("retrieval_status")
    packet_metrics = {}
    if agent_row and isinstance(agent_row.evidence_packet, dict):
        packet_metrics = agent_row.evidence_packet.get("metrics") or {}
    chunks_searched = int(
        analysis_metrics.get("total_chunks_searched")
        or packet_metrics.get("total_chunks_searched")
        or 0
    )

    evidence_count = 0
    signal_count = 0
    analysis_id = latest_analysis.id if latest_analysis else None
    analysis_complete = bool(latest_analysis and latest_analysis.status == "COMPLETED")
    count_row = agent_row
    if count_row:
        if not analysis_id:
            analysis_id = count_row.id
        evidence_count = db.query(EvidenceItem).filter(EvidenceItem.analysis_id == count_row.id).count()
        signal_count = db.query(SignalItem).filter(SignalItem.analysis_id == count_row.id).count()
        if evidence_count == 0 and count_row.evidence_packet:
            evidence_count = len(count_row.evidence_packet.get("evidence") or [])
        if signal_count == 0 and count_row.signal_packet:
            signal_count = len(count_row.signal_packet.get("signals") or [])

    received_status = "COMPLETED" if snapshots else "PENDING"
    storage_failed = bool(snapshots) and not stored_ok
    storage_status = (
        "FAILED"
        if storage_failed
        else "COMPLETED"
        if stored_ok
        else "RUNNING"
        if processing_docs
        else "PENDING"
    )
    parsed_status = (
        "FAILED"
        if parser_all_failed
        else "RUNNING"
        if processing_docs
        else "COMPLETED"
        if ready_docs
        else "PENDING"
        if not snapshots
        else "RUNNING"
    )

    chunk_status = _blocked(
        "RUNNING" if processing_docs and chunk_count == 0 else "COMPLETED" if chunk_count > 0 else "PENDING",
        ingest_blocked,
    )
    embed_status = _blocked(
        "COMPLETED"
        if chunk_count > 0 and embedded_count == chunk_count
        else "FAILED"
        if chunk_count > 0 and len(ready_docs) > 0 and embedded_count == 0 and not processing_docs
        else "RUNNING"
        if chunk_count > 0 and (processing_docs or embedded_count > 0)
        else "PENDING",
        ingest_blocked,
    )
    vector_status = embed_status

    if ingest_blocked:
        retrieval_status = "BLOCKED"
        evidence_status = "BLOCKED"
        signal_status = "BLOCKED"
    elif retrieval_status_flag:
        retrieval_status = retrieval_status_flag
        evidence_status = evidence_status_flag or ("BLOCKED" if retrieval_status == "BLOCKED" else "PENDING")
        signal_status = signal_status_flag or (
            "BLOCKED" if evidence_status in {"BLOCKED", "FAILED"} else "PENDING"
        )
    elif analysis_complete:
        retrieval_status = "COMPLETED" if chunks_searched > 0 else "BLOCKED"
        evidence_status = evidence_status_flag or (
            "COMPLETED" if evidence_count > 0 else ("BLOCKED" if chunks_searched == 0 else "COMPLETED")
        )
        signal_status = signal_status_flag or (
            "COMPLETED" if signal_count > 0 else ("BLOCKED" if evidence_count == 0 else "COMPLETED")
        )
    elif latest_analysis and latest_analysis.status not in {"COMPLETED", "FAILED"}:
        retrieval_status = "RUNNING"
        if latest_completed:
            evidence_status = "COMPLETED" if evidence_count > 0 else "PENDING"
            signal_status = "COMPLETED" if signal_count > 0 else "PENDING"
        else:
            evidence_status = "PENDING"
            signal_status = "PENDING"
    elif chunk_count > 0:
        retrieval_status = "PENDING"
        evidence_status = "PENDING"
        signal_status = "PENDING"
    else:
        retrieval_status = "PENDING"
        evidence_status = "PENDING"
        signal_status = "PENDING"

    ingest_error = failed_docs[0]["error_message"] if failed_docs else None
    rustfs_error = None
    if stored_bad:
        rustfs_error = f"{len(stored_bad)} of {len(snapshots)} object(s) missing or empty"
    if storage_status == "FAILED":
        rustfs_error = ingest_error or rustfs_error or "Object missing or size is 0"

    if snapshots:
        providers = sorted({(s.get("storage") or {}).get("provider") or "unknown" for s in snapshots})
        provider = providers[0] if len(providers) == 1 else ",".join(providers)
        storage_detail = f"{provider} · {len(stored_ok)}/{len(snapshots)} object(s) · {total_bytes} bytes"
    else:
        storage_detail = "No object stored"

    evidence_error = None
    signal_error = None
    retrieval_error = None
    if retrieval_status == "BLOCKED":
        retrieval_error = analysis_metrics.get("retrieval_reason") or "No retrieved chunks"
    if evidence_status == "BLOCKED":
        evidence_error = analysis_metrics.get("evidence_agent_reason") or "BLOCKED — no retrieved evidence"
    if signal_status == "BLOCKED":
        signal_error = analysis_metrics.get("signal_agent_reason") or "BLOCKED — no grounded evidence"

    stages: List[Dict[str, Any]] = [
        _stage(
            "received",
            "Document received",
            received_status,
            f"{len(snapshots)} document(s) · {total_bytes} bytes",
            count=total_bytes,
            input_count=len(snapshots),
            output_count=len(snapshots),
        ),
        _stage(
            "rustfs",
            "Stored in RustFS" if (stored_ok and all((s.get("storage") or {}).get("provider") == "rustfs" for s in stored_ok)) else "Object storage",
            storage_status,
            storage_detail,
            count=total_bytes,
            error=rustfs_error,
            input_count=len(snapshots),
            output_count=len(stored_ok),
        ),
        _stage(
            "parser",
            "Parser",
            parsed_status,
            parsed_status == "FAILED" and ingest_error or f"{page_count} pages",
            count=page_count,
            error=ingest_error if parsed_status == "FAILED" else None,
            input_count=len(snapshots),
            output_count=page_count,
        ),
        _stage(
            "chunking",
            "Chunking",
            chunk_status,
            "BLOCKED until parser succeeds" if chunk_status == "BLOCKED" else f"{chunk_count} chunks",
            count=chunk_count,
            input_count=page_count,
            output_count=chunk_count,
        ),
        _stage(
            "embedding",
            "Embedding",
            embed_status,
            "BLOCKED until parser succeeds"
            if embed_status == "BLOCKED"
            else f"{embedded_count}/{chunk_count} embeddings",
            count=embedded_count,
            error="Embeddings did not complete. Check NVIDIA embed keys and RAG logs."
            if embed_status == "FAILED"
            else None,
            input_count=chunk_count,
            output_count=embedded_count,
        ),
        _stage(
            "vector",
            "Vector storage",
            vector_status,
            "BLOCKED until parser succeeds" if vector_status == "BLOCKED" else f"{embedded_count} vectors",
            count=embedded_count,
            input_count=embedded_count,
            output_count=embedded_count,
        ),
        _stage(
            "retrieval",
            "Retrieval",
            retrieval_status,
            retrieval_error
            if retrieval_status == "BLOCKED"
            else (
                f"{chunks_searched} chunks retrieved"
                if chunks_searched > 0
                else ("Run project analysis to retrieve evidence" if not analysis_complete else "No retrieved chunks")
            ),
            count=chunks_searched,
            error=retrieval_error,
            input_count=embedded_count,
            output_count=chunks_searched,
        ),
        _stage(
            "evidence",
            "Evidence Agent",
            evidence_status,
            evidence_error
            if evidence_status == "BLOCKED"
            else (
                f"{evidence_count} evidence items"
                + (" (last completed analysis)" if evidence_count > 0 and not analysis_complete else "")
                if evidence_count > 0 or analysis_complete
                else "Waiting for analysis"
            ),
            count=evidence_count,
            error=evidence_error,
            input_count=chunks_searched,
            output_count=evidence_count,
        ),
        _stage(
            "signals",
            "Signal Agent",
            signal_status,
            signal_error
            if signal_status == "BLOCKED"
            else (
                f"{signal_count} signals"
                + (" (last completed analysis)" if signal_count > 0 and not analysis_complete else "")
                if signal_count > 0 or analysis_complete
                else "Waiting for analysis"
            ),
            count=signal_count,
            error=signal_error,
            input_count=evidence_count,
            output_count=signal_count,
        ),
    ]

    rustfs = storage_health()
    logger.info(
        "[PIPELINE] project_id=%s documents=%s bytes=%s pages=%s chunks=%s embeddings=%s vectors=%s retrieved=%s evidence=%s signals=%s",
        project_id,
        len(snapshots),
        total_bytes,
        page_count,
        chunk_count,
        embedded_count,
        embedded_count,
        chunks_searched,
        evidence_count,
        signal_count,
    )

    return {
        "project_id": project_id,
        "organization_id": organization_id,
        "documents": snapshots,
        "totals": {
            "documents": len(snapshots),
            "bytes": total_bytes,
            "pages": page_count,
            "chunks": chunk_count,
            "embedded": embedded_count,
            "vectors": embedded_count,
            "retrieved": chunks_searched,
            "evidence": evidence_count,
            "signals": signal_count,
            "chunksSearched": chunks_searched,
        },
        "analysis_id": analysis_id,
        "completed_analysis_id": count_row.id if count_row else None,
        "analysis_status": latest_analysis.status if latest_analysis else None,
        "metrics": analysis_metrics,
        "storage_health": rustfs,
        "stages": stages,
    }
