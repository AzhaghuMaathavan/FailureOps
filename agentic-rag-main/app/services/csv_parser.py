import uuid
import csv
import logging
from app.models.document import Page, DocumentBlock

logger = logging.getLogger(__name__)

def parse_csv_to_blocks(file_path: str, doc_id: str, db):
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            rows = list(reader)
    except UnicodeDecodeError:
        try:
            with open(file_path, "r", encoding="gbk") as f:
                reader = csv.reader(f)
                rows = list(reader)
        except Exception as e:
            logger.error(f"Failed to load CSV {file_path}: {e}")
            return False
    except Exception as e:
        logger.error(f"Failed to load CSV {file_path}: {e}")
        return False

    if not rows:
        return True

    page_id = str(uuid.uuid4())
    db_page = Page(
        id=page_id,
        document_id=doc_id,
        page_number=1,
        image_path="N/A",
        status="COMPLETED"
    )
    db.add(db_page)

    cleaned_rows = []
    for r in rows:
        row_vals = [str(c).strip().replace("\n", " ") for c in r]
        if any(row_vals):
            cleaned_rows.append(row_vals)

    if not cleaned_rows:
        return True

    headers = cleaned_rows[0]
    
    # 10 rows per chunk to avoid making too many DB records, 
    # but formatted logically row-by-row (Key: Value)
    CHUNK_ROWS = 10 
    block_index = 0
    
    for i in range(1, len(cleaned_rows), CHUNK_ROWS):
        chunk_rows = cleaned_rows[i:i + CHUNK_ROWS]
        
        lines = []
        for r in chunk_rows:
            fields = []
            for col_idx, val in enumerate(r):
                if not val:
                    continue
                header = headers[col_idx] if col_idx < len(headers) else f"Column {col_idx+1}"
                fields.append(f"{header}: {val}")
            
            if fields:
                lines.append(" | ".join(fields))
            
        if not lines:
            continue
            
        content = "\n".join(lines)
        
        db_block = DocumentBlock(
            id=str(uuid.uuid4()),
            document_id=doc_id,
            page_id=page_id,
            block_index=block_index,
            block_type="Table",
            content=content,
            bbox=None,
            raw_metadata={"rows": f"{i + 1}-{i + len(chunk_rows)}"}
        )
        db.add(db_block)
        block_index += 1

    db.commit()
    return True
