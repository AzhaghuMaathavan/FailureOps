from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.core.config import settings
from app.api import health, documents, retrieval, chat, conversations, analysis, foundation
from app.db.database import get_db
from app.api.health import probe_database

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)


@app.on_event("startup")
async def startup_event():
    from app.db.init_db import init_db
    init_db()
    logger.info("[CONFIG] DEMO_MODE=%s", str(settings.DEMO_MODE).lower())
    logger.info("[CONFIG] CONTEXT_COMPRESSION_ENABLED=%s", str(settings.CONTEXT_COMPRESSION_ENABLED).lower())
    logger.info("[CONFIG] Multi-Tenant Default Org=%s", settings.DEFAULT_ORGANIZATION_ID)
    logger.info("[CONFIG] FRONTEND_URL=%s", settings.FRONTEND_URL)
    from app.core.object_storage import storage_health

    storage = storage_health()
    logger.info(
        "[CONFIG] storage provider=%s reachable=%s bucket=%s endpoint_configured=%s",
        storage.get("provider"),
        storage.get("reachable"),
        storage.get("bucket"),
        storage.get("endpoint_configured"),
    )

cors_origins = [origin.strip() for origin in (settings.FRONTEND_URL or "").split(",") if origin.strip()]
for origin in ("http://localhost:3000", "http://127.0.0.1:3000"):
    if origin not in cors_origins:
        cors_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import health, documents, retrieval, chat, conversations, analysis, foundation, email

app.include_router(foundation.router, prefix="/api", tags=["foundation"])
app.include_router(email.router, tags=["Email & Notifications"])
app.include_router(health.router, prefix=settings.API_V1_STR, tags=["health"])
app.include_router(documents.router, prefix=settings.API_V1_STR + "/documents", tags=["documents"])
app.include_router(retrieval.router, prefix=settings.API_V1_STR + "/retrieval", tags=["retrieval"])
app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["chat"])
app.include_router(conversations.router, prefix=settings.API_V1_STR + "/conversations", tags=["conversations"])
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=["analysis"])



@app.get("/")
def root():
    return {"message": "FailureOps X RAG & Evidence Intelligence API", "status": "ONLINE"}


@app.get("/health")
def liveness():
    return {"status": "ok"}


@app.get("/health/db")
def readiness(db: Session = Depends(get_db)):
    return probe_database(db)
