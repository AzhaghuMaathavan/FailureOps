import uuid
import logging
from typing import List, Dict, Any
from app.models.document import Document, Page, DocumentBlock
from sqlalchemy.orm import Session
from docling.document_converter import DocumentConverter

logger = logging.getLogger(__name__)

def extract_with_docling(file_path: str, db: Session, doc: Document):
    # Convert using docling
    converter = DocumentConverter()
    result = converter.convert(file_path)
    dl_doc = result.document
    
    # 1. Ensure we have Pages registered in our DB
    # We will map page_no (1-indexed) to a Page DB object.
    page_map = {}
    for i in range(len(dl_doc.pages)):
        page_no = i + 1
        db_page = Page(
            id=str(uuid.uuid4()),
            document_id=doc.id,
            page_number=page_no, # 1-indexed here, though chunking relies on it. 
            image_path="", # no images for docling, we can keep empty
            status="COMPLETED"
        )
        db.add(db_page)
        page_map[page_no] = db_page
    db.commit()

    # 2. Iterate through elements
    for idx, item in enumerate(dl_doc.texts):
        page_no = item.prov[0].page_no if item.prov else 1
        db_page = page_map.get(page_no, list(page_map.values())[0])
        
        # docling item types: TextItem, SectionHeaderItem, etc.
        # But we iterate over texts, tables, pictures?
        # Actually docling iter_texts() just gives text. We want all items in reading order.
        pass
