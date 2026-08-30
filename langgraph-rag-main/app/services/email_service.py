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

    def build_verification_email_html(
        self,
        code: str,
        recipient_name: Optional[str] = None,
        action_url: Optional[str] = None,
        expires_minutes: int = 15
    ) -> str:
        """Generates a high-precision, executive dark-mode HTML email for verification codes."""
        greeting_name = recipient_name.strip() if recipient_name else "Intelligence Lead"
        direct_url = action_url or f"https://failureops.shyxon.com/verify?code={code}"

        return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Security Verification</title>
  <style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    table {{ border-collapse: separate; }}
    a, a:link, a:visited {{ text-decoration: none; color: #ff7a00; }}
    @media only screen and (max-width: 600px) {{
      .wrapper {{ width: 100% !important; padding: 12px !important; }}
      .card-inner {{ padding: 24px 16px !important; }}
      .code-display {{ font-size: 30px !important; letter-spacing: 8px !important; padding: 16px 8px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <!-- Outer Center Wrapper -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (Max 580px) -->
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          
          <!-- Top Gradient Cyber Accent Line -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #ff7a00 0%, #ea580c 45%, #38bdf8 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px; letter-spacing: 1px;">
                          FX
                        </td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">
                          FAILUREOPS <span style="color: #ff7a00;">X</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #10b981; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px;">
                      &#9679; SECURE ENCLAVE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td class="card-inner" style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                Single-Use Verification Code
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">{greeting_name}</strong>, a security authentication request was initiated for your FailureOps X intelligence workspace. Enter the 6-digit access code below to complete verification:
              </p>

              <!-- Central Monospace OTP Box -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center" style="background: #0d1527; border: 1px solid rgba(255, 122, 0, 0.4); border-radius: 12px; padding: 24px 16px; box-shadow: 0 0 30px rgba(255, 122, 0, 0.12) inset;">
                    <div style="font-size: 11px; font-family: 'SF Mono', Consolas, monospace; color: #ff9838; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
                      AUTHENTICATION PIN
                    </div>
                    <div class="code-display" style="font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ff7a00; text-indent: 12px; padding: 8px 0;">
                      {code}
                    </div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">
                      &#128274; Single-use security token &bull; Expires in {expires_minutes} minutes
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Direct Action Button -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="{direct_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 15px rgba(255, 122, 0, 0.35); letter-spacing: 0.3px;">
                      Verify &amp; Access Enclave &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Security Metadata Grid -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c1322; border: 1px solid #19263f; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">SECURITY LEVEL:</span> RESTRICTED
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">ENCRYPTION:</span> TLS 1.3 / AES-256
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">GATEWAY:</span> SMTP SSL-465
                  </td>
                  <td width="50%" style="padding: 6px 12px; font-size: 12px; color: #64748b; font-family: 'SF Mono', Consolas, monospace;">
                    <span style="color: #94a3b8; font-weight: bold;">DOMAIN:</span> failureops.shyxon.com
                  </td>
                </tr>
              </table>

              <!-- Security Advisory Notice -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 12px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #cbd5e1; line-height: 1.5;">
                    <strong style="color: #f59e0b;">Security Notice:</strong> FailureOps automated systems will never request your PIN or credentials. If you did not initiate this request, you can safely disregard this message.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; font-weight: 700; color: #94a3b8;">
                FAILUREOPS X &bull; AUTONOMOUS FAILURE INTELLIGENCE ENCLAVE
              </p>
              <p style="margin: 0; font-size: 11px; color: #475569; line-height: 1.5;">
                Dispatched by FailureOps X SMTP Gateway (contact@shyxon.com)<br />
                &copy; 2026 FailureOps X Technologies. All rights reserved. Confidential &amp; Proprietary.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    def build_password_reset_email_html(
        self,
        code: str,
        recipient_name: Optional[str] = None,
        action_url: Optional[str] = None,
        expires_minutes: int = 15
    ) -> str:
        """Generates a high-precision, executive dark-mode HTML email for password recovery."""
        greeting_name = recipient_name.strip() if recipient_name else "Intelligence Lead"
        direct_url = action_url or f"https://failureops.shyxon.com/forgot-password?code={code}"

        return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Password Recovery</title>
  <style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    @media only screen and (max-width: 600px) {{
      .wrapper {{ width: 100% !important; padding: 12px !important; }}
      .code-display {{ font-size: 30px !important; letter-spacing: 8px !important; padding: 16px 8px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #f59e0b 0%, #ff7a00 50%, #ef4444 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px;">FX</td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FAILUREOPS <span style="color: #ff7a00;">X</span></td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35); color: #f87171; font-family: monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                      &#9888; CREDENTIAL RESET
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Password Recovery Request</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #94a3b8;">
                Hello <strong style="color: #f1f5f9;">{greeting_name}</strong>, a request was submitted to reset your account password. Use the following verification PIN to authorize password reset:
              </p>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0 28px 0;">
                <tr>
                  <td align="center" style="background: #0d1527; border: 1px solid rgba(255, 122, 0, 0.4); border-radius: 12px; padding: 24px 16px;">
                    <div style="font-size: 11px; font-family: monospace; color: #ff9838; letter-spacing: 1.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">RECOVERY PIN</div>
                    <div class="code-display" style="font-family: monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #ff7a00; text-indent: 12px;">{code}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 6px;">Valid for {expires_minutes} minutes</div>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="{direct_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
                      Reset Password Now &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center; font-size: 11px; color: #475569;">
              FailureOps X Security Enclave &bull; Dispatched via contact@shyxon.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    def build_executive_report_html(
        self,
        project_name: str,
        message: str,
        dashboard_url: str = "https://failureops.shyxon.com/dashboard"
    ) -> str:
        """Generates an advanced executive intelligence briefing HTML email."""
        return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Executive Intelligence Brief</title>
  <style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    @media only screen and (max-width: 600px) {{
      .wrapper {{ width: 100% !important; padding: 12px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #ff7a00 0%, #38bdf8 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px;">FX</td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FAILUREOPS <span style="color: #ff7a00;">X</span></td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-family: monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                      INTELLIGENCE BRIEF
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 800; color: #ffffff;">Executive Intelligence Summary</h2>
              <div style="font-size: 13px; color: #38bdf8; font-weight: 700; margin-bottom: 20px; font-family: monospace;">
                PROJECT: {project_name.upper()}
              </div>
              <div style="background-color: #0d1527; border: 1px solid #19263f; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.7; color: #cbd5e1; white-space: pre-wrap;">{message}</p>
              </div>
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="{dashboard_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
                      Open Workspace Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center; font-size: 11px; color: #475569;">
              FailureOps X Continuous Intelligence Engine &bull; Dispatched via contact@shyxon.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    def send_verification_code_email(
        self,
        to_email: str,
        code: str,
        recipient_name: Optional[str] = None,
        action_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Dispatches an executive verification code email."""
        subject = f"Your FailureOps X Verification Code: {code}"
        html_body = self.build_verification_email_html(code, recipient_name, action_url)
        text_body = f"Your FailureOps X 6-digit verification code is: {code}. It expires in 15 minutes."
        return self.send_email(to_email, subject, html_body, text_body)

    def build_critical_failure_alert_html(
        self,
        project_name: str,
        risk_score: int,
        predicted_failure: str,
        emerging_pattern: str,
        confidence: int,
        playbook_title: str,
        dashboard_url: str = "https://failureops.shyxon.com/dashboard",
    ) -> str:
        """Generates an executive Sev-1 early-warning radar alert HTML email."""
        risk_color = "#ef4444" if risk_score >= 70 else "#f59e0b" if risk_score >= 40 else "#10b981"
        severity_label = "CRITICAL RISK" if risk_score >= 70 else "HIGH ELEVATED" if risk_score >= 40 else "MODERATE"

        return f"""<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FailureOps X Critical Radar Alert</title>
  <style type="text/css">
    body {{ margin: 0; padding: 0; background-color: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    @media only screen and (max-width: 600px) {{
      .wrapper {{ width: 100% !important; padding: 12px !important; }}
    }}
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #030712; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #030712; padding: 40px 10px 48px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" class="wrapper" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #090e1a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.9);">
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #ef4444 0%, #ff7a00 50%, #38bdf8 100%); line-height: 4px; font-size: 0px;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 20px 32px; border-bottom: 1px solid #141f36;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="left" style="vertical-align: middle;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="background-color: #ff7a00; color: #030712; font-family: monospace; font-size: 13px; font-weight: 900; padding: 5px 10px; border-radius: 6px;">FX</td>
                        <td style="padding-left: 12px; font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #ffffff;">FAILUREOPS <span style="color: #ff7a00;">X</span></td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; font-family: monospace; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px;">
                      &#9888; SEV-1 RADAR ALERT
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="font-size: 12px; font-family: monospace; color: #94a3b8; margin-bottom: 6px;">PROJECT: <span style="color: #f1f5f9; font-weight: bold;">{project_name.upper()}</span></div>
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 800; color: #ffffff; line-height: 1.3;">
                Forecasted Obstacle: <span style="color: #ff7a00;">{predicted_failure}</span>
              </h2>

              <!-- Risk Badge Bar -->
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d1527; border: 1px solid #19263f; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                <tr>
                  <td width="33%" style="text-align: center; border-right: 1px solid #19263f;">
                    <div style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase;">Failure Risk</div>
                    <div style="font-size: 24px; font-weight: 900; color: {risk_color}; margin-top: 4px;">{risk_score}%</div>
                    <div style="font-size: 10px; color: {risk_color}; font-weight: 700;">{severity_label}</div>
                  </td>
                  <td width="33%" style="text-align: center; border-right: 1px solid #19263f;">
                    <div style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase;">Confidence</div>
                    <div style="font-size: 24px; font-weight: 900; color: #38bdf8; margin-top: 4px;">{confidence}%</div>
                    <div style="font-size: 10px; color: #38bdf8; font-weight: 700;">VERIFIED LINEAGE</div>
                  </td>
                  <td width="34%" style="text-align: center;">
                    <div style="font-size: 10px; font-family: monospace; color: #64748b; text-transform: uppercase;">Time Horizon</div>
                    <div style="font-size: 24px; font-weight: 900; color: #f1f5f9; margin-top: 4px;">2–4 wks</div>
                    <div style="font-size: 10px; color: #94a3b8; font-weight: 700;">NEXT MILESTONE</div>
                  </td>
                </tr>
              </table>

              <div style="background-color: #0c1322; border-left: 3px solid #ff7a00; border-radius: 0 10px 10px 0; padding: 14px 18px; margin-bottom: 20px;">
                <div style="font-size: 11px; font-family: monospace; color: #ff9838; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">EMERGING SIGNAL PATTERN</div>
                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">{emerging_pattern}</div>
              </div>

              <div style="background-color: #0c1322; border-left: 3px solid #10b981; border-radius: 0 10px 10px 0; padding: 14px 18px; margin-bottom: 28px;">
                <div style="font-size: 11px; font-family: monospace; color: #10b981; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">RECOMMENDED INTERVENTION PLAYBOOK</div>
                <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">{playbook_title}</div>
              </div>

              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                <tr>
                  <td align="center">
                    <a href="{dashboard_url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #ff7a00 0%, #ea580c 100%); color: #000000; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 10px; box-shadow: 0 4px 15px rgba(255, 122, 0, 0.35);">
                      Investigate in FailureOps Radar &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #060a13; border-top: 1px solid #141f36; text-align: center; font-size: 11px; color: #475569;">
              FailureOps X Continuous Intelligence Engine &bull; Dispatched via contact@shyxon.com<br />
              Confidential Early Warning Telemetry Enclave
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

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
        """Dispatches an executive Sev-1 early-warning radar alert email."""
        subject = f"[CRITICAL ALERT] FailureOps X Radar: {project_name}"
        html_body = self.build_critical_failure_alert_html(
            project_name=project_name,
            risk_score=risk_score,
            predicted_failure=predicted_failure,
            emerging_pattern=emerging_pattern,
            confidence=confidence,
            playbook_title=playbook_title,
            dashboard_url=dashboard_url,
        )
        text_body = f"[CRITICAL ALERT] FailureOps X Radar Alert for {project_name}\nPredicted Obstacle: {predicted_failure} (Risk: {risk_score}%, Confidence: {confidence}%)\nPattern: {emerging_pattern}\nAction: {playbook_title}\nView details: {dashboard_url}"
        return self.send_email(to_email, subject, html_body, text_body)


email_service = EmailService()


