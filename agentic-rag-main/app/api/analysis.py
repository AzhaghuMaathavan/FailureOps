import os
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, BackgroundTasks, HTTPException

from sqlalchemy.orm import Session
from app.db.database import get_db
from app.core.config import settings
from app.core.tenant import get_tenant_context
from app.models.document import Document, Page
from app.models.chunk import Chunk
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.schemas.analysis import StartAnalysisRequest, StartAnalysisResponse, AnalysisStatusResponse
from app.schemas.evidence_packet import EvidencePacket, EvidenceMetrics
from app.schemas.signal_packet import SignalPacket, SignalItemSchema
from app.schemas.failure_dna import FailureDNAPacket, OverallProjectHealth
from app.schemas.failure_chain import FailureChainPacket, FailurePrediction
from app.schemas.historical_memory import HistoricalMemoryPacket
from app.schemas.simulation import SimulationComparisonPacket

from app.models.signal import SignalItem
from app.models.project import Project
from app.db.baseline_projects import ensure_baseline_project
from app.services.document_service import process_document
from app.services.ingest_service import ingest_upload
from app.services.analysis_orchestrator import run_project_analysis_pipeline
from app.services.outcome_engine import verify_experiment_outcome
from app.core.storage import persist_upload, merge_storage_metadata, document_storage_fields
from app.core.object_storage import delete_object
from app.services.pipeline_status import build_project_pipeline, document_pipeline_dict
from app.services.retrieval_service import search_knowledge_base
from pydantic import BaseModel

router = APIRouter()


class ProjectCreateSchema(BaseModel):
    name: str
    company: str
    description: Optional[str] = None
    industry: Optional[str] = "FinTech"
    stage: Optional[str] = "Beta"
    targetUsers: Optional[str] = None
    expectedLaunchDate: Optional[str] = None
    privacyLevel: Optional[str] = "PRIVATE"
    sourcesUploaded: Optional[List[str]] = []


