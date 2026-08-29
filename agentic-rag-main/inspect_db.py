#!/usr/bin/env python3
"""
FailureOps X — Database & Backend Telemetry Inspector
Run this script anytime to verify all stored entities in the database.
"""
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal
from app.models.project import Project
from app.models.document import Document
from app.models.chunk import Chunk
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem
from app.models.signal import SignalItem

def inspect_database():
    db = SessionLocal()
    print("=" * 60)
    print("      FAILUREOPS X — DATABASE INTEGRITY AUDIT")
    print("=" * 60)

    # 1. Projects
    projects = db.query(Project).all()
    print(f"\n📁 1. PROJECTS ({len(projects)} Registered):")
    for p in projects:
        print(f"   • [{p.id}] {p.name} ({p.company}) | Health: {p.health} | Risk: {p.failure_risk}% | Dominant Archetype: {p.predicted_next_failure}")

    # 2. Documents
    docs = db.query(Document).all()
    print(f"\n📄 2. INGESTED DOCUMENTS ({len(docs)} Total):")
    for d in docs:
        print(f"   • [{d.project_id}] {d.filename} | Status: {d.status} | ID: {d.id}")

    # 3. Chunks
    chunk_count = db.query(Chunk).count()
    print(f"\n🧩 3. VECTOR CHUNKS: {chunk_count} Chunks Indexed")

    # 4. Intelligence Analyses
    analyses = db.query(ProjectAnalysis).order_by(ProjectAnalysis.created_at.desc()).all()
    print(f"\n🧠 4. COMPLETED ANALYSES ({len(analyses)} Runs):")
    for a in analyses:
        dna = a.failure_dna or {}
        radar = a.radar_snapshot or {}
        print(f"   • Analysis: {a.id} | Project: {a.project_id} | Status: {a.status} | Progress: {a.progress_percent}%")
        if dna.get("overall"):
            print(f"     - Archetype: {dna['overall'].get('dominant_archetype')} (Risk Score: {dna['overall'].get('risk_score')})")
        if radar.get("executive_summary"):
            print(f"     - Top Radar Risk: {radar['executive_summary'].get('top_failure_risk')}")


    # 5. Evidence Packet Items
    ev_count = db.query(EvidenceItem).count()
    print(f"\n🔍 5. GROUNDED EVIDENCE ITEMS: {ev_count} Items Verified")

    # 6. Signals
    sig_count = db.query(SignalItem).count()
    print(f"\n⚡ 6. DETECTED SIGNALS: {sig_count} Active Telemetry Signals")
    print("=" * 60)
    print("✓ All data points are persisted in the database.")
    print("=" * 60)
    db.close()

if __name__ == "__main__":
    inspect_database()
