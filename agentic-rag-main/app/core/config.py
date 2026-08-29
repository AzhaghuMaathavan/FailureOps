import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "FailureOps X RAG & Evidence Intelligence"
    API_V1_STR: str = "/api/v1"

    # Default Tenant Context
    DEFAULT_ORGANIZATION_ID: str = os.getenv("DEFAULT_ORGANIZATION_ID", "org_aurora_technologies")
    DEFAULT_PROJECT_ID: str = os.getenv("DEFAULT_PROJECT_ID", "aurora")

    # General Search Settings
    TOP_K: int = int(os.getenv('TOP_K', 15))
    RERANK_TOP_K: int = int(os.getenv('RERANK_TOP_K', 5))
    SIMILARITY_THRESHOLD: float = float(os.getenv('SIMILARITY_THRESHOLD', 0.8))
    
    # Hybrid Search Settings
    HYBRID_SEARCH_ENABLED: bool = os.getenv('HYBRID_SEARCH_ENABLED', 'true').lower() == 'true'
    HYBRID_VECTOR_TOP_K: int = int(os.getenv('HYBRID_VECTOR_TOP_K', 15))
    HYBRID_BM25_TOP_K: int = int(os.getenv('HYBRID_BM25_TOP_K', 15))
    HYBRID_RRF_K: int = int(os.getenv('HYBRID_RRF_K', 60))

    # FailureOps Evidence Intelligence Specific Retrieval Budgets
    EVIDENCE_DENSE_TOP_K: int = int(os.getenv('EVIDENCE_DENSE_TOP_K', 20))
    EVIDENCE_BM25_TOP_K: int = int(os.getenv('EVIDENCE_BM25_TOP_K', 20))
    EVIDENCE_RRF_TOP_K: int = int(os.getenv('EVIDENCE_RRF_TOP_K', 30))
    EVIDENCE_RERANK_TOP_K: int = int(os.getenv('EVIDENCE_RERANK_TOP_K', 10))
    EVIDENCE_FINAL_TOP_K: int = int(os.getenv('EVIDENCE_FINAL_TOP_K', 8))
    EVIDENCE_MIN_CONFIDENCE: float = float(os.getenv('EVIDENCE_MIN_CONFIDENCE', 0.70))

    # Retrieval Acceptance Gating
    RETRIEVAL_MIN_RERANK_SCORE: float = float(os.getenv('RETRIEVAL_MIN_RERANK_SCORE', -2.5))
    RETRIEVAL_MIN_BM25_SCORE: float = float(os.getenv('RETRIEVAL_MIN_BM25_SCORE', 0.05))
    RETRIEVAL_MIN_HYBRID_SCORE: float = float(os.getenv('RETRIEVAL_MIN_HYBRID_SCORE', 0.012))

    # Demo Mode
    DEMO_MODE: bool = os.getenv('DEMO_MODE', 'false').lower() == 'true'

    # Context Compression Settings
    CONTEXT_COMPRESSION_ENABLED: bool = os.getenv('CONTEXT_COMPRESSION_ENABLED', 'true').lower() == 'true'
    CONTEXT_COMPRESSION_MAX_CHARS: int = int(os.getenv('CONTEXT_COMPRESSION_MAX_CHARS', 1200))
    CONTEXT_COMPRESSION_MIN_CHARS: int = int(os.getenv('CONTEXT_COMPRESSION_MIN_CHARS', 500))

    NVIDIA_RERANK_MODEL: str = os.getenv('NVIDIA_RERANK_MODEL', 'nvidia/llama-nemotron-rerank-vl-1b-v2')
    NVIDIA_RERANK_URL: str = os.getenv('NVIDIA_RERANK_URL', 'https://ai.api.nvidia.com/v1/retrieval/nvidia/llama-nemotron-rerank-vl-1b-v2/reranking')
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/college_rag")
    
    # NVIDIA APIs
    NVIDIA_BASE_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NVIDIA_LLM_MODEL: str = os.getenv("NVIDIA_LLM_MODEL", "nvidia/nemotron-3-super-120b-a12b")
    NVIDIA_PARSE_API_KEY: str = os.getenv("NVIDIA_PARSE_API_KEY", "")
    NVIDIA_EMBED_API_KEY: str = os.getenv("NVIDIA_EMBED_API_KEY", "")
    NVIDIA_RERANK_API_KEY: str = os.getenv("NVIDIA_RERANK_API_KEY", "")
    NVIDIA_LLM_API_KEY: str = os.getenv("NVIDIA_LLM_API_KEY", "")
    
    # Fallback to main key if specific ones are not set
    NVIDIA_API_KEY: str = os.getenv("NVIDIA_API_KEY", "")
    
    def get_api_key(self, service: str) -> str:
        key = getattr(self, f"NVIDIA_{service.upper()}_API_KEY", "")
        return key if key else self.NVIDIA_API_KEY

    model_config = SettingsConfigDict(
        env_file=(
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env"),
            ".env"
        ),
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()


