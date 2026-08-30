import uuid
import logging
from sqlalchemy.orm import Session
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk

logger = logging.getLogger(__name__)

SOFT_CHUNK_LIMIT = 1500

def create_chunks_for_document(db: Session, document_id: str):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        return

    doc_name = doc.filename
    org_id = getattr(doc, "organization_id", "org_aurora_technologies")
    proj_id = getattr(doc, "project_id", "aurora")
    vis = getattr(doc, "visibility", "PRIVATE")

    blocks = (
        db.query(DocumentBlock, Page)
        .join(Page, DocumentBlock.page_id == Page.id)
        .filter(DocumentBlock.document_id == document_id)
        .order_by(Page.page_number, DocumentBlock.block_index)
        .all()
    )

    if not blocks:
        return

    current_title = doc_name
    section_path = []

    active_text = []
    active_block_ids = []
    active_page_ids = []
    active_page_numbers = []
    active_block_metadata = []

    chunk_index_counter = 0
    created_chunks = []

    def flush_chunk(is_table_chunk=False):
        nonlocal chunk_index_counter, active_text, active_block_ids, active_page_ids, active_page_numbers, created_chunks, active_block_metadata
        if not active_text:
            return

        prefix = []
        prefix.append(f"Document: {current_title}")
        if section_path:
            prefix.append(f"Section: {' > '.join(section_path)}")

        context_str = "\n".join(prefix)
        body_str = "\n\n".join(active_text)
        final_content = f"{context_str}\n\n{body_str}" if context_str else body_str

        unique_page_ids = list(dict.fromkeys(active_page_ids))
        unique_page_nums = list(dict.fromkeys(active_page_numbers))

        # Merge all block metadata
        merged_meta = {}
        for m in active_block_metadata:
            if m:
                for k, v in m.items():
                    if k not in merged_meta:
                        merged_meta[k] = []
                    if v not in merged_meta[k]:
                        merged_meta[k].append(v)

        chunk = Chunk(
            id=str(uuid.uuid4()),
            document_id=document_id,
            organization_id=org_id,
            project_id=proj_id,
            visibility=vis,
            chunk_index=chunk_index_counter,
            content=final_content.strip(),
            lineage={
                "document_name": doc_name,
                "page_ids": unique_page_ids,
                "page_numbers": unique_page_nums,
                "block_ids": active_block_ids,
                "source_metadata": merged_meta
            },
            headers={
                "title": current_title,
                "section_path": list(section_path)
            },
            is_table=is_table_chunk
        )
        db.add(chunk)
        created_chunks.append(chunk)
        chunk_index_counter += 1

        active_text = []
        active_block_ids = []
        active_page_ids = []
        active_page_numbers = []
        active_block_metadata = []

    for block_obj, page_obj in blocks:
        b_type = block_obj.block_type
        content = block_obj.content or ""

        if not content.strip():
            continue

        if b_type in ["Title", "Page-header"]:
            if len(content) < 150:
                current_title = content.strip()

        elif b_type == "Section-header":
            flush_chunk()
            section_path = [content.strip()]

        elif b_type == "Table":
            flush_chunk()
            combined_content = f"Table Data:\n\n{content.strip()}"
            active_text.append(combined_content)
            active_block_ids.append(block_obj.id)
            active_page_ids.append(page_obj.id)
            active_page_numbers.append(page_obj.page_number if page_obj.page_number and page_obj.page_number >= 1 else (page_obj.page_number or 0) + 1)
            active_block_metadata.append(block_obj.raw_metadata)
            flush_chunk(is_table_chunk=True)

        else:
            active_text.append(content)
            active_block_ids.append(block_obj.id)
            active_page_ids.append(page_obj.id)
            active_page_numbers.append(page_obj.page_number if page_obj.page_number and page_obj.page_number >= 1 else (page_obj.page_number or 0) + 1)
            active_block_metadata.append(block_obj.raw_metadata)

            total_len = sum(len(t) for t in active_text)
            if total_len >= SOFT_CHUNK_LIMIT:
                flush_chunk()

    flush_chunk()

    # Link previous and next chunk IDs
    for i in range(len(created_chunks)):
        if i > 0:
            created_chunks[i].previous_chunk_id = created_chunks[i-1].id
        if i < len(created_chunks) - 1:
            created_chunks[i].next_chunk_id = created_chunks[i+1].id

    db.commit()
