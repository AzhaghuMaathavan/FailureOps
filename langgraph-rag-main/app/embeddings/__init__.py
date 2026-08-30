"""RAG Embeddings Subsystem: NVIDIA Nemotron 2048-dim embedding generation."""
from app.services.embedding_service import generate_embeddings, get_api_key, embed_query

__all__ = ["generate_embeddings", "get_api_key", "embed_query"]
