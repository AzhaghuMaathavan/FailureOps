import pytest
from unittest.mock import MagicMock
from fastapi import HTTPException
from app.intelligence.services.security import authenticate_service_request, validate_project_and_documents
from app.intelligence.config import intelligence_settings

def test_service_authentication_valid_header():
    valid_key = intelligence_settings.INTELLIGENCE_SERVICE_API_KEY
    assert authenticate_service_request(x_service_key=valid_key) is True
    assert authenticate_service_request(authorization=f"Bearer {valid_key}") is True

def test_service_authentication_invalid_header():
    with pytest.raises(HTTPException) as exc:
        authenticate_service_request(x_service_key="wrong-key-12345")
    assert exc.value.status_code == 401

def test_service_authentication_missing_header():
    with pytest.raises(HTTPException) as exc:
        authenticate_service_request(x_service_key=None, authorization=None)
    assert exc.value.status_code == 401

def test_tenant_project_isolation_empty_project():
    mock_db = MagicMock()
    with pytest.raises(HTTPException) as exc:
        validate_project_and_documents(
            project_id="",
            company_id="comp_1",
            document_ids=["doc_1"],
            db=mock_db
        )
    assert exc.value.status_code == 400

def test_tenant_project_isolation_unauthorized_document():
    mock_db = MagicMock()
    # Mock DB returning only doc_1, but user requested doc_1 and doc_unauthorized
    mock_db.query.return_value.filter.return_value.all.return_value = [("doc_1",)]

    with pytest.raises(HTTPException) as exc:
        validate_project_and_documents(
            project_id="proj_101",
            company_id="comp_1",
            document_ids=["doc_1", "doc_unauthorized"],
            db=mock_db
        )
    assert exc.value.status_code == 403
    assert "doc_unauthorized" in str(exc.value.detail)
