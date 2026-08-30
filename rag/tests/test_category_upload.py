import unittest
import asyncio
import io
import os
from fastapi import UploadFile, BackgroundTasks, HTTPException
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.document import Base, Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.services.ingest_service import ingest_upload
from app.services.csv_parser import parse_csv_to_blocks
from app.core.object_storage import StoredObject

class TestCategoryUpload(unittest.TestCase):
    def setUp(self):
        # Create in-memory SQLite for testing model persistence
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine)
        self.db = self.SessionLocal()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    def _create_mock_upload_file(self, filename: str, content: bytes) -> UploadFile:
        file_obj = io.BytesIO(content)
        return UploadFile(filename=filename, file=file_obj)

    def _create_stored_object(self, filename: str) -> StoredObject:
        return StoredObject(
            provider="local",
            bucket="failureops",
            key=filename,
            size=100,
            checksum="abc123sha",
            exists=True,
            content_type="text/plain",
            uri=f"storage/documents/{filename}"
        )

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_product_plan(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("product_roadmap.md")

        async def run_test():
            file = self._create_mock_upload_file("product_roadmap.md", b"# Product Plan\nQ3 release milestones")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Product Roadmap",
                document_type="PRODUCT_PLAN",
                sync="false",
                background_tasks=bg
            )
            self.assertIsNotNone(res["document_id"])
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertIsNotNone(doc)
            self.assertEqual(doc.document_type, "PRODUCT_PLAN")
            self.assertEqual(doc.project_id, "aurora")
            self.assertEqual(doc.organization_id, "org_test")
            print("[TEST] ✓ PRODUCT_PLAN uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_customer_feedback(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("feedback_survey.csv")

        async def run_test():
            file = self._create_mock_upload_file("feedback_survey.csv", b"user_id,nps,feedback\n101,4,Slow onboarding")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Customer Feedback",
                document_type="CUSTOMER_FEEDBACK",
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertEqual(doc.document_type, "CUSTOMER_FEEDBACK")
            print("[TEST] ✓ CUSTOMER_FEEDBACK uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_product_metrics(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("activation_telemetry.csv")

        async def run_test():
            file = self._create_mock_upload_file("activation_telemetry.csv", b"date,activation_rate\n2026-06-01,0.72")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Product Metrics",
                document_type="PRODUCT_METRICS",
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertEqual(doc.document_type, "PRODUCT_METRICS")
            print("[TEST] ✓ PRODUCT_METRICS uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_engineering_metrics(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("ci_telemetry.csv")

        async def run_test():
            file = self._create_mock_upload_file("ci_telemetry.csv", b"date,ci_failures\n2026-06-01,12")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Engineering Metrics",
                document_type="ENGINEERING_METRICS",
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertEqual(doc.document_type, "ENGINEERING_METRICS")
            print("[TEST] ✓ ENGINEERING_METRICS uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_team_operations(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("ops_telemetry.csv")

        async def run_test():
            file = self._create_mock_upload_file("ops_telemetry.csv", b"date,pr_turnaround_hours\n2026-06-01,48")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Team Operations",
                document_type="TEAM_OPERATIONS",
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertEqual(doc.document_type, "TEAM_OPERATIONS")
            print("[TEST] ✓ TEAM_OPERATIONS uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_upload_incident_reports(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("postmortem_inc_402.md")

        async def run_test():
            file = self._create_mock_upload_file("postmortem_inc_402.md", b"# Incident 402 Postmortem\nDatabase connection pool exhaustion")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Incident 402",
                document_type="INCIDENT_REPORTS",
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertEqual(doc.document_type, "INCIDENT_REPORTS")
            print("[TEST] ✓ INCIDENT_REPORTS uploaded & classified successfully:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_generic_upload_optional_category(self, mock_persist):
        mock_persist.return_value = self._create_stored_object("generic_doc.txt")

        async def run_test():
            file = self._create_mock_upload_file("generic_doc.txt", b"General project notes")
            bg = BackgroundTasks()
            res = await ingest_upload(
                self.db,
                file,
                project_id="aurora",
                organization_id="org_test",
                title="Generic Notes",
                document_type=None,
                sync="false",
                background_tasks=bg
            )
            doc = self.db.query(Document).filter(Document.id == res["document_id"]).first()
            self.assertIsNone(doc.document_type)
            print("[TEST] ✓ Generic upload (optional category) succeeded:", doc.filename, "Type:", doc.document_type)
        asyncio.run(run_test())

    @patch("app.services.ingest_service.persist_upload")
    def test_category_format_mismatch_rejection(self, mock_persist):
        # Attempt to upload .pdf as CUSTOMER_FEEDBACK -> must raise descriptive HTTPException
        async def run_test():
            file = self._create_mock_upload_file("invalid_feedback.pdf", b"%PDF-1.4 dummy")
            bg = BackgroundTasks()
            with self.assertRaises(HTTPException) as ctx:
                await ingest_upload(
                    self.db,
                    file,
                    project_id="aurora",
                    organization_id="org_test",
                    title="Invalid Feedback",
                    document_type="CUSTOMER_FEEDBACK",
                    sync="false",
                    background_tasks=bg
                )
            self.assertEqual(ctx.exception.status_code, 400)
            self.assertIn("customer_feedback requires", ctx.exception.detail)
            print("[TEST] ✓ Category format mismatch properly rejected:", ctx.exception.detail)
        asyncio.run(run_test())

    def test_single_row_csv_parsing(self):
        import tempfile
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tf:
            tf.write("user_id,churn_risk,feedback_summary\n")
            tf_path = tf.name

        try:
            doc_id = "doc_single_row_csv"
            success = parse_csv_to_blocks(tf_path, doc_id, self.db)
            self.assertTrue(success)
            blocks = self.db.query(DocumentBlock).filter(DocumentBlock.document_id == doc_id).all()
            self.assertGreater(len(blocks), 0)
            self.assertIn("Headers:", blocks[0].content)
            print("[TEST] ✓ Single-row CSV parsed into blocks successfully:", blocks[0].content)
        finally:
            if os.path.exists(tf_path):
                os.remove(tf_path)

if __name__ == "__main__":
    unittest.main()
