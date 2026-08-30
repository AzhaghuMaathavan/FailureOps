"""RAG Ingestion Subsystem: Handles document parsing, OCR, and storage staging."""
from app.services.ingest_service import ingest_upload
from app.services.document_service import process_document
from app.services.docling_service import extract_with_docling
from app.services.pdf_renderer import render_pdf_pages

__all__ = ["ingest_upload", "process_document", "extract_with_docling", "render_pdf_pages"]
