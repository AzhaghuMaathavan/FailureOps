from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.project import Project

BASELINE_PROJECT_SPECS = [
    {
        "id": "aurora",
        "name": "ExpenseTracker",
        "code_name": "PROJECT AURORA",
        "company": "Aurora Technologies",
        "description": "Expense management & corporate card intelligence platform for fast-scaling SMBs.",
        "industry": "FinTech",
        "stage": "Beta",
        "target_users": "SMB Finance Managers & Operations Leads",
        "expected_launch_date": "2026-10-15",
        "health": "WATCH",
        "failure_risk": 0,
        "risk_trend": "Awaiting Analysis",
        "predicted_next_failure": "No Failure Predicted (Awaiting Analysis)",
        "prediction_confidence": 0,
        "historical_similarity": 0,
        "privacy_level": "PRIVATE",
        "organization_id": "org_aurora_technologies",
        "sources_uploaded": [],
    },
    {
        "id": "pulseflow",
        "name": "PulseFlow CRM",
        "code_name": "PROJECT PULSE",
        "company": "Pulse Health Systems",
        "description": "Patient relationship management and automated clinical trial follow-up telemetry engine.",
        "industry": "HealthTech",
        "stage": "General Availability",
        "target_users": "Clinical Research Coordinators & Clinic Admins",
        "expected_launch_date": "2026-11-30",
        "health": "WATCH",
        "failure_risk": 0,
        "risk_trend": "Awaiting Analysis",
        "predicted_next_failure": "No Failure Predicted (Awaiting Analysis)",
        "prediction_confidence": 0,
        "historical_similarity": 0,
        "privacy_level": "ORGANIZATION",
        "organization_id": "org_aurora_technologies",
        "sources_uploaded": ["CUSTOMER_FEEDBACK", "PRODUCT_METRICS", "INCIDENT_REPORTS"],
    },
    {
        "id": "zenith",
        "name": "Zenith Checkout",
        "code_name": "PROJECT ZENITH",
        "company": "Zenith Commerce",
        "description": "High-throughput headless checkout infrastructure with sub-second bank rail validation.",
        "industry": "E-Commerce",
        "stage": "Scaling",
        "target_users": "Enterprise E-Commerce Engineers",
        "expected_launch_date": "2027-01-15",
        "health": "WATCH",
        "failure_risk": 0,
        "risk_trend": "Awaiting Analysis",
        "predicted_next_failure": "No Failure Predicted (Awaiting Analysis)",
        "prediction_confidence": 0,
        "historical_similarity": 0,
        "privacy_level": "PUBLIC",
        "organization_id": "org_aurora_technologies",
        "sources_uploaded": ["ENGINEERING_METRICS", "TEAM_OPERATIONS"],
    },
]


def ensure_baseline_projects(db: Session) -> int:
    """Insert missing demo projects even when the table is already populated."""
    existing_ids = {row[0] for row in db.query(Project.id).all()}
    added = 0
    for spec in BASELINE_PROJECT_SPECS:
        if spec["id"] in existing_ids:
            continue
        db.add(Project(**spec))
        added += 1
    if added:
        db.commit()
    return added


def ensure_baseline_project(db: Session, project_id: str) -> Optional[Project]:
    """Return an existing project, creating it if it is a known baseline id."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if project:
        return project

    spec = next((item for item in BASELINE_PROJECT_SPECS if item["id"] == project_id), None)
    if not spec:
        return None

    try:
        project = Project(**spec)
        db.add(project)
        db.commit()
        db.refresh(project)
        return project
    except IntegrityError:
        db.rollback()
        return db.query(Project).filter(Project.id == project_id).first()
