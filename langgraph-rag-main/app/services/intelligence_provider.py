import logging
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.core.config import settings
from app.schemas.evidence_packet import (
    EvidencePacket,
    EvidenceItemSchema,
    NormalizedMetric,
    TimePeriod,
    EvidenceSource,
    PrivacyMetadata,
    EvidenceMetrics,
)
from app.schemas.signal_packet import (
    SignalPacket,
    SignalItemSchema,
    OverallSignalSummary,
)

logger = logging.getLogger(__name__)


class IntelligenceResult(BaseModel):
    """
    Standard envelope representing the structured output of upstream intelligence
    (RAG + Evidence Agent + Signal Agent) consumed by FailureOps downstream engines.
    """
    is_simulated: bool = Field(default=False, description="True if generated from fixture/test provider")
    source: str = Field(default="LANGGRAPH", description="INTELLIGENCE_FIXTURE or LANGGRAPH")
    fixture_version: Optional[str] = Field(default=None, description="Version of fixture data if simulated")
    evidence_packet: EvidencePacket
    signal_packet: SignalPacket


class BaseIntelligenceProvider(ABC):
    """
    Abstract interface for upstream intelligence extraction.
    Allows FailureOps to swap between LangGraph and Fixture providers transparently.
    """

    @abstractmethod
    def get_intelligence_result(
        self,
        project_id: str,
        organization_id: str,
        analysis_id: str,
        **kwargs
    ) -> IntelligenceResult:
        """
        Produces the canonical EvidencePacket and SignalPacket for a project.
        """
        pass


