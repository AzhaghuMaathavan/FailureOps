"""RAG Embeddings Subsystem: NVIDIA Nemotron 2048-dim embedding generation."""
from app.services.embedding_service import EmbeddingService
from app.services.llm_key_manager import get_active_nvidia_key

__all__ = ["EmbeddingService", "get_active_nvidia_key"]
