import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class IntelligenceSettings(BaseSettings):
    INTELLIGENCE_SERVICE_API_KEY: str = os.getenv("INTELLIGENCE_SERVICE_API_KEY", "failureops-internal-service-key-secret")
    INTELLIGENCE_TIMEOUT_SECONDS: float = float(os.getenv("INTELLIGENCE_TIMEOUT_SECONDS", "60.0"))
    MAX_RETRIEVED_CHUNKS: int = int(os.getenv("MAX_RETRIEVED_CHUNKS", "6"))
    MAX_EVIDENCE_ITEMS: int = int(os.getenv("MAX_EVIDENCE_ITEMS", "50"))
    MAX_SIGNALS: int = int(os.getenv("MAX_SIGNALS", "30"))
    MIN_EVIDENCE_CONFIDENCE: float = float(os.getenv("MIN_EVIDENCE_CONFIDENCE", "0.5"))
    MIN_SIGNAL_CONFIDENCE: float = float(os.getenv("MIN_SIGNAL_CONFIDENCE", "0.5"))
    STRICT_SECURITY_MODE: bool = os.getenv("STRICT_SECURITY_MODE", "true").lower() == "true"
    
    # RAG Search Top K Defaults
    RAG_SEARCH_TOP_K: int = int(os.getenv("RAG_SEARCH_TOP_K", "15"))
    RAG_RERANK_TOP_K: int = int(os.getenv("RAG_RERANK_TOP_K", "6"))

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

intelligence_settings = IntelligenceSettings()