class FixtureProvider(BaseIntelligenceProvider):
    """
    Deterministic, high-fidelity test fixture provider simulating upstream LangGraph output.
    Simulates: RAG Extraction + Evidence Agent + Signal Agent.
    Does NOT simulate: Failure DNA, Causal Chain, Prediction, Memory, Simulation, Interventions, Radar.
    """

    def __init__(self, fixture_version: str = "1.0"):
        self.fixture_version = fixture_version

    def get_intelligence_result(
        self,
        project_id: str,
        organization_id: str,
        analysis_id: str,
        **kwargs
    ) -> IntelligenceResult:
        logger.info(
            f"[FixtureProvider] Generating simulated intelligence fixture v{self.fixture_version} "
            f"for project={project_id}, org={organization_id}, analysis={analysis_id}"
        )

        now_iso = datetime.now(timezone.utc).isoformat()

        # ----------------------------------------------------------------------
        # 1. FIXTURE EVIDENCE ITEMS (5 Factual Empirical Datapoints)
        # ----------------------------------------------------------------------
        evidence_items = [
            # Evidence 1: Unresolved bugs 25 -> 33 (+32%)
            EvidenceItemSchema(
                id=f"ev_fix_001_{analysis_id[:8]}",
                category="QUALITY",
                evidence_type="METRIC",
                statement="Unresolved P1/P2 defect backlog increased from 25 to 33 issues.",
                normalized_value=NormalizedMetric(
                    metric="unresolved_bugs",
                    before=25.0,
                    after=33.0,
                    unit="count",
                    direction="INCREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_fixture_eng_telemetry",
                    document_name="FIXTURE: Engineering & Release Telemetry",
                    location_type="SECTION",
                    location_value="Issue Tracker & Defect Backlog"
                ),
                supporting_chunk_ids=["fixture://engineering-risk/ev-001"],
                evidence_confidence=0.95,
                verification_status="VERIFIED",
                privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
            ),
            # Evidence 2: CI failure rate 8% -> 18% (+125%)
            EvidenceItemSchema(
                id=f"ev_fix_002_{analysis_id[:8]}",
                category="TECHNICAL",
                evidence_type="METRIC",
                statement="CI/CD integration build failure rate increased from 8% to 18%.",
                normalized_value=NormalizedMetric(
                    metric="ci_failure_rate",
                    before=8.0,
                    after=18.0,
                    unit="percent",
                    direction="INCREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_fixture_eng_telemetry",
                    document_name="FIXTURE: Engineering & Release Telemetry",
                    location_type="SECTION",
                    location_value="Build & Release Pipeline Metrics"
                ),
                supporting_chunk_ids=["fixture://engineering-risk/ev-002"],
                evidence_confidence=0.96,
                verification_status="VERIFIED",
                privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
            ),
            # Evidence 3: Code review activity 30 -> 21 PRs/week (-30%)
            EvidenceItemSchema(
                id=f"ev_fix_003_{analysis_id[:8]}",
                category="TEAM",
                evidence_type="METRIC",
                statement="Peer code review completion velocity decreased from 30 PRs/week to 21 PRs/week.",
                normalized_value=NormalizedMetric(
                    metric="code_review_velocity",
                    before=30.0,
                    after=21.0,
                    unit="prs_per_week",
                    direction="DECREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_fixture_eng_telemetry",
                    document_name="FIXTURE: Engineering & Release Telemetry",
                    location_type="SECTION",
                    location_value="Developer Velocity & Sprint Telemetry"
                ),
                supporting_chunk_ids=["fixture://engineering-risk/ev-003"],
                evidence_confidence=0.92,
                verification_status="VERIFIED",
                privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
            ),
            # Evidence 4: Developer overtime 17h -> 24h (+41%)
            EvidenceItemSchema(
                id=f"ev_fix_004_{analysis_id[:8]}",
                category="TEAM",
                evidence_type="METRIC",
                statement="Engineering sprint overtime increased from 17 hours/engineer to 24 hours/engineer.",
                normalized_value=NormalizedMetric(
                    metric="developer_overtime",
                    before=17.0,
                    after=24.0,
                    unit="hours",
                    direction="INCREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_fixture_eng_telemetry",
                    document_name="FIXTURE: Engineering & Release Telemetry",
                    location_type="SECTION",
                    location_value="Sprint Allocation & Team Workload"
                ),
                supporting_chunk_ids=["fixture://engineering-risk/ev-004"],
                evidence_confidence=0.91,
                verification_status="VERIFIED",
                privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
            ),
            # Evidence 5: Customer complaints 40 -> 51 tickets (+27.5%)
            EvidenceItemSchema(
                id=f"ev_fix_005_{analysis_id[:8]}",
                category="CUSTOMER",
                evidence_type="METRIC",
                statement="Customer onboarding friction complaints increased from 40 to 51 tickets.",
                normalized_value=NormalizedMetric(
                    metric="customer_complaints",
                    before=40.0,
                    after=51.0,
                    unit="tickets",
                    direction="INCREASE"
                ),
                time_period=TimePeriod(start="2026-Q2", end="2026-Q3"),
                source=EvidenceSource(
                    document_id="doc_fixture_eng_telemetry",
                    document_name="FIXTURE: Engineering & Release Telemetry",
                    location_type="SECTION",
                    location_value="Customer Feedback & Churn Logs"
                ),
                supporting_chunk_ids=["fixture://engineering-risk/ev-005"],
                evidence_confidence=0.93,
                verification_status="VERIFIED",
                privacy=PrivacyMetadata(visibility="PRIVATE", global_learning_allowed=False)
            ),
        ]

        evidence_packet = EvidencePacket(
            project_id=project_id,
            analysis_id=analysis_id,
            organization_id=organization_id,
            generated_at=now_iso,
            evidence=evidence_items,
            conflicts=[],
            coverage={
                "QUALITY": "HIGH",
                "TECHNICAL": "HIGH",
                "TEAM": "HIGH",
                "CUSTOMER": "MEDIUM",
                "OPERATIONAL": "HIGH"
            },
            metrics=EvidenceMetrics(
                total_documents_analyzed=1,
                total_chunks_searched=5,
                total_evidence_extracted=5,
                verified_evidence_count=5,
                rejected_evidence_count=0,
                conflicts_count=0,
                processing_time_seconds=0.05
            )
        )

        # ----------------------------------------------------------------------
        # 2. FIXTURE SIGNALS (5 Normalized Synthesized Operational Signals)
        # ----------------------------------------------------------------------
        signals = [
            SignalItemSchema(
                signal_id=f"sig_fix_001_{analysis_id[:8]}",
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                name="Defect Compounding & Bug Backlog",
                category="QUALITY",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="HIGH",
                summary="Unresolved P1/P2 defect backlog increased by +32.0% (25 -> 33 issues).",
                metric_change="+32.0% (25 -> 33 count)",
                signal_strength=0.88,
                signal_confidence=0.95,
                historical_prevalence=85,
                supporting_evidence_ids=[evidence_items[0].id],
                supporting_relationship_ids=["rel_fix_tech_stress"],
                created_at=now_iso
            ),
            SignalItemSchema(
                signal_id=f"sig_fix_002_{analysis_id[:8]}",
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                name="CI/CD & Deployment Pipeline Stability",
                category="TECHNICAL",
                signal_type="ANOMALY",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="CRITICAL",
                summary="CI/CD integration build failure rate surged by +125.0% (8% -> 18%).",
                metric_change="+125.0% (8.0 -> 18.0 percent)",
                signal_strength=0.94,
                signal_confidence=0.96,
                historical_prevalence=92,
                supporting_evidence_ids=[evidence_items[1].id],
                supporting_relationship_ids=["rel_fix_tech_stress", "rel_fix_release_instability"],
                created_at=now_iso
            ),
            SignalItemSchema(
                signal_id=f"sig_fix_003_{analysis_id[:8]}",
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                name="Code Review Velocity & Review Paralysis",
                category="TEAM",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="HIGH",
                summary="Peer review completion rate fell by -30.0% (30 -> 21 PRs/week).",
                metric_change="-30.0% (30.0 -> 21.0 prs_per_week)",
                signal_strength=0.84,
                signal_confidence=0.92,
                historical_prevalence=78,
                supporting_evidence_ids=[evidence_items[2].id],
                supporting_relationship_ids=["rel_fix_release_instability"],
                created_at=now_iso
            ),
            SignalItemSchema(
                signal_id=f"sig_fix_004_{analysis_id[:8]}",
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                name="Developer Overtime & Capacity Exhaustion",
                category="TEAM",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="HIGH",
                summary="Developer overtime hours elevated by +41.2% (17 -> 24 hours/engineer).",
                metric_change="+41.2% (17.0 -> 24.0 hours)",
                signal_strength=0.89,
                signal_confidence=0.91,
                historical_prevalence=81,
                supporting_evidence_ids=[evidence_items[3].id],
                supporting_relationship_ids=["rel_fix_release_instability"],
                created_at=now_iso
            ),
            SignalItemSchema(
                signal_id=f"sig_fix_005_{analysis_id[:8]}",
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                name="Customer Support Escalations & Complaints",
                category="CUSTOMER",
                signal_type="TREND",
                polarity="NEGATIVE",
                status="WORSENING",
                severity="MEDIUM",
                summary="Customer onboarding friction complaints rose by +27.5% (40 -> 51 tickets).",
                metric_change="+27.5% (40.0 -> 51.0 tickets)",
                signal_strength=0.76,
                signal_confidence=0.93,
                historical_prevalence=74,
                supporting_evidence_ids=[evidence_items[4].id],
                supporting_relationship_ids=[],
                created_at=now_iso
            ),
        ]

        signal_packet = SignalPacket(
            project_id=project_id,
            analysis_id=analysis_id,
            organization_id=organization_id,
            generated_at=now_iso,
            signals=signals,
            summary=OverallSignalSummary(
                total_signals=5,
                positive_count=0,
                negative_count=5,
                neutral_count=0,
                mixed_count=0,
                critical_count=1,
                high_count=3,
                medium_count=1,
                low_count=0,
                health_score=32.0
            )
        )

        return IntelligenceResult(
            is_simulated=True,
            source="INTELLIGENCE_FIXTURE",
            fixture_version=self.fixture_version,
            evidence_packet=evidence_packet,
            signal_packet=signal_packet
        )


