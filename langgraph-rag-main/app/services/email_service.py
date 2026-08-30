"""FailureOps X Production SMTP Email Service.

Supports SSL (port 465) and STARTTLS (port 587) with HTML formatted templates
for early-warning alerts, workspace invitations, and executive reports.
"""

import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# Default SMTP configuration matching credentials provided
SMTP_SERVER = getattr(settings, 'SMTP_SERVER', 'smtp.nexudo.email')
SMTP_PORT = int(getattr(settings, 'SMTP_PORT', 465))
SMTP_USER = getattr(settings, 'SMTP_USER', 'contact@shyxon.com')
SMTP_PASSWORD = getattr(settings, 'SMTP_PASSWORD', '123Messi321')
SMTP_FROM_EMAIL = getattr(settings, 'SMTP_FROM_EMAIL', 'contact@shyxon.com')
SMTP_FROM_NAME = getattr(settings, 'SMTP_FROM_NAME', 'FailureOps X Intelligence')


class EmailService:
    """Enterprise SMTP Email Service for FailureOps X."""

    def __init__(
        self,
        server: str = SMTP_SERVER,
        port: int = SMTP_PORT,
        user: str = SMTP_USER,
        password: str = SMTP_PASSWORD,
        from_email: str = SMTP_FROM_EMAIL,
        from_name: str = SMTP_FROM_NAME,
    ):
        self.server = server
        self.port = port
        self.user = user
        self.password = password
        self.from_email = from_email
        self.from_name = from_name

    def _get_connection(self):
        """Creates an authenticated SMTP connection over SSL or STARTTLS."""
        context = ssl.create_default_context()
        if self.port == 465:
            client = smtplib.SMTP_SSL(self.server, self.port, context=context, timeout=15)
        else:
            client = smtplib.SMTP(self.server, self.port, timeout=15)
            client.starttls(context=context)

        if self.user and self.password:
            client.login(self.user, self.password)
        return client

    def verify_connection(self) -> Dict[str, Any]:
        """Verifies connection and authentication to the SMTP server."""
        try:
            with self._get_connection() as client:
                status_code, response = client.noop()
                return {
                    "connected": True,
                    "server": self.server,
                    "port": self.port,
                    "sender": self.from_email,
                    "message": f"SMTP authenticated successfully: {response.decode(errors='ignore') if isinstance(response, bytes) else str(response)}",
                }
        except Exception as e:
            logger.error(f"SMTP connection verification failed: {e}")
            return {
                "connected": False,
                "server": self.server,
                "port": self.port,
                "sender": self.from_email,
                "error": str(e),
            }

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        reply_to: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Sends an HTML/text multipart email to the recipient."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email}>"
            msg["To"] = to_email
            if cc:
                msg["Cc"] = ", ".join(cc)
            if reply_to:
                msg["Reply-To"] = reply_to

            # Attach plain-text fallback
            if text_body:
                msg.attach(MIMEText(text_body, "plain", "utf-8"))
            else:
                msg.attach(MIMEText("Please view this email in an HTML-compatible client.", "plain", "utf-8"))

            # Attach rich HTML
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            recipients = [to_email] + (cc if cc else [])

            with self._get_connection() as client:
                client.sendmail(self.from_email, recipients, msg.as_string())

            logger.info(f"Email sent successfully to {to_email} with subject '{subject}'")
            return {
                "status": "SENT",
                "to": to_email,
                "subject": subject,
                "server": self.server,
            }
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            raise RuntimeError(f"SMTP Send Error: {str(e)}")

    def send_test_email(self, to_email: str) -> Dict[str, Any]:
        """Sends a verification test email with FailureOps X brand styling."""
        subject = "[FailureOps X] SMTP Notification Service Verified"
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
    .header {{ border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }}
    .logo-badge {{ background: #ff7a00; color: #000; font-family: monospace; font-weight: 900; font-size: 14px; padding: 6px 12px; border-radius: 8px; }}
    .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; }}
    .status-box {{ background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; margin: 20px 0; color: #10b981; font-weight: 600; font-size: 14px; }}
    .card {{ background: #141c2c; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0; font-size: 13px; color: #94a3b8; }}
    .footer {{ margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-badge">FX</span>
      <h1 class="title">FAILUREOPS <span style="color:#ff7a00;">X</span></h1>
    </div>

    <div class="status-box">
      ✓ SMTP Email Service Successfully Verified & Connected
    </div>

    <p style="font-size: 14px; color: #cbd5e1; line-height: 1.6;">
      This test message confirms that your FailureOps X intelligence platform is properly configured to dispatch real-time failure alerts, executive briefs, and workspace invitations through <strong>{self.server}</strong>.
    </p>

    <div class="card">
      <p style="margin: 0 0 6px 0; font-weight: bold; color: #f8fafc;">Active SMTP Configuration:</p>
      <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
        <li>Server: <code style="color:#38bdf8;">{self.server}</code></li>
        <li>Port: <code style="color:#38bdf8;">{self.port} (SSL/TLS)</code></li>
        <li>Sender: <code style="color:#38bdf8;">{self.from_email}</code></li>
        <li>Destination: <code style="color:#38bdf8;">{to_email}</code></li>
      </ul>
    </div>

    <div class="footer">
      FailureOps X • Evidence-Grounded Early-Warning Intelligence • Confidential Project Enclave
    </div>
  </div>
</body>
</html>
        """
        return self.send_email(to_email, subject, html_body)

    def send_critical_failure_alert(
        self,
        to_email: str,
        project_name: str,
        risk_score: int,
        predicted_failure: str,
        emerging_pattern: str,
        confidence: int,
        playbook_title: str,
        dashboard_url: str = "https://failureops.shyxon.com/dashboard",
    ) -> Dict[str, Any]:
        """Sends an executive early-warning risk alert email."""
        subject = f"[CRITICAL ALERT] FailureOps X Radar Trigger: {project_name} (Risk {risk_score}/100)"
        html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b14; color: #f1f5f9; margin: 0; padding: 24px; }}
    .container {{ max-width: 600px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }}
    .header {{ border-bottom: 1px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; }}
    .logo-badge {{ background: #ff7a00; color: #000; font-family: monospace; font-weight: 900; font-size: 14px; padding: 6px 12px; border-radius: 8px; }}
    .alert-banner {{ background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 16px; margin: 20px 0; }}
    .risk-tag {{ display: inline-block; background: #ef4444; color: #ffffff; font-weight: 800; font-size: 12px; padding: 4px 8px; border-radius: 6px; }}
    .card {{ background: #141c2c; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 16px 0; }}
    .cta-btn {{ display: inline-block; background: #ff7a00; color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 12px 24px; border-radius: 10px; margin-top: 16px; }}
    .footer {{ margin-top: 32px; border-top: 1px solid #1e293b; padding-top: 16px; font-size: 11px; color: #64748b; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="logo-badge">FX</span>
      <h1 style="display:inline; margin-left: 10px; font-size: 20px; font-weight: 800; color: #ffffff;">FAILUREOPS <span style="color:#ff7a00;">X</span></h1>
    </div>

    <div class="alert-banner">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="risk-tag">SEV-1 RADAR ALERT</span>
        <span style="font-family: monospace; font-size: 13px; color: #f87171; font-weight: bold;">Risk Score: {risk_score}/100</span>
      </div>
      <h2 style="color: #f87171; font-size: 18px; margin: 12px 0 4px 0;">{predicted_failure}</h2>
      <p style="color: #cbd5e1; font-size: 13px; margin: 0;">Project Enclave: <strong>{project_name}</strong> (Confidence: {confidence}%)</p>
    </div>

    <div class="card">
      <p style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0;">Emerging Failure Pattern</p>
      <p style="color: #f1f5f9; font-size: 14px; font-weight: 600; margin: 0 0 12px 0;">{emerging_pattern}</p>
      
      <p style="color: #94a3b8; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0;">Prescribed Intervention Playbook</p>
      <p style="color: #38bdf8; font-size: 13px; font-weight: bold; margin: 0;">{playbook_title}</p>
    </div>

    <center>
      <a href="{dashboard_url}" class="cta-btn">Inspect Evidence & Execute Playbook &rarr;</a>
    </center>

    <div class="footer">
      FailureOps X Continuous Project Intelligence • Automated Early-Warning Dispatch
    </div>
  </div>
</body>
</html>
        """
        return self.send_email(to_email, subject, html_body)


email_service = EmailService()
