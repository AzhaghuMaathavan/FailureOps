import os
from dotenv import load_dotenv
load_dotenv()
import httpx
import logging
from typing import List
from sqlalchemy.orm import Session
from app.models.chunk import Chunk
from app.core.config import settings

logger = logging.getLogger(__name__)

# Configuration
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", 16))
EMBEDDING_MODEL = os.getenv("NVIDIA_EMBED_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2")
DIMENSION = 2048

def get_api_key():
    return settings.get_api_key("EMBED")

def generate_embeddings(db: Session, document_id: str, force: bool = False):
    """
    Retrieves chunks for a document and embeds them using NVIDIA APIs.
    Batch size is configurable.
    """
    api_key = get_api_key()
    if not api_key:
        raise ValueError("No NVIDIA API key configured for embeddings.")

    # Query chunks
    query = db.query(Chunk).filter(Chunk.document_id == document_id)
    if not force:
        # Idempotency: skip COMPLETED
        query = query.filter(Chunk.embedding_status != "COMPLETED")
        
    chunks = query.order_by(Chunk.chunk_index).all()
    if not chunks:
        return {"status": "No chunks to process or all already completed."}

    # Mark as PROCESSING
    for chunk in chunks:
        chunk.embedding_status = "PROCESSING"
        chunk.embedding_error = None
    db.commit()

    total_chunks = len(chunks)
    completed_count = 0
    failed_count = 0

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Safe batching
    for i in range(0, total_chunks, EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        batch_texts = [c.content for c in batch]
        
        payload = {
            "input": batch_texts,
            "model": EMBEDDING_MODEL,
            "input_type": "passage" # Standard for documents
        }
        
        try:
            resp = httpx.post(
                f"{settings.NVIDIA_BASE_URL}/embeddings",
                headers=headers,
                json=payload,
                timeout=60.0
            )
            resp.raise_for_status()
            data = resp.json()
            
            # Validate response
            embeddings_data = data.get("data", [])
            if len(embeddings_data) != len(batch):
                raise ValueError(f"API returned {len(embeddings_data)} embeddings, expected {len(batch)}.")
                
            for idx, c in enumerate(batch):
                vec = embeddings_data[idx].get("embedding")
                
                # Validation
                if not vec:
                    raise ValueError(f"Missing embedding for chunk {c.id}")
                if not isinstance(vec, list) or not all(isinstance(v, (int, float)) for v in vec):
                    raise ValueError(f"Non-numeric embedding returned for chunk {c.id}")
                if len(vec) != DIMENSION:
                    raise ValueError(f"Dimension mismatch for chunk {c.id}: expected {DIMENSION}, got {len(vec)}")
                    
                # Success
                c.embedding = vec
                c.embedding_model = EMBEDDING_MODEL
                c.embedding_status = "COMPLETED"
                c.embedding_error = None
                completed_count += 1
                
        except Exception as e:
            # Fallback safely: mark the batch as FAILED without destroying the chunk
            error_msg = str(e)
            logger.error(f"Embedding batch failed: {error_msg}")
            for c in batch:
                c.embedding_status = "FAILED"
                c.embedding_error = error_msg
                failed_count += 1
                
        # Commit per batch
        db.commit()

    return {
        "total_attempted": total_chunks,
        "completed": completed_count,
        "failed": failed_count,
        "batch_size_used": EMBEDDING_BATCH_SIZE
    }

from app.services.llm_key_manager import key_manager
import logging

logger = logging.getLogger(__name__)

def embed_query(query_text: str) -> List[float]:
    payload = {'input': [query_text], 'model': EMBEDDING_MODEL, 'input_type': 'query'}
    
    max_retries = 3
    for attempt in range(max_retries):
        api_key = key_manager.get_next_key()
        if not api_key:
            raise ValueError('No NVIDIA API key configured for embeddings.')
            
        key_label = key_manager.get_key_label(api_key)
        headers = {'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'}
        
        try:
            timeout = 8.0 if settings.DEMO_MODE else 30.0
            resp = httpx.post(f'{settings.NVIDIA_BASE_URL}/embeddings', headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            vec = data.get('data', [])[0].get('embedding')
            if len(vec) != DIMENSION:
                raise ValueError(f'Dimension mismatch for query: expected {DIMENSION}, got {len(vec)}')
            return vec
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                if settings.DEMO_MODE:
                    logger.warning(f"[DEMO_MODE] {key_label} received 429 -> rotating immediately")
                else:
                    logger.warning(f"[embed_query] {key_label} hit 429 Too Many Requests. Rotating key.")
                key_manager.mark_rate_limited(api_key, backoff_seconds=15.0)
                if attempt == max_retries - 1:
                    raise
            elif status in (401, 403):
                logger.warning(f"[embed_query] {key_label} is invalid/unauthorized (HTTP {status}). Disabling key.")
                key_manager.mark_invalid(api_key)
                if attempt == max_retries - 1:
                    raise
            elif status >= 500:
                if settings.DEMO_MODE:
                    logger.warning(f"[DEMO_MODE] {key_label} received {status} -> rotating immediately")
                else:
                    logger.warning(f"[embed_query] {key_label} hit {status} Server Error. Retrying.")
                key_manager.mark_rate_limited(api_key, backoff_seconds=2.0)
                if attempt == max_retries - 1:
                    raise
            else:
                raise
        except httpx.TimeoutException:
            logger.warning(f"[embed_query] {key_label} hit Timeout. Retrying.")
            key_manager.mark_rate_limited(api_key, backoff_seconds=5.0)
            if attempt == max_retries - 1:
                raise

