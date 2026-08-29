"""Foundation E2E: health, pgvector, ingest, retrieval, RAG, frontend BFF."""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from generate_aurora_docs import FACTS, write_pdf  # noqa: E402

BACKEND = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
FRONTEND = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
PROJECT_ID = os.environ.get("FOUNDATION_PROJECT_ID", "aurora")
DATA_DIR = ROOT / "tests" / "data" / "aurora"
HEADERS = {
    "x-organization-id": "org_aurora_technologies",
    "x-user-id": "foundation-tests",
}


def _ensure_pdfs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name, fact in FACTS.items():
        path = DATA_DIR / name
        if not path.exists() or path.stat().st_size < 64:
            write_pdf(path, fact)


@pytest.fixture(scope="session")
def backend_client():
    with httpx.Client(base_url=BACKEND, timeout=180.0, headers=HEADERS) as client:
        yield client


def test_01_backend_health(backend_client: httpx.Client):
    response = backend_client.get("/health")
    assert response.status_code == 200
    assert response.json().get("status") == "ok"


def test_02_database_connection(backend_client: httpx.Client):
    response = backend_client.get("/health/db")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body.get("status") == "ok"
    assert body.get("database") == "connected"


def test_03_pgvector_insert_and_similarity(backend_client: httpx.Client):
    response = backend_client.get("/health/db")
    body = response.json()
    assert body.get("pgvector") is True
    detailed = backend_client.get("/api/v1/health")
    assert detailed.status_code == 200
    payload = detailed.json()
    assert payload.get("database") == "connected"

    database_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@127.0.0.1:5432/agentic_rag",
    )
    try:
        import psycopg2
    except ImportError:
        pytest.skip("psycopg2 is not installed in the test interpreter")

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            assert cur.fetchone() is not None
            cur.execute("CREATE TEMP TABLE foundation_vec_probe (id int, embedding vector(3))")
            cur.execute("INSERT INTO foundation_vec_probe VALUES (1, '[1,0,0]'), (2, '[0,1,0]')")
            cur.execute(
                "SELECT id FROM foundation_vec_probe ORDER BY embedding <-> '[0.9,0.1,0]'::vector LIMIT 1"
            )
            nearest = cur.fetchone()
            assert nearest[0] == 1
        conn.commit()
    finally:
        conn.close()


def test_04_to_11_upload_extract_chunk_embed_store_query(backend_client: httpx.Client):
    _ensure_pdfs()
    uploaded = []
    for filename in FACTS:
        path = DATA_DIR / filename
        with path.open("rb") as handle:
            response = backend_client.post(
                "/api/documents/upload",
                files={"file": (filename, handle, "application/pdf")},
                data={"project_id": PROJECT_ID, "sync": "true", "title": filename},
            )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body.get("document_id")
        assert body.get("status") == "COMPLETED", body
        uploaded.append(body)

    listed = backend_client.get("/api/documents", params={"project_id": PROJECT_ID})
    assert listed.status_code == 200, listed.text
    docs = listed.json()
    by_name = {item["filename"]: item for item in docs}
    for filename in FACTS:
        item = by_name.get(filename)
        assert item, f"{filename} missing from document list"
        assert item["chunk_count"] >= 1
        assert item["embedded_count"] >= 1
        assert item["status"] == "COMPLETED"

    query = backend_client.post(
        "/api/rag/query",
        json={
            "project_id": PROJECT_ID,
            "query": "What evidence indicates increasing deployment instability?",
        },
    )
    assert query.status_code == 200, query.text
    payload = query.json()
    answer = (payload.get("answer") or "").lower()
    assert "no relevant evidence was found" not in answer
    assert "18%" in answer or "18 percent" in answer or "deployment" in answer
    sources = payload.get("sources") or []
    assert sources, "RAG response must include source references"
    filenames = " ".join(str(source.get("document") or "") for source in sources).lower()
    assert "engineering_report" in filenames
    assert any(source.get("chunk_id") for source in sources)


def test_12_frontend_backend_connection():
    try:
        response = httpx.get(f"{FRONTEND}/api/health", timeout=10.0)
    except httpx.ConnectError:
        pytest.skip("Frontend is not running on :3000")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body.get("success") is True
    data = body.get("data") or {}
    backend = data.get("backend") or {}
    assert backend.get("reachable") is True or data.get("status") in {"ok", "degraded"}
