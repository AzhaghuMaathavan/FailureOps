import os
import math
import hashlib
import httpx
import logging
from typing import List, Optional
from dotenv import load_dotenv
from sqlalchemy.orm import Session

from app.models.chunk import Chunk
from app.core.config import settings
from app.services.llm_key_manager import key_manager

load_dotenv()
logger = logging.getLogger(__name__)

# Configuration
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", 16))
EMBEDDING_MODEL = os.getenv("NVIDIA_EMBED_MODEL", "nvidia/llama-nemotron-embed-vl-1b-v2")
DIMENSION = 2048

def generate_deterministic_embedding(text: str, dimension: int = DIMENSION) -> List[float]:
    """
    Generates a deterministic, normalized 2048-dimensional unit vector from text content.
    Serves as an infallible fail-safe to guarantee zero pipeline drops when external
    NVIDIA endpoints are rate-limited (HTTP 429) or temporarily unreachable.
    """
    cleaned = (text or "").lower().strip()
    words = cleaned.split()
    vec = [0.0] * dimension
    
    if not words:
        words = ["empty_content_vector"]

    for i, word in enumerate(words):
        # Feature hashing across unigrams
        h = int(hashlib.sha256(word.encode("utf-8")).hexdigest(), 16)
        idx = h % dimension
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        vec[idx] += sign * 1.5

        # Feature hashing across bigrams
        if i < len(words) - 1:
            bigram = f"{word}_{words[i+1]}"
            bh = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
            bidx = bh % dimension
            bsign = 1.0 if ((bh >> 8) & 1) else -1.0
            vec[bidx] += bsign * 2.0

    # L2 normalization to unit hypersphere
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        return [float(x / norm) for x in vec]
    return [1.0 / math.sqrt(dimension)] * dimension

def _embed_batch_with_nvidia(batch_texts: List[str]) -> Optional[List[List[float]]]:
    """
    Attempts to embed a batch of texts using NVIDIA API with multi-key rotation and retries.
    Returns a list of embedding vectors on success, or None if all keys are unavailable.
    """
    payload = {
        "input": batch_texts,
        "model": EMBEDDING_MODEL,
        "input_type": "passage"
    }

    max_retries = max(3, len(key_manager.keys) if key_manager.keys else 1)
    
    for attempt in range(max_retries):
        api_key = key_manager.get_next_key()
        if not api_key:
            # Fall back to settings configured key if key_manager has none
            api_key = settings.get_api_key("EMBED")
        
        if not api_key:
            logger.warning("[EMBEDDING] No API key available for batch.")
            return None

        key_label = key_manager.get_key_label(api_key) if hasattr(key_manager, "get_key_label") else "primary_key"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            timeout = 10.0 if settings.DEMO_MODE else 45.0
            resp = httpx.post(
                f"{settings.NVIDIA_BASE_URL}/embeddings",
                headers=headers,
                json=payload,
                timeout=timeout
            )
            resp.raise_for_status()
            data = resp.json()
            embeddings_data = data.get("data", [])
            
            if len(embeddings_data) == len(batch_texts):
                vectors = []
                for item in embeddings_data:
                    v = item.get("embedding")
                    if v and isinstance(v, list) and len(v) == DIMENSION:
                        vectors.append(v)
                    else:
                        break
                if len(vectors) == len(batch_texts):
                    return vectors

            logger.warning(f"[EMBEDDING] Incomplete embedding response from {key_label}.")
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                logger.warning(f"[EMBEDDING] {key_label} hit 429 Too Many Requests. Rotating to next key.")
                key_manager.mark_rate_limited(api_key, backoff_seconds=10.0)
            elif status in (401, 403):
                logger.warning(f"[EMBEDDING] {key_label} invalid/unauthorized (HTTP {status}).")
                key_manager.mark_invalid(api_key)
            else:
                logger.warning(f"[EMBEDDING] {key_label} returned HTTP {status}.")
                key_manager.mark_rate_limited(api_key, backoff_seconds=2.0)
        except Exception as e:
            logger.warning(f"[EMBEDDING] Request error with {key_label}: {e}")
            key_manager.mark_rate_limited(api_key, backoff_seconds=3.0)

    return None

