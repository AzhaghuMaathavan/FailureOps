import unittest
import os
import tempfile
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base, Document
from app.api.documents import download_document

class TestDocumentDownload(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

        # Create temporary files for testing
        self.temp_dir = tempfile.mkdtemp()
        self.pdf_path = os.path.join(self.temp_dir, "fintech.pdf")
        with open(self.pdf_path, "wb") as f:
            f.write(b"%PDF-1.4 sample pdf content with financial assumptions and telemetry")

        self.csv_path = os.path.join(self.temp_dir, "feedback.csv")
        with open(self.csv_path, "wb") as f:
            f.write(b"user_id,nps,feedback\n101,4,good\n102,1,slow")

        # Create Document records
        self.doc_pdf = Document(
            id="doc_fintech_pdf_123",
            filename="fintech.pdf",
            original_path=self.pdf_path,
            organization_id="org_aurora_technologies",
            project_id="fintech-36ab",
            visibility="PRIVATE",
            status="COMPLETED"
        )
        self.doc_csv = Document(
            id="doc_feedback_csv_456",
            filename="feedback.csv",
            original_path=self.csv_path,
            organization_id="org_aurora_technologies",
            project_id="fintech-36ab",
            visibility="ORGANIZATION",
            status="COMPLETED"
        )
        self.db.add(self.doc_pdf)
        self.db.add(self.doc_csv)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_download_pdf_by_document_id(self):
        resp = download_document(
            document_id="doc_fintech_pdf_123",
            project_id="fintech-36ab",
            org_id="org_aurora_technologies",
            db=self.db
        )
        self.assertEqual(resp.media_type, "application/pdf")
        self.assertIn("inline", resp.headers["Content-Disposition"])
        self.assertIn("fintech.pdf", resp.headers["Content-Disposition"])
        self.assertIn(b"%PDF-1.4", resp.body)
        print("[TEST] ✓ PDF download by document_id succeeded:", resp.media_type, resp.headers["Content-Disposition"])

    def test_download_pdf_by_filename(self):
        resp = download_document(
            document_id="fintech.pdf",
            project_id="fintech-36ab",
            org_id="org_aurora_technologies",
            db=self.db
        )
        self.assertEqual(resp.media_type, "application/pdf")
        self.assertIn("fintech.pdf", resp.headers["Content-Disposition"])
        self.assertIn(b"%PDF-1.4", resp.body)
        print("[TEST] ✓ PDF download by filename succeeded:", resp.media_type)

    def test_download_csv_by_document_id(self):
        resp = download_document(
            document_id="doc_feedback_csv_456",
            project_id="fintech-36ab",
            org_id="org_aurora_technologies",
            db=self.db
        )
        self.assertEqual(resp.media_type, "text/csv")
        self.assertIn("inline", resp.headers["Content-Disposition"])
        self.assertIn(b"user_id,nps,feedback", resp.body)
        print("[TEST] ✓ CSV download succeeded:", resp.media_type)

    def test_unauthorized_cross_organization_download_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            download_document(
                document_id="doc_fintech_pdf_123",
                project_id="fintech-36ab",
                org_id="org_different_competitor",
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("Unauthorized", ctx.exception.detail)
        print("[TEST] ✓ Cross-organization download properly rejected with HTTP 403")

    def test_missing_document_returns_404(self):
        with self.assertRaises(HTTPException) as ctx:
            download_document(
                document_id="nonexistent_document_id",
                project_id="fintech-36ab",
                org_id="org_aurora_technologies",
                db=self.db
            )
        self.assertEqual(ctx.exception.status_code, 404)
        print("[TEST] ✓ Missing document returns HTTP 404")

if __name__ == "__main__":
    unittest.main()