@router.get("/projects")
def list_organization_projects(
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Lists all projects belonging to the authenticated tenant organization or public projects.
    """
    projects = db.query(Project).filter(
        (Project.organization_id == org_id) | (Project.privacy_level.in_(["PUBLIC", "PUBLIC_CASE_STUDY"]))
    ).order_by(Project.created_at.desc()).all()


    results = []
    for p in projects:
        # Check if there is a completed analysis for live updated metrics
        latest_analysis = db.query(ProjectAnalysis).filter(
            ProjectAnalysis.organization_id == p.organization_id,
            ProjectAnalysis.project_id == p.id,
            ProjectAnalysis.status == "COMPLETED"
        ).order_by(ProjectAnalysis.created_at.desc()).first()

        failure_risk = p.failure_risk if p.failure_risk is not None else 0
        risk_trend = p.risk_trend or "Awaiting Analysis"
        predicted_failure = p.predicted_next_failure or "No Failure Predicted (Awaiting Analysis)"
        pred_conf = p.prediction_confidence if p.prediction_confidence is not None else 0
        health = p.health or "WATCH"
        historical_similarity = p.historical_similarity if p.historical_similarity is not None else 0
        last_analyzed = None
        signal_count = 0

        if latest_analysis and latest_analysis.failure_dna:
            dna_overall = latest_analysis.failure_dna.get("overall", {})
            failure_risk = dna_overall.get("risk_score", failure_risk)
            health = dna_overall.get("status", health)
            last_analyzed = latest_analysis.completed_at.isoformat() if latest_analysis.completed_at else None
            if latest_analysis.failure_chain and latest_analysis.failure_chain.get("prediction"):
                pred = latest_analysis.failure_chain["prediction"]
                predicted_failure = pred.get("predicted_failure") or predicted_failure
                raw_conf = pred.get("confidence")
                if isinstance(raw_conf, float) and raw_conf <= 1:
                    pred_conf = int(raw_conf * 100)
                elif isinstance(raw_conf, (int, float)):
                    pred_conf = int(raw_conf)
            if latest_analysis.historical_matches:
                historical_similarity = latest_analysis.historical_matches.get("top_similarity") or historical_similarity
            if latest_analysis.signal_packet:
                signal_count = len(latest_analysis.signal_packet.get("signals") or [])

        results.append({
            "id": p.id,
            "name": p.name,
            "codeName": p.code_name,
            "company": p.company,
            "description": p.description,
            "industry": p.industry,
            "stage": p.stage,
            "targetUsers": p.target_users,
            "expectedLaunchDate": p.expected_launch_date,
            "health": health,
            "failureRisk": failure_risk,
            "riskTrend": risk_trend,
            "predictedNextFailure": predicted_failure,
            "predictionConfidence": pred_conf,
            "historicalSimilarity": historical_similarity,
            "privacyLevel": p.privacy_level,
            "sourcesUploaded": p.sources_uploaded or [],
            "lastAnalyzedAt": last_analyzed,
            "activeFailureSeedsCount": signal_count
        })
    return results


@router.post("/projects")
def register_project(
    data: ProjectCreateSchema,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Registers a new project enclave in the database.
    """
    import re
    proj_slug = re.sub(r'[^a-z0-9]', '-', data.name.lower()).strip('-') or f"proj-{uuid.uuid4().hex[:6]}"
    
    # Ensure ID uniqueness
    existing = db.query(Project).filter(Project.id == proj_slug).first()
    if existing:
        proj_slug = f"{proj_slug}-{uuid.uuid4().hex[:4]}"

    code_name = f"PROJECT {data.name.upper()[:8]}"

    new_proj = Project(
        id=proj_slug,
        name=data.name,
        code_name=code_name,
        company=data.company,
        description=data.description,
        industry=data.industry,
        stage=data.stage,
        target_users=data.targetUsers,
        expected_launch_date=data.expectedLaunchDate,
        privacy_level=data.privacyLevel or "PRIVATE",
        organization_id=org_id,
        health="WATCH",
        failure_risk=0,
        risk_trend="Awaiting Analysis",
        predicted_next_failure="No Failure Predicted (Awaiting Analysis)",
        prediction_confidence=0,
        historical_similarity=0,
        sources_uploaded=data.sourcesUploaded or []
    )
    db.add(new_proj)
    db.commit()


    return {
        "id": new_proj.id,
        "name": new_proj.name,
        "codeName": new_proj.code_name,
        "company": new_proj.company,
        "description": new_proj.description,
        "industry": new_proj.industry,
        "stage": new_proj.stage,
        "targetUsers": new_proj.target_users,
        "expectedLaunchDate": new_proj.expected_launch_date,
        "health": new_proj.health,
        "failureRisk": new_proj.failure_risk,
        "riskTrend": new_proj.risk_trend,
        "predictedNextFailure": new_proj.predicted_next_failure,
        "predictionConfidence": new_proj.prediction_confidence,
        "historicalSimilarity": new_proj.historical_similarity,
        "privacyLevel": new_proj.privacy_level,
        "sourcesUploaded": new_proj.sources_uploaded,
        "lastAnalyzedAt": None,
        "activeFailureSeedsCount": 4
    }


@router.get("/projects/{project_id}")
def get_project_details(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves project details with tenant authorization checks.
    """
    p = ensure_baseline_project(db, project_id)

    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    if p.privacy_level not in ["PUBLIC", "PUBLIC_CASE_STUDY"] and p.organization_id != org_id:
        raise HTTPException(status_code=403, detail="Forbidden: Cross-tenant project access denied")


    latest_analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == p.organization_id,
        ProjectAnalysis.project_id == p.id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    failure_risk = p.failure_risk if p.failure_risk is not None else 0
    risk_trend = p.risk_trend or "Awaiting Analysis"
    predicted_failure = p.predicted_next_failure or "No Failure Predicted (Awaiting Analysis)"
    pred_conf = p.prediction_confidence if p.prediction_confidence is not None else 0
    health = p.health or "WATCH"

    if latest_analysis and latest_analysis.failure_dna:
        dna_overall = latest_analysis.failure_dna.get("overall", {})
        failure_risk = dna_overall.get("risk_score", failure_risk)
        health = dna_overall.get("status", health)
        if latest_analysis.failure_chain and latest_analysis.failure_chain.get("prediction"):
            pred = latest_analysis.failure_chain["prediction"]
            predicted_failure = pred.get("predicted_failure") or predicted_failure
            raw_conf = pred.get("confidence")
            if isinstance(raw_conf, float) and raw_conf <= 1:
                pred_conf = int(raw_conf * 100)
            elif isinstance(raw_conf, (int, float)):
                pred_conf = int(raw_conf)

    active_seeds = len(latest_analysis.signal_packet.get("signals", [])) if (latest_analysis and latest_analysis.signal_packet) else 0

    return {
        "id": p.id,
        "name": p.name,
        "codeName": p.code_name,
        "company": p.company,
        "description": p.description,
        "industry": p.industry,
        "stage": p.stage,
        "targetUsers": p.target_users,
        "expectedLaunchDate": p.expected_launch_date,
        "health": health,
        "failureRisk": failure_risk,
        "riskTrend": risk_trend,
        "predictedNextFailure": predicted_failure,
        "predictionConfidence": pred_conf,
        "historicalSimilarity": p.historical_similarity if p.historical_similarity is not None else 0,
        "privacyLevel": p.privacy_level,
        "sourcesUploaded": p.sources_uploaded or [],
        "lastAnalyzedAt": latest_analysis.completed_at.isoformat() if latest_analysis and latest_analysis.completed_at else None,
        "activeFailureSeedsCount": active_seeds
    }




@router.post("/projects/{project_id}/analysis", response_model=StartAnalysisResponse)
def start_project_analysis(
    project_id: str,
    background_tasks: BackgroundTasks,
    request: StartAnalysisRequest = StartAnalysisRequest(),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Starts an asynchronous FailureOps Evidence Intelligence analysis run for a project.
    """
    analysis_id = f"anl_{uuid.uuid4().hex[:12]}"
    
    db_analysis = ProjectAnalysis(
        id=analysis_id,
        organization_id=org_id,
        project_id=project_id,
        status="QUEUED",
        current_stage="QUEUED",
        progress_percent=0
    )
    db.add(db_analysis)
    db.commit()

    # Trigger background worker pipeline
    background_tasks.add_task(
        run_project_analysis_pipeline,
        analysis_id=analysis_id,
        organization_id=org_id,
        project_id=project_id
    )

    return StartAnalysisResponse(
        analysis_id=analysis_id,
        project_id=project_id,
        organization_id=org_id,
        status="QUEUED",
        message="Analysis job queued successfully"
    )


@router.get("/projects/{project_id}/analysis/{analysis_id}", response_model=AnalysisStatusResponse)
def get_analysis_status(
    project_id: str,
    analysis_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Polls the current status and progress of an analysis run with tenant authorization checks.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.id == analysis_id,
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found or unauthorized")

    return AnalysisStatusResponse(
        analysis_id=analysis.id,
        project_id=analysis.project_id,
        organization_id=analysis.organization_id,
        status=analysis.status,
        current_stage=analysis.current_stage,
        progress_percent=analysis.progress_percent,
        error_message=analysis.error_message,
        created_at=analysis.created_at.isoformat() if analysis.created_at else None,
        completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
        metrics=analysis.metrics
    )


@router.get("/projects/{project_id}/analysis/{analysis_id}/evidence", response_model=EvidencePacket)
def get_analysis_evidence_packet(
    project_id: str,
    analysis_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the verified structured Evidence Packet produced by the Evidence Agent.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.id == analysis_id,
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found or unauthorized")

    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=400, 
            detail=f"Analysis is still in progress (Current status: {analysis.status}, Progress: {analysis.progress_percent}%)"
        )

    if not analysis.evidence_packet:
        raise HTTPException(status_code=500, detail="Evidence packet unavailable")

    return EvidencePacket(**analysis.evidence_packet)


@router.get("/projects/{project_id}/evidence", response_model=EvidencePacket)
def get_latest_project_evidence(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the latest completed Evidence Packet for a project with multi-tenant scoping.
    """
    latest_analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if not latest_analysis or not latest_analysis.evidence_packet:
        return EvidencePacket(
            project_id=project_id,
            analysis_id="none",
            organization_id=org_id,
            generated_at=datetime.now(timezone.utc).isoformat(),
            evidence=[],
            conflicts=[],

            coverage={dim: "NO_EVIDENCE_FOUND" for dim in [
                "ADOPTION", "CUSTOMER", "TECHNICAL", "OPERATIONAL", "FINANCIAL", 
                "DELIVERY", "QUALITY", "RESOURCE", "TEAM", "MARKET", "STRATEGY", 
                "SECURITY", "DEPENDENCY", "PERFORMANCE", "RISK", "OTHER"
            ]},
            metrics=EvidenceMetrics(
                total_documents_analyzed=0,
                total_chunks_searched=0,
                total_evidence_extracted=0,
                verified_evidence_count=0,
                rejected_evidence_count=0,
                conflicts_count=0,
                processing_time_seconds=0.0
            )
        )

    return EvidencePacket(**latest_analysis.evidence_packet)



@router.get("/projects/{project_id}/analysis/{analysis_id}/signals", response_model=SignalPacket)
def get_analysis_signal_packet(
    project_id: str,
    analysis_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the verified structured Signal Packet produced by the Member 2 Signal Engine.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.id == analysis_id,
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis job not found or unauthorized")

    if analysis.status != "COMPLETED":
        raise HTTPException(
            status_code=400, 
            detail=f"Analysis is still in progress (Current status: {analysis.status}, Progress: {analysis.progress_percent}%)"
        )

    if not analysis.signal_packet:
        raise HTTPException(status_code=500, detail="Signal packet unavailable")

    return SignalPacket(**analysis.signal_packet)


@router.get("/projects/{project_id}/signals", response_model=SignalPacket)
def get_latest_project_signals(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the latest completed Signal Packet for a project with multi-tenant scoping.
    """
    latest_analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if not latest_analysis or not latest_analysis.signal_packet:
        # Check individual signal records as fallback
        signals = db.query(SignalItem).filter(
            SignalItem.organization_id == org_id,
            SignalItem.project_id == project_id
        ).all()
        
        if not signals:
            return SignalPacket(
                project_id=project_id,
                analysis_id="none",
                organization_id=org_id,
                signals=[]
            )

        signal_schemas = [
            SignalItemSchema(
                signal_id=s.id,
                project_id=s.project_id,
                analysis_id=s.analysis_id,
                organization_id=s.organization_id,
                name=s.name,
                category=s.category,
                signal_type=s.signal_type,
                polarity=s.polarity,
                status=s.status,
                severity=s.severity,
                summary=s.summary,
                metric_change=s.metric_change,
                signal_strength=s.signal_strength,
                signal_confidence=s.signal_confidence,
                historical_prevalence=s.historical_prevalence,
                supporting_evidence_ids=s.supporting_evidence_ids,
                supporting_relationship_ids=s.supporting_relationship_ids or []
            )
            for s in signals
        ]
        return SignalPacket(
            project_id=project_id,
            analysis_id=signals[0].analysis_id if signals else "none",
            organization_id=org_id,
            signals=signal_schemas
        )

    return SignalPacket(**latest_analysis.signal_packet)


@router.get("/projects/{project_id}/failure-dna", response_model=FailureDNAPacket)
def get_project_failure_dna(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the computed multi-dimensional Failure DNA & Health for a project.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if not analysis or not analysis.failure_dna:
        return FailureDNAPacket(
            project_id=project_id,
            analysis_id="none",
            organization_id=org_id,
            overall=OverallProjectHealth(
                risk_score=0,
                status="INSUFFICIENT_EVIDENCE",
                trend="UNKNOWN",
                dominant_archetype="No Analysis Recorded",
                summary_explanation="No completed intelligence analysis found for this project."
            ),

            dimensions=[]
        )

    return FailureDNAPacket(**analysis.failure_dna)


@router.get("/projects/{project_id}/failure-chain", response_model=FailureChainPacket)
def get_project_failure_chain(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the causal failure trajectory graph and prediction for a project.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if not analysis or not analysis.failure_chain:
        return FailureChainPacket(
            project_id=project_id,
            analysis_id="none",
            organization_id=org_id,

            prediction=FailurePrediction(
                predicted_failure="No Failure Predicted (Awaiting Analysis)",
                risk_score=0,
                confidence=0.0,
                status="UNLIKELY",
                time_horizon="N/A",
                explanation="No completed failure chain exists for this project.",
                supporting_evidence_ids=[]
            ),
            nodes=[],
            edges=[],
            explanation="No analysis available."
        )

    return FailureChainPacket(**analysis.failure_chain)


@router.get("/projects/{project_id}/predictions", response_model=FailurePrediction)
def get_project_failure_prediction(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the top predicted next failure for a project.
    """
    chain_packet = get_project_failure_chain(project_id, org_id, db)
    return chain_packet.prediction


@router.get("/projects/{project_id}/historical-cases", response_model=HistoricalMemoryPacket)
def get_project_historical_matches(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves similar historical failure & recovery cases with privacy filtering.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.historical_matches:
        return HistoricalMemoryPacket(**analysis.historical_matches)

    # Fallback search from memory engine
    from app.services.memory_engine import search_historical_failure_cases
    latest_signals = get_latest_project_signals(project_id, org_id, db)
    return search_historical_failure_cases(
        project_id=project_id,
        organization_id=org_id,
        signal_packet=latest_signals,
        caller_org_id=org_id
    )


@router.post("/projects/{project_id}/simulate", response_model=SimulationComparisonPacket)
def simulate_project_scenarios(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Runs deterministic What-if scenario simulations for a project.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.simulations:
        return SimulationComparisonPacket(**analysis.simulations)

    from app.services.simulation_engine import run_what_if_simulations
    latest_signals = get_latest_project_signals(project_id, org_id, db)
    dna = get_project_failure_dna(project_id, org_id, db)
    return run_what_if_simulations(
        project_id=project_id,
        organization_id=org_id,
        signal_packet=latest_signals,
        dna_packet=dna
    )




@router.post("/projects/{project_id}/documents/upload")
async def upload_project_document(
    project_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    document_type: Optional[str] = Form("PROJECT_DOC"),
    description: Optional[str] = Form(None),
    visibility: Optional[str] = Form("PRIVATE"),
    sync: Optional[str] = Form("false"),
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Uploads a project document, attaches tenant metadata, and queues format-aware parsing.
    """
    return await ingest_upload(
        db,
        file,
        project_id=project_id,
        organization_id=org_id,
        title=title,
        document_type=document_type,
        description=description,
        visibility=visibility or "PRIVATE",
        sync=sync,
        background_tasks=background_tasks,
    )


@router.get("/projects/{project_id}/documents")
def list_project_documents(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Lists all documents for a project with multi-tenant filtering.
    """
    docs = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id
    ).order_by(Document.created_at.desc()).all()

    return [
        {
            "id": d.id,
            "filename": d.filename,
            "title": d.title,
            "document_type": d.document_type,
            "status": d.status,
            "error_message": d.error_message,
            "visibility": d.visibility,
            "page_count": db.query(Page).filter(Page.document_id == d.id).count(),
            "chunk_count": db.query(Chunk).filter(Chunk.document_id == d.id).count(),
            "embedded_count": db.query(Chunk).filter(
                Chunk.document_id == d.id,
                Chunk.embedding_status == "COMPLETED"
            ).count(),
            "created_at": d.created_at.isoformat() if d.created_at else None,
            **document_storage_fields(d),
        }
        for d in docs
    ]


@router.delete("/projects/{project_id}/documents/{document_id}")
def delete_project_document(
    project_id: str,
    document_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Deletes a project document, associated chunks, and original file with tenant isolation.
    """
    doc = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id,
        Document.id == document_id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")

    # Delete related chunks
    db.query(Chunk).filter(Chunk.document_id == doc.id).delete()
    db.delete(doc)
    db.commit()

    try:
        delete_object(doc.original_path)
    except Exception:
        pass

    return {"status": "DELETED", "document_id": document_id, "project_id": project_id}


@router.get("/projects/{project_id}/pipeline")
def get_project_pipeline(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    return build_project_pipeline(db, org_id, project_id)


@router.get("/projects/{project_id}/documents/{document_id}/pipeline")
def get_document_pipeline(
    project_id: str,
    document_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id,
        Document.id == document_id,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found or unauthorized")
    return document_pipeline_dict(db, doc)


class ProjectRetrieveRequest(BaseModel):
    query: str
    document_ids: Optional[List[str]] = None


class ProjectAskRequest(BaseModel):
    query: str
    conversation_id: Optional[str] = None


@router.post("/projects/{project_id}/retrieve")
def retrieve_project_knowledge(
    project_id: str,
    request: ProjectRetrieveRequest,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Project-scoped hybrid RAG retrieval used by FailureOps search and Truth Engine.
    """
    document_ids = request.document_ids
    if not document_ids:
        docs = db.query(Document).filter(
            Document.organization_id == org_id,
            Document.project_id == project_id
        ).all()
        document_ids = [d.id for d in docs] or None

    results, metrics, _ = search_knowledge_base(
        db,
        request.query,
        document_ids,
        organization_id=org_id,
        project_id=project_id,
    )

    return {
        "query": request.query,
        "project_id": project_id,
        "organization_id": org_id,
        "results": results,
        "metrics": metrics,
    }


@router.post("/projects/{project_id}/ask")
def ask_project_knowledge(
    project_id: str,
    request: ProjectAskRequest,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Grounded RAG Q&A over the project's ingested documents.
    """
    from app.services.agent_service import orchestrate_rag
    from app.services.rag_response import empty_rag_response, sources_from_evidence

    docs = db.query(Document).filter(
        Document.organization_id == org_id,
        Document.project_id == project_id
    ).all()
    document_ids = [d.id for d in docs] or None

    try:
        result = orchestrate_rag(
            db,
            request.query,
            [request.query],
            document_ids,
            original_query=request.query,
            organization_id=org_id,
            project_id=project_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {exc}") from exc

    result["project_id"] = project_id
    result["organization_id"] = org_id
    if "sources" not in result:
        result["sources"] = sources_from_evidence(result.get("citations") or result.get("retrieved_evidence") or [])
    if result.get("evidence_state") == "NONE" and not result.get("sources"):
        empty = empty_rag_response(project_id=project_id, organization_id=org_id)
        result.update(empty)
    return result


# ==========================================
# MEMBER 4 — DECISION & ACTION ENDPOINTS
# ==========================================


@router.get("/projects/{project_id}/interventions", response_model=Dict[str, Any])
def get_project_interventions(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the prioritized intervention plan with transparent priority formulas and evidence citations.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.interventions:
        return analysis.interventions

    from app.schemas.intervention import InterventionPlanPacket
    return InterventionPlanPacket(
        project_id=project_id,
        analysis_id=analysis.id if analysis else "none",
        organization_id=org_id,
        interventions=[],
        recommended_primary_intervention="Insufficient evidence for a recommended action",
    ).model_dump()


@router.get("/projects/{project_id}/experiments", response_model=Dict[str, Any])
def get_project_experiments(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves measurable experiments and immutable baselines linked to project interventions.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.experiments:
        return analysis.experiments

    from app.schemas.experiment import ExperimentListPacket
    return ExperimentListPacket(
        project_id=project_id,
        organization_id=org_id,
        experiments=[],
        active_experiment_count=0,
    ).model_dump()


@router.post("/projects/{project_id}/experiments/{experiment_id}/start")
def start_experiment(
    project_id: str,
    experiment_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Transitions an experiment status to ACTIVE and timestamps start.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()
    experiments = (analysis.experiments or {}).get("experiments") if analysis and isinstance(analysis.experiments, dict) else []
    match = next((e for e in experiments if e.get("experiment_id") == experiment_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Experiment not found on a completed analysis")
    from datetime import datetime, timezone
    from sqlalchemy.orm.attributes import flag_modified
    match["status"] = "ACTIVE"
    match["started_at"] = datetime.now(timezone.utc).isoformat()
    analysis.experiments["experiments"] = [
        match if e.get("experiment_id") == experiment_id else e for e in experiments
    ]
    flag_modified(analysis, "experiments")
    db.commit()
    return {
        "experiment_id": experiment_id,
        "project_id": project_id,
        "organization_id": org_id,
        "status": "ACTIVE",
        "started_at": match["started_at"],
        "message": "Experiment marked ACTIVE on the persisted analysis record.",
    }


@router.post("/projects/{project_id}/experiments/{experiment_id}/verify")
def verify_single_experiment(
    project_id: str,
    experiment_id: str,
    measured_metrics: Optional[Dict[str, float]] = None,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Verifies experiment outcome by comparing current metrics against baseline.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()
    experiments = (analysis.experiments or {}).get("experiments") if analysis and isinstance(analysis.experiments, dict) else []
    match = next((e for e in experiments if e.get("experiment_id") == experiment_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Experiment not found on a completed analysis")
    if not measured_metrics:
        raise HTTPException(status_code=400, detail="measured_metrics are required to verify an experiment")
    from app.schemas.experiment import ExperimentItem
    exp = ExperimentItem.model_validate(match)
    report = verify_experiment_outcome(exp, measured_metrics)
    return report.model_dump()


@router.get("/projects/{project_id}/outcomes", response_model=Dict[str, Any])
def get_project_outcomes(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves verified BEFORE vs AFTER experiment outcomes with metric polarity and attribution safety.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.outcomes:
        return analysis.outcomes

    from app.schemas.outcome import OutcomeVerificationPacket
    return OutcomeVerificationPacket(
        project_id=project_id,
        organization_id=org_id,
        outcomes=[],
        overall_success_rate=0.0,
    ).model_dump()


@router.get("/projects/{project_id}/organizational-memory", response_model=Dict[str, Any])
def get_organizational_memory(
    project_id: str,
    pattern: Optional[str] = None,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Queries reusable organizational memory with 3-tier privacy enforcement.
    """
    from app.services.org_memory_engine import query_organizational_memory
    mem_packet = query_organizational_memory(
        organization_id=org_id,
        project_id=project_id,
        pattern_filter=pattern,
        caller_org_id=org_id
    )
    return mem_packet.model_dump()


@router.get("/projects/{project_id}/failure-radar", response_model=Dict[str, Any])
def get_failure_radar_snapshot(
    project_id: str,
    org_id: str = Depends(get_tenant_context),
    db: Session = Depends(get_db)
):
    """
    Retrieves the executive unified Failure Radar snapshot.
    """
    analysis = db.query(ProjectAnalysis).filter(
        ProjectAnalysis.organization_id == org_id,
        ProjectAnalysis.project_id == project_id,
        ProjectAnalysis.status == "COMPLETED"
    ).order_by(ProjectAnalysis.created_at.desc()).first()

    if analysis and analysis.radar_snapshot:
        return analysis.radar_snapshot

    if analysis and analysis.signal_packet:
        from app.services.radar_engine import synthesize_failure_radar_snapshot
        from app.schemas.intervention import InterventionPlanPacket
        from app.schemas.experiment import ExperimentListPacket
        from app.schemas.historical_memory import HistoricalMemoryPacket
        try:
            sig = SignalPacket.model_validate(analysis.signal_packet)
            dna = FailureDNAPacket.model_validate(analysis.failure_dna) if analysis.failure_dna else None
            chain = FailureChainPacket.model_validate(analysis.failure_chain) if analysis.failure_chain else None
            plan = InterventionPlanPacket.model_validate(analysis.interventions) if analysis.interventions else None
            exps = ExperimentListPacket.model_validate(analysis.experiments) if analysis.experiments else None
            mem = HistoricalMemoryPacket.model_validate(analysis.historical_matches) if analysis.historical_matches else None
            return synthesize_failure_radar_snapshot(sig, dna, chain, plan, exps, mem).model_dump()
        except Exception:
            pass

    from app.schemas.radar import RadarExecutiveSnapshotPacket
    return RadarExecutiveSnapshotPacket(
        project_id=project_id,
        organization_id=org_id,
        analysis_id=analysis.id if analysis else "none",
        overall_risk_score=0,
        overall_health="INSUFFICIENT_EVIDENCE",
        risk_velocity="UNKNOWN",
        predicted_next_failure="Insufficient evidence for a reliable failure prediction.",
        prediction_confidence=0.0,
        recommended_primary_action="Insufficient evidence for a recommended action",
        primary_action_priority=0,
    ).model_dump()


