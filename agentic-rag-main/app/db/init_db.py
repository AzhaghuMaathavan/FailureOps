from app.db.database import engine, Base, SessionLocal
from app.models.document import Document, Page, DocumentBlock
from app.models.chunk import Chunk
from app.models.chat import Conversation, Message
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.models.signal import SignalItem
from app.models.project import Project

def init_db():
    print("Creating FailureOps X database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables initialized successfully!")

    # Seed baseline projects if empty
    db = SessionLocal()
    try:
        count = db.query(Project).count()
        if count == 0:
            print("Seeding default project portfolio...")
            baseline_projects = [
                Project(
                    id="aurora",
                    name="ExpenseTracker",
                    code_name="PROJECT AURORA",
                    company="Aurora Technologies",
                    description="Expense management & corporate card intelligence platform for fast-scaling SMBs.",
                    industry="FinTech",
                    stage="Beta",
                    target_users="SMB Finance Managers & Operations Leads",
                    expected_launch_date="2026-10-15",
                    health="AT_RISK",
                    failure_risk=82,
                    risk_trend="+24% over 4 weeks",
                    predicted_next_failure="Missed Beta Release",
                    prediction_confidence=86,
                    historical_similarity=89,
                    privacy_level="PRIVATE",
                    organization_id="org_aurora_technologies",
                    sources_uploaded=["PRODUCT_PLAN", "CUSTOMER_FEEDBACK", "PRODUCT_METRICS", "ENGINEERING_METRICS", "TEAM_OPERATIONS"]
                ),
                Project(
                    id="pulseflow",
                    name="PulseFlow CRM",
                    code_name="PROJECT PULSE",
                    company="Pulse Health Systems",
                    description="Patient relationship management and automated clinical trial follow-up telemetry engine.",
                    industry="HealthTech",
                    stage="General Availability",
                    target_users="Clinical Research Coordinators & Clinic Admins",
                    expected_launch_date="2026-11-30",
                    health="CRITICAL",
                    failure_risk=76,
                    risk_trend="+18% over 30 days",
                    predicted_next_failure="Silent Clinical Trial Churn Escalation",
                    prediction_confidence=91,
                    historical_similarity=78,
                    privacy_level="ORGANIZATION",
                    organization_id="org_aurora_technologies",
                    sources_uploaded=["CUSTOMER_FEEDBACK", "PRODUCT_METRICS", "INCIDENT_REPORTS"]
                ),
                Project(
                    id="zenith",
                    name="Zenith Checkout",
                    code_name="PROJECT ZENITH",
                    company="Zenith Commerce",
                    description="High-throughput headless checkout infrastructure with sub-second bank rail validation.",
                    industry="E-Commerce",
                    stage="Scaling",
                    target_users="Enterprise E-Commerce Engineers",
                    expected_launch_date="2027-01-15",
                    health="HEALTHY",
                    failure_risk=18,
                    risk_trend="-12% over 60 days",
                    predicted_next_failure="None Detected (Nominal Risk Horizon)",
                    prediction_confidence=94,
                    historical_similarity=92,
                    privacy_level="PUBLIC",
                    organization_id="org_aurora_technologies",
                    sources_uploaded=["ENGINEERING_METRICS", "TEAM_OPERATIONS"]
                )
            ]
            for p in baseline_projects:
                db.add(p)
            db.commit()
            print("Default projects seeded successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()

