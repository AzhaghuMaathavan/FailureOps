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
    
    # Very basic block splitting: double newline
    blocks = re.split(r'\n\s*\n', text)
    
    block_index = 0
    current_section = ""
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        b_type = "Text"
        
        # Check if heading
        if re.match(r'^#+\s+', block):
            b_type = "Section-header"
            current_section = block.lstrip("#").strip()
            
        # Check if table (Markdown table starts with | and contains |---|)
        elif block.startswith("|") and "\n|" in block and "---" in block:
            b_type = "Table"
            
        db_block = DocumentBlock(
            id=str(uuid.uuid4()),
            document_id=doc_id,
            page_id=page_id,
            block_index=block_index,
            block_type=b_type,
            content=block,
            bbox=None,
            raw_metadata={"section": current_section}
        )
        db.add(db_block)
        block_index += 1

    db.commit()
    return True