class LangGraphProvider(BaseIntelligenceProvider):
    """
    Production upstream intelligence provider executing real multi-agent LangGraph workflow:
    Document RAG -> Evidence Agent -> Signal Agent.
    """

    def get_intelligence_result(
        self,
        project_id: str,
        organization_id: str,
        analysis_id: str,
        **kwargs
    ) -> IntelligenceResult:
        # In full production mode, this calls the LangGraph / Multi-Agent graph
        from app.services.evidence_retriever import retrieve_project_evidence_candidates
        from app.services.evidence_agent import run_evidence_agent
        from app.services.signal_consumer import consume_evidence_packet
        from app.services.evidence_grouper import group_verified_evidence
        from app.services.trend_detector import detect_trends_from_groups
        from app.services.relationship_detector import detect_evidence_relationships
        from app.services.signal_agent import generate_signal_packet
        from app.db.database import SessionLocal
        from app.models.document import Document

        db = kwargs.get("db") or SessionLocal()
        close_db = kwargs.get("db") is None

        try:
            project_docs = db.query(Document).filter(
                Document.organization_id == organization_id,
                Document.project_id == project_id
            ).all()
            doc_ids = [d.id for d in project_docs] if project_docs else None

            dimension_chunks, retrieval_metrics = retrieve_project_evidence_candidates(
                db=db,
                organization_id=organization_id,
                project_id=project_id,
                document_ids=doc_ids
            )

            evidence_packet = run_evidence_agent(
                organization_id=organization_id,
                project_id=project_id,
                analysis_id=analysis_id,
                dimension_chunks_map=dimension_chunks,
                total_docs_count=len(project_docs),
                processing_time=kwargs.get("processing_time", 0.0)
            )

            signal_input_context = consume_evidence_packet(
                packet_input=evidence_packet,
                authorized_org_id=organization_id,
                expected_project_id=project_id
            )
            evidence_groups = group_verified_evidence(signal_input_context)
            detected_trends = detect_trends_from_groups(evidence_groups)
            relationships = detect_evidence_relationships(evidence_groups, detected_trends)
            signal_packet = generate_signal_packet(
                context=signal_input_context,
                groups=evidence_groups,
                trends=detected_trends,
                relationships=relationships
            )

            return IntelligenceResult(
                is_simulated=False,
                source="LANGGRAPH",
                fixture_version=None,
                evidence_packet=evidence_packet,
                signal_packet=signal_packet
            )
        finally:
            if close_db:
                db.close()


def get_intelligence_provider(source_override: Optional[str] = None) -> BaseIntelligenceProvider:
    """
    Factory function returning the configured intelligence provider.
    Source can be 'fixture' or 'langgraph' (controlled by INTELLIGENCE_SOURCE setting).
    """
    source = (source_override or getattr(settings, "INTELLIGENCE_SOURCE", "langgraph")).lower()
    if source in ["fixture", "mock", "stub", "simulated"]:
        return FixtureProvider(fixture_version="1.0")
    return LangGraphProvider()
