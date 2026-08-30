import uuid
import logging
import re
from app.models.document import Page, DocumentBlock

logger = logging.getLogger(__name__)

def parse_markdown_to_blocks(file_path: str, doc_id: str, db):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    except Exception as e:
        logger.error(f"Failed to load Markdown {file_path}: {e}")
        return False

    page_id = str(uuid.uuid4())
    db_page = Page(
        id=page_id,
        document_id=doc_id,
        page_number=1,
        image_path="N/A",
        status="COMPLETED"
    )
    db.add(db_page)
    
    # Split paragraphs by double newlines
    raw_blocks = re.split(r'\n\s*\n', text)
    
    block_index = 0
    current_section = ""
    
    for raw_block in raw_blocks:
        raw_block = raw_block.strip()
        if not raw_block:
            continue

        # If block contains a header line followed by content lines, split them
        lines = [line.strip() for line in raw_block.split('\n') if line.strip()]
        if not lines:
            continue

        # Check if first line is a header
        if re.match(r'^#{1,6}\s+', lines[0]):
            header_text = lines[0].lstrip("#").strip()
            current_section = header_text
            db.add(DocumentBlock(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                page_id=page_id,
                block_index=block_index,
                block_type="Section-header",
                content=lines[0],
                bbox=None,
                raw_metadata={"section": current_section}
            ))
            block_index += 1
            
            # If there were remaining lines in this block, emit them as Text
            body_text = "\n".join(lines[1:]).strip()
            if body_text:
                db.add(DocumentBlock(
                    id=str(uuid.uuid4()),
                    document_id=doc_id,
                    page_id=page_id,
                    block_index=block_index,
                    block_type="Text",
                    content=body_text,
                    bbox=None,
                    raw_metadata={"section": current_section}
                ))
                block_index += 1
        elif raw_block.startswith("|") and "\n|" in raw_block and "---" in raw_block:
            db.add(DocumentBlock(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                page_id=page_id,
                block_index=block_index,
                block_type="Table",
                content=raw_block,
                bbox=None,
                raw_metadata={"section": current_section}
            ))
            block_index += 1
        else:
            db.add(DocumentBlock(
                id=str(uuid.uuid4()),
                document_id=doc_id,
                page_id=page_id,
                block_index=block_index,
                block_type="Text",
                content=raw_block,
                bbox=None,
                raw_metadata={"section": current_section}
            ))
            block_index += 1

    db.commit()
    return True

