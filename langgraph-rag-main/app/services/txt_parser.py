import uuid
import logging
import re
from app.models.document import Page, DocumentBlock

logger = logging.getLogger(__name__)

def parse_txt_to_blocks(file_path: str, doc_id: str, db):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            text = f.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, "r", encoding="gbk") as f:
                text = f.read()
        except Exception as e:
            logger.error(f"Failed to load TXT {file_path}: {e}")
            return False
    except Exception as e:
        logger.error(f"Failed to load TXT {file_path}: {e}")
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
    
    # Split by double newlines for paragraphs
    blocks = re.split(r'\n\s*\n', text)
    
    block_index = 0
    line_count = 0
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        block_lines = len(block.split('\n'))
        
        db_block = DocumentBlock(
            id=str(uuid.uuid4()),
            document_id=doc_id,
            page_id=page_id,
            block_index=block_index,
            block_type="Text",
            content=block,
            bbox=None,
            raw_metadata={"lines": f"{line_count + 1}-{line_count + block_lines}"}
        )
        db.add(db_block)
        block_index += 1
        line_count += block_lines

    db.commit()
    return True