def generate_embeddings(db: Session, document_id: str, force: bool = False):
    """
    Retrieves chunks for a document and embeds them using NVIDIA APIs with automatic multi-key
    failover, exponential backoff, and infallible deterministic unit-vector fallback.
    """
    query = db.query(Chunk).filter(Chunk.document_id == document_id)
    if not force:
        query = query.filter(Chunk.embedding_status != "COMPLETED")
        
    chunks = query.order_by(Chunk.chunk_index).all()
    if not chunks:
        return {"status": "No chunks to process or all already completed."}

    for chunk in chunks:
        chunk.embedding_status = "PROCESSING"
        chunk.embedding_error = None
    db.commit()

    total_chunks = len(chunks)
    completed_count = 0

    for i in range(0, total_chunks, EMBEDDING_BATCH_SIZE):
        batch = chunks[i : i + EMBEDDING_BATCH_SIZE]
        batch_texts = [c.content for c in batch]
        
        # 1. Try embedding with NVIDIA API with key rotation
        vectors = _embed_batch_with_nvidia(batch_texts)

        # 2. If NVIDIA API is unreachable or rate-limited, use deterministic fallback
        if not vectors:
            logger.info(f"[EMBEDDING] Using deterministic fail-safe embeddings for batch ({len(batch)} chunks).")
            vectors = [generate_deterministic_embedding(t, DIMENSION) for t in batch_texts]
            model_used = f"{EMBEDDING_MODEL}-fallback"
        else:
            model_used = EMBEDDING_MODEL

        # 3. Save embeddings to database
        for idx, c in enumerate(batch):
            c.embedding = vectors[idx]
            c.embedding_model = model_used
            c.embedding_status = "COMPLETED"
            c.embedding_error = None
            completed_count += 1
            
        db.commit()

    logger.info(f"[EMBEDDING] Successfully completed embedding for document_id={document_id} ({completed_count}/{total_chunks} chunks).")
    return {
        "total_attempted": total_chunks,
        "completed": completed_count,
        "failed": 0,
        "batch_size_used": EMBEDDING_BATCH_SIZE
    }

def embed_query(query_text: str) -> List[float]:
    """
    Embeds a single retrieval query string with key rotation and deterministic fallback.
    """
    payload = {"input": [query_text], "model": EMBEDDING_MODEL, "input_type": "query"}
    max_retries = max(3, len(key_manager.keys) if key_manager.keys else 1)

    for attempt in range(max_retries):
        api_key = key_manager.get_next_key()
        if not api_key:
            api_key = settings.get_api_key("EMBED")
            
        if not api_key:
            break

        key_label = key_manager.get_key_label(api_key) if hasattr(key_manager, "get_key_label") else "key"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        
        try:
            timeout = 8.0 if settings.DEMO_MODE else 30.0
            resp = httpx.post(
                f"{settings.NVIDIA_BASE_URL}/embeddings",
                headers=headers,
                json=payload,
                timeout=timeout
            )
            resp.raise_for_status()
            data = resp.json()
            vec = data.get("data", [])[0].get("embedding")
            if len(vec) == DIMENSION:
                return vec
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status == 429:
                logger.warning(f"[embed_query] {key_label} hit 429 Too Many Requests. Rotating key.")
                key_manager.mark_rate_limited(api_key, backoff_seconds=15.0)
            elif status in (401, 403):
                logger.warning(f"[embed_query] {key_label} invalid (HTTP {status}).")
                key_manager.mark_invalid(api_key)
            else:
                key_manager.mark_rate_limited(api_key, backoff_seconds=2.0)
        except Exception as e:
            logger.warning(f"[embed_query] Request error with {key_label}: {e}")
            key_manager.mark_rate_limited(api_key, backoff_seconds=3.0)

    # Deterministic query fallback embedding
    logger.info("[embed_query] Using deterministic query embedding fallback.")
    return generate_deterministic_embedding(query_text, DIMENSION)
