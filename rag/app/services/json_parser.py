import uuid
import json
import logging
from typing import Any
from app.models.document import Page, DocumentBlock

logger = logging.getLogger(__name__)

class RAGFlowJsonParser:
    def __init__(self, max_chunk_size: int = 1500):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = max(max_chunk_size - 200, 50)

    def _json_size(self, data: dict) -> int:
        return len(json.dumps(data, ensure_ascii=False))

    def _is_empty_chunk(self, chunk: Any) -> bool:
        if chunk is None:
            return True
        if isinstance(chunk, (dict, list, str)):
            return not chunk
        return False

    def _set_nested_dict(self, d: dict, path: list, value: Any) -> None:
        for key in path[:-1]:
            d = d.setdefault(key, {})
        d[path[-1]] = value

    def _list_to_dict_preprocessing(self, data: Any) -> Any:
        if isinstance(data, dict):
            return {str(k): self._list_to_dict_preprocessing(v) for k, v in data.items()}
        elif isinstance(data, list):
            return {str(i): self._list_to_dict_preprocessing(item) for i, item in enumerate(data)}
        else:
            return data

    def _json_split(self, data, current_path: list, chunks: list) -> list:
        current_path = current_path or []
        chunks = chunks or [{}]
        if isinstance(data, dict):
            for key, value in data.items():
                new_path = current_path + [key]
                chunk_size = self._json_size(chunks[-1])
                size = self._json_size({key: value})
                remaining = self.max_chunk_size - chunk_size

                if size < remaining:
                    self._set_nested_dict(chunks[-1], new_path, value)
                else:
                    if chunk_size >= self.min_chunk_size:
                        chunks.append({})
                    self._json_split(value, new_path, chunks)
        else:
            if not current_path:
                chunks[-1] = data
            else:
                self._set_nested_dict(chunks[-1], current_path, data)
        return chunks

    def split_json(self, json_data) -> list:
        preprocessed_data = self._list_to_dict_preprocessing(json_data)
        chunks = self._json_split(preprocessed_data, None, None)
        if chunks and self._is_empty_chunk(chunks[-1]):
            chunks.pop()
        return chunks

def parse_json_to_blocks(file_path: str, doc_id: str, db):
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
    except Exception as e:
        logger.error(f"Failed to load JSON {file_path}: {e}")
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

    parser = RAGFlowJsonParser(max_chunk_size=1500)
    chunks = parser.split_json(data)
    
    for i, chunk in enumerate(chunks):
        content = json.dumps(chunk, indent=2, ensure_ascii=False)
        db_block = DocumentBlock(
            id=str(uuid.uuid4()),
            document_id=doc_id,
            page_id=page_id,
            block_index=i,
            block_type="JSON",
            content=content,
            bbox=None,
            raw_metadata={"chunk_index": i}
        )
        db.add(db_block)

    db.commit()
    return True
