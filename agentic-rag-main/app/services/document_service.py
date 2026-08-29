import os
import uuid
import logging
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.document import Document, Page, DocumentBlock
from app.services.pdf_renderer import render_pdf_pages
from app.services.nemotron_client import parse_page_image
from app.services.document_normalizer import normalize_parser_blocks
from app.services.chunking_service import create_chunks_for_document
from app.services.agent_service import call_llm, extract_json
from app.core.object_storage import materialize_document_file
from app.core.storage import get_pages_dir

logger = logging.getLogger(__name__)

def extract_document_profile(db: Session, doc: Document):
    from app.models.chunk import Chunk
    chunks = db.query(Chunk).filter(Chunk.document_id == doc.id).order_by(Chunk.chunk_index).limit(4).all()
    if not chunks: return

    sample_text = "\n\n".join([c.content for c in chunks])

    sys_prompt = (
        "You are an automatic document profiler. Extract key metadata from the start of this college document.\n"
        "Output strictly JSON:\n"
        "{\n"
        '  "inferred_academic_year": "string or null",\n'
        '  "inferred_department": "string or null",\n'
        '  "inferred_document_type": "string or null",\n'
        '  "important_dates": ["string"]\n'
        "}"
    )
    user_prompt = f"Extract metadata from this document snippet:\n\n{sample_text[:4000]}"

    try:
        content = call_llm(sys_prompt, user_prompt, json_mode=True, timeout=20.0)
        parsed = extract_json(content)
        existing = doc.extracted_metadata if isinstance(doc.extracted_metadata, dict) else {}
        storage_block = existing.get("storage")
        merged = {**existing, **(parsed if isinstance(parsed, dict) else {"profile": parsed})}
        if storage_block:
            merged["storage"] = storage_block
        doc.extracted_metadata = merged
        db.commit()
    except Exception as e:
        logger.warning(f"Document profiling failed for {doc.id}: {e}")

from app.services.docx_parser import parse_docx_to_blocks
from app.services.pptx_parser import parse_pptx_to_blocks
from app.services.xlsx_parser import parse_xlsx_to_blocks
from app.services.csv_parser import parse_csv_to_blocks
from app.services.txt_parser import parse_txt_to_blocks
from app.services.markdown_parser import parse_markdown_to_blocks

def process_document(document_id: str, file_path: str = None):
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in DB")
            return

        doc.status = "PROCESSING"
        db.commit()

        with materialize_document_file(doc, fallback_path=file_path) as local_path:
            _run_document_pipeline(db, doc, document_id, local_path)

    except Exception as e:
        logger.error(f"Unexpected error in document pipeline: {e}")
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "FAILED"
            doc.error_message = f"Unexpected error: {e}"
            db.commit()
    finally:
        db.close()


