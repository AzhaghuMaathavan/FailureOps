"""Email and SMTP API routes for FailureOps X."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from app.services.email_service import email_service

router = APIRouter(prefix="/api/email", tags=["Email & Notifications"])


class TestEmailRequest(BaseModel):
    to_email: str = Field(..., description="Target recipient email address")


class AlertEmailRequest(BaseModel):
    to_email: str
    project_name: str
    risk_score: int
    predicted_failure: str
    emerging_pattern: str
    confidence: int
    playbook_title: str
    dashboard_url: Optional[str] = "https://failureops.shyxon.com/dashboard"


import re

class CustomEmailRequest(BaseModel):
    to_email: str
    subject: str
    message: str
    project_name: Optional[str] = None
    html_body: Optional[str] = None
    verification_code: Optional[str] = None
    recipient_name: Optional[str] = None
    action_url: Optional[str] = None
    email_type: Optional[str] = None  # "VERIFICATION" | "PASSWORD_RESET" | "REPORT"


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
    """Shares an executive intelligence report or verification code via email."""
    try:
        # Determine code if present in request or text
        code = req.verification_code
        if not code:
            code_match = re.search(r'\b(\d{6})\b', req.message + " " + req.subject)
            if code_match:
                code = code_match.group(1)

        # Select or build high-precision HTML template
        if req.html_body:
            html = req.html_body
        elif req.email_type == "PASSWORD_RESET" or "Password Reset" in req.subject or "recovery" in req.subject.lower():
            html = email_service.build_password_reset_email_html(
                code=code or "000000",
                recipient_name=req.recipient_name,
                action_url=req.action_url,
            )
        elif code and (req.email_type == "VERIFICATION" or "Verification" in req.subject or "verification" in req.message.lower()):
            html = email_service.build_verification_email_html(
                code=code,
                recipient_name=req.recipient_name,
                action_url=req.action_url or f"https://failureops.shyxon.com/verify?email={req.to_email}&code={code}",
            )
        else:
            html = email_service.build_executive_report_html(
                project_name=req.project_name or "FailureOps X Enclave",
                message=req.message,
                dashboard_url=req.action_url or "https://failureops.shyxon.com/dashboard",
            )

        result = email_service.send_email(
            to_email=req.to_email,
            subject=req.subject,
            html_body=html,
            text_body=req.message,
        )
        return {"status": "SUCCESS", "message": f"Email successfully dispatched to {req.to_email}", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

