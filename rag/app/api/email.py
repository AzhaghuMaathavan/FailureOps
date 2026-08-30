"""Email and SMTP API routes for FailureOps X."""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from app.services.email_service import email_service

router = APIRouter(prefix="/api/email", tags=["Email & Notifications"])


class TestEmailRequest(BaseModel):
    to_email: EmailStr


class AlertEmailRequest(BaseModel):
    to_email: EmailStr
    project_name: str
    risk_score: int
    predicted_failure: str
    emerging_pattern: str
    confidence: int
    playbook_title: str
    dashboard_url: Optional[str] = "https://failureops.shyxon.com/dashboard"


class CustomEmailRequest(BaseModel):
    to_email: EmailStr
    subject: str
    message: str
    project_name: Optional[str] = None


@router.get("/status")
def get_smtp_status() -> Dict[str, Any]:
    """Checks and returns the current SMTP connection status."""
    return email_service.verify_connection()


@router.post("/test")
def send_test_email(req: TestEmailRequest) -> Dict[str, Any]:
    """Dispatches a test verification email via SMTP."""
    try:
        result = email_service.send_test_email(req.to_email)
        return {"status": "SUCCESS", "message": f"Test email successfully dispatched to {req.to_email}", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/send-alert")
def send_alert_email(req: AlertEmailRequest) -> Dict[str, Any]:
    """Dispatches a Sev-1 early-warning radar alert email."""
    try:
        result = email_service.send_critical_failure_alert(
            to_email=req.to_email,
            project_name=req.project_name,
            risk_score=req.risk_score,
            predicted_failure=req.predicted_failure,
            emerging_pattern=req.emerging_pattern,
            confidence=req.confidence,
            playbook_title=req.playbook_title,
            dashboard_url=req.dashboard_url or "https://failureops.shyxon.com/dashboard",
        )
        return {"status": "SUCCESS", "message": f"Alert email dispatched to {req.to_email}", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/share-report")
def share_report_email(req: CustomEmailRequest) -> Dict[str, Any]:
    """Shares an executive intelligence report via email."""
    try:
        html = f"""
        <div style="font-family: sans-serif; background: #070b14; color: #f1f5f9; padding: 24px; border-radius: 12px;">
          <h2 style="color: #ff7a00;">FailureOps X Executive Intelligence Brief</h2>
          <p><strong>Project:</strong> {req.project_name or 'General Enclave'}</p>
          <div style="background: #0f172a; border: 1px solid #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="white-space: pre-wrap; line-height: 1.6;">{req.message}</p>
          </div>
          <p style="font-size: 11px; color: #64748b;">Dispatched via FailureOps X SMTP Gateway</p>
        </div>
        """
        result = email_service.send_email(
            to_email=req.to_email,
            subject=req.subject,
            html_body=html,
            text_body=req.message,
        )
        return {"status": "SUCCESS", "message": f"Report shared with {req.to_email}", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