def _run_document_pipeline(db: Session, doc: Document, document_id: str, file_path: str):
        ext = os.path.splitext(doc.filename or file_path)[1].lower()
        on_disk = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        logger.info("[PARSER] document_id=%s path_exists=%s size=%s ext=%s", document_id, os.path.exists(file_path), on_disk, ext)

        if not os.path.exists(file_path) or on_disk <= 0:
            doc.status = "FAILED"
            doc.error_message = "Uploaded file is empty"
            db.commit()
            logger.error("[PARSER] document_id=%s status=failed error=empty_or_missing_file", document_id)
            return

        all_success = True

        if ext == '.pdf':
            # 1. Render Pages — working copies only; original bytes stay in object storage
            output_dir = get_pages_dir(document_id)
            try:
                image_paths = render_pdf_pages(file_path, output_dir)
                logger.info("[PARSER] document_id=%s status=completed pages=%s", document_id, len(image_paths))
            except Exception as e:
                doc.status = "FAILED"
                doc.error_message = f"Failed to render PDF: {e}"
                db.commit()
                return

            import fitz
            fitz_doc = None
            try:
                fitz_doc = fitz.open(file_path)
            except Exception:
                pass

            # 2. Process each page independently
            for page_num, img_path in enumerate(image_paths):
                page_id = str(uuid.uuid4())
                db_page = Page(
                    id=page_id,
                    document_id=doc.id,
                    page_number=page_num + 1,
                    image_path=img_path,
                    status="PROCESSING"
                )
                db.add(db_page)
                db.commit()

                blocks_added = 0

                # Prefer native PDF text so ingest does not depend on the vision parser.
                if fitz_doc:
                    try:
                        fitz_page = fitz_doc.load_page(page_num)
                        pdf_blocks = fitz_page.get_text("blocks")
                        for b_idx, b in enumerate(pdf_blocks):
                            b_text = b[4].strip() if len(b) > 4 else ""
                            if b_text:
                                db_block = DocumentBlock(
                                    id=str(uuid.uuid4()),
                                    document_id=doc.id,
                                    page_id=db_page.id,
                                    block_index=b_idx,
                                    block_type="Text",
                                    content=b_text,
                                    bbox=[b[0], b[1], b[2], b[3]] if len(b) >= 4 else None,
                                    raw_metadata={"lines": f"Block {b_idx}"}
                                )
                                db.add(db_block)
                                blocks_added += 1
                    except Exception as e:
                        logger.error(f"PyMuPDF text extraction failed for page {page_num}: {e}")

                if blocks_added == 0:
                    try:
                        parser_output = parse_page_image(img_path)
                        db_page.raw_parser_response = parser_output.get("raw_response", {})
                        normalized_blocks = normalize_parser_blocks(parser_output.get("blocks", []))
                        for n_block in normalized_blocks:
                            db_block = DocumentBlock(
                                id=str(uuid.uuid4()),
                                document_id=doc.id,
                                page_id=db_page.id,
                                block_index=n_block["block_index"],
                                block_type=n_block["block_type"],
                                content=n_block["content"],
                                bbox=n_block["bbox"],
                                raw_metadata=n_block["raw_metadata"]
                            )
                            db.add(db_block)
                            blocks_added += 1
                    except Exception as e:
                        logger.warning(f"Vision parser notice on page {page_num}: {e}")

                db_page.status = "COMPLETED" if blocks_added > 0 else "PARTIAL_SUCCESS"
                db.commit()

        else:
            # Multi-format parsers
            if ext == '.docx':
                all_success = parse_docx_to_blocks(file_path, doc.id, db)
            elif ext in ['.ppt', '.pptx']:
                all_success = parse_pptx_to_blocks(file_path, doc.id, db)
            elif ext == '.xlsx':
                all_success = parse_xlsx_to_blocks(file_path, doc.id, db)
            elif ext == '.csv':
                all_success = parse_csv_to_blocks(file_path, doc.id, db)
            elif ext == '.txt':
                all_success = parse_txt_to_blocks(file_path, doc.id, db)
            elif ext == '.md':
                all_success = parse_markdown_to_blocks(file_path, doc.id, db)
            elif ext == '.json':
                from app.services.json_parser import parse_json_to_blocks
                all_success = parse_json_to_blocks(file_path, doc.id, db)
            else:
                all_success = False
                doc.error_message = f"Unsupported extension {ext}"

            if not all_success:
                doc.status = "FAILED"
                doc.error_message = doc.error_message or "Parser failed"
                db.commit()
                return

        logger.info("[TEXT EXTRACTION] document_id=%s ext=%s", document_id, ext)

        # 3. Semantic Chunking
        create_chunks_for_document(db, doc.id)
        from app.models.chunk import Chunk
        chunk_count = db.query(Chunk).filter(Chunk.document_id == doc.id).count()
        logger.info("[CHUNK COUNT] document_id=%s chunks=%s", document_id, chunk_count)
        if chunk_count == 0:
            doc.status = "FAILED"
            doc.error_message = "Document extraction produced no chunks"
            db.commit()
            logger.error("[TEXT EXTRACTION] document_id=%s status=failed error=no_chunks", document_id)
            return

        # 4. Embeddings
        from app.services.embedding_service import generate_embeddings
        try:
            generate_embeddings(db, doc.id)
        except Exception as exc:
            doc.status = "FAILED"
            doc.error_message = f"Embedding generation failed: {exc}"
            db.commit()
            logger.error("[EMBEDDING] document_id=%s status=failed error=%s", document_id, exc)
            return

        embedded_count = db.query(Chunk).filter(
            Chunk.document_id == doc.id,
            Chunk.embedding_status == "COMPLETED",
        ).count()
        logger.info("[EMBEDDING] document_id=%s embedded=%s", document_id, embedded_count)
        logger.info("[VECTOR INSERT] document_id=%s vectors=%s", document_id, embedded_count)
        if embedded_count == 0:
            doc.status = "FAILED"
            doc.error_message = "Embedding generation stored zero vectors"
            db.commit()
            logger.error("[VECTOR INSERT] document_id=%s status=failed error=zero_vectors", document_id)
            return

        # 5. Extract Profile
        extract_document_profile(db, doc)

        # Complete document
        doc.status = "COMPLETED" if all_success else "PARTIAL_SUCCESS"
        db.commit()
        logger.info("[SUCCESS] document_id=%s status=%s chunks=%s vectors=%s", document_id, doc.status, chunk_count, embedded_count)
