import os

import pytest
from fastapi import HTTPException

from app.core.storage import persist_upload


class _Upload:
    def __init__(self, filename: str, content: bytes, content_type: str = "application/pdf"):
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self):
        return self._content


@pytest.mark.asyncio
async def test_persist_upload_rejects_empty_file():
    empty = _Upload("empty.pdf", b"")
    with pytest.raises(HTTPException) as exc:
        await persist_upload(empty, "doc_empty", project_id="aurora")
    assert exc.value.status_code == 400
    assert exc.value.detail["error"] == "Uploaded file is empty"


@pytest.mark.asyncio
async def test_persist_upload_rejects_non_pdf_header():
    bogus = _Upload("fake.pdf", b"not-a-pdf")
    with pytest.raises(HTTPException) as exc:
        await persist_upload(bogus, "doc_bad", project_id="aurora")
    assert exc.value.status_code == 400
    assert "valid PDF" in exc.value.detail["error"]


@pytest.mark.asyncio
async def test_persist_upload_local_provider(tmp_path, monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "local")
    monkeypatch.setenv("RAG_STORAGE_DIR", str(tmp_path))
    monkeypatch.delenv("RUSTFS_ENDPOINT", raising=False)
    content = b"%PDF-1.4 test document bytes"
    stored = await persist_upload(_Upload("plan.pdf", content), "doc_ok", project_id="aurora")
    assert stored.exists is True
    assert stored.size == len(content)
    assert stored.provider == "local"
    assert os.path.exists(stored.uri)
    assert os.path.getsize(stored.uri) == len(content)
