from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import health, documents, retrieval, chat, conversations, analysis

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

import logging
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info(f"[CONFIG] DEMO_MODE={str(settings.DEMO_MODE).lower()}")
    logger.info(f"[CONFIG] CONTEXT_COMPRESSION_ENABLED={str(settings.CONTEXT_COMPRESSION_ENABLED).lower()}")
    logger.info(f"[CONFIG] Multi-Tenant Default Org={settings.DEFAULT_ORGANIZATION_ID}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=settings.API_V1_STR, tags=['health'])
app.include_router(documents.router, prefix=settings.API_V1_STR + '/documents', tags=['documents'])
app.include_router(retrieval.router, prefix=settings.API_V1_STR + '/retrieval', tags=['retrieval'])
app.include_router(chat.router, prefix=settings.API_V1_STR + '/chat', tags=['chat'])
app.include_router(conversations.router, prefix=settings.API_V1_STR + '/conversations', tags=['conversations'])
app.include_router(analysis.router, prefix=settings.API_V1_STR, tags=['analysis'])

@app.get("/")
def root():
    return {"message": "FailureOps X RAG & Evidence Intelligence API", "status": "ONLINE"}
