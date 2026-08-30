import unittest
from unittest.mock import patch, MagicMock
from app.services.email_service import EmailService
from app.api.email import AlertEmailRequest, send_alert_email

class TestEmailService(unittest.TestCase):
    def setUp(self):
        self.service = EmailService()

    def test_build_critical_failure_alert_html(self):
        html = self.service.build_critical_failure_alert_html(
            project_name="Shravyam Music",
            risk_score=63,
            predicted_failure="Missed Public Launch Deadline",
            emerging_pattern="5 operational signals detected with 4 escalating.",
            confidence=85,
            playbook_title="Investigate Missed Public Launch Deadline.",
            dashboard_url="https://failureops.shyxon.com/projects/shravyam-music/overview"
        )
        self.assertIn("SHRAVYAM MUSIC", html)
        self.assertIn("Missed Public Launch Deadline", html)
        self.assertIn("63%", html)
        self.assertIn("85%", html)
        self.assertIn("EMERGING SIGNAL PATTERN", html)
        self.assertIn("RECOMMENDED INTERVENTION PLAYBOOK", html)
        print("[TEST] ✓ build_critical_failure_alert_html generated valid executive alert template")

    @patch.object(EmailService, "send_email")
    def test_send_critical_failure_alert(self, mock_send):
        mock_send.return_value = {"status": "SENT", "to": "contact@shyxon.com", "subject": "[CRITICAL ALERT] FailureOps X Radar: Shravyam Music"}

        result = self.service.send_critical_failure_alert(
            to_email="contact@shyxon.com",
            project_name="Shravyam Music",
            risk_score=63,
            predicted_failure="Missed Public Launch Deadline",
            emerging_pattern="5 operational signals detected with 4 escalating.",
            confidence=85,
            playbook_title="Investigate Missed Public Launch Deadline.",
            dashboard_url="https://failureops.shyxon.com/projects/shravyam-music/overview"
        )
        mock_send.assert_called_once()
        args, kwargs = mock_send.call_args
        to_email, subject, html_body = args[0], args[1], args[2]
        self.assertEqual(to_email, "contact@shyxon.com")
        self.assertIn("Shravyam Music", subject)
        self.assertIn("Missed Public Launch Deadline", html_body)
        print("[TEST] ✓ send_critical_failure_alert called send_email with expected payload")

    @patch("app.api.email.email_service.send_critical_failure_alert")
    def test_send_alert_api_endpoint(self, mock_send_alert):
        mock_send_alert.return_value = {"status": "SENT"}
        req = AlertEmailRequest(
            to_email="contact@shyxon.com",
            project_name="Shravyam Music",
            risk_score=63,
            predicted_failure="Missed Public Launch Deadline",
            emerging_pattern="5 operational signals detected with 4 escalating.",
            confidence=85,
            playbook_title="Investigate Missed Public Launch Deadline.",
            dashboard_url="https://failureops.shyxon.com/projects/shravyam-music/overview"
        )
        res = send_alert_email(req)
        self.assertEqual(res["status"], "SUCCESS")
        self.assertIn("contact@shyxon.com", res["message"])
        print("[TEST] ✓ POST /api/email/send-alert endpoint executed successfully")

if __name__ == "__main__":
    unittest.main()
