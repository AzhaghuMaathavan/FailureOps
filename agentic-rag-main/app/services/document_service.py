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
        doc.extracted_metadata = parsed
        db.commit()
    except Exception as e:
        logger.warning(f"Document profiling failed for {doc.id}: {e}")

from app.services.docx_parser import parse_docx_to_blocks
from app.services.pptx_parser import parse_pptx_to_blocks
from app.services.xlsx_parser import parse_xlsx_to_blocks
from app.services.csv_parser import parse_csv_to_blocks
from app.services.txt_parser import parse_txt_to_blocks
from app.services.markdown_parser import parse_markdown_to_blocks

def process_document(document_id: str, file_path: str):
    db: Session = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            logger.error(f"Document {document_id} not found in DB")
            return

        doc.status = "PROCESSING"
        db.commit()

        ext = os.path.splitext(file_path)[1].lower()
        all_success = True

        if ext == '.pdf':
            # 1. Render Pages
            output_dir = os.path.join(os.path.dirname(file_path), f"{document_id}_pages")
            try:
                image_paths = render_pdf_pages(file_path, output_dir)
            except Exception as e:
                doc.status = "FAILED"
                doc.error_message = f"Failed to render PDF: {e}"
                db.commit()
                return

            # 2. Process each page independently
            for page_num, img_path in enumerate(image_paths):
                page_id = str(uuid.uuid4())
                db_page = Page(
                    id=page_id,
                    document_id=doc.id,
                    page_number=page_num,
                    image_path=img_path,
                    status="PROCESSING"
                )
                db.add(db_page)
                db.commit()

                try:
                    # Call parser
                    parser_output = parse_page_image(img_path)
                    db_page.raw_parser_response = parser_output["raw_response"]

                    # Normalize
                    normalized_blocks = normalize_parser_blocks(parser_output.get("blocks", []))

                    # Save blocks
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

                    db_page.status = "COMPLETED"
                except Exception as e:
                    db_page.status = "FAILED"
                    db_page.error_message = str(e)
                    all_success = False
                    logger.error(f"Failed to process page {page_num}: {e}")

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

        # 3. Semantic Chunking
        create_chunks_for_document(db, doc.id)

        # 4. Embeddings
        from app.services.embedding_service import generate_embeddings
        generate_embeddings(db, doc.id)

        # 5. Extract Profile
        extract_document_profile(db, doc)

        # Complete document
        doc.status = "COMPLETED" if all_success else "PARTIAL_SUCCESS"
        db.commit()

    except Exception as e:
        logger.error(f"Unexpected error in document pipeline: {e}")
        doc = db.query(Document).filter(Document.id == document_id).first()
        if doc:
            doc.status = "FAILED"
            doc.error_message = f"Unexpected error: {e}"
            db.commit()
    finally:
        db.close()
