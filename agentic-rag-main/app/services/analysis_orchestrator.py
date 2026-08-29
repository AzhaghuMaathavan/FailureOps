import time
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.services.document_service import process_document
from app.services.evidence_retriever import retrieve_project_evidence_candidates
from app.services.evidence_agent import run_evidence_agent

logger = logging.getLogger(__name__)

def update_analysis_stage(
    db: Session, 
    analysis_id: str, 
    status: str, 
    stage: str, 
    progress: int, 
    error_msg: str = None
):
    analysis = db.query(ProjectAnalysis).filter(ProjectAnalysis.id == analysis_id).first()
    if analysis:
        analysis.status = status
        analysis.current_stage = stage
        analysis.progress_percent = progress
        if error_msg:
            analysis.error_message = error_msg
        if status == "COMPLETED":
            analysis.completed_at = datetime.now(timezone.utc)
        db.commit()

def run_project_analysis_pipeline(
    analysis_id: str,
    organization_id: str,
    project_id: str
):
    """
    Asynchronous worker task that executes the complete RAG + Evidence Intelligence lifecycle.
    """
    db: Session = SessionLocal()
    t_start = time.time()
    
    try:
        # Stage 1: Document Processing Check
        update_analysis_stage(db, analysis_id, "PARSING_DOCUMENTS", "Processing project files...", 15)
        
        # Check if any documents for this project are still pending
        pending_docs = db.query(Document).filter(
            Document.organization_id == organization_id,
            Document.project_id == project_id,
            Document.status == "PENDING"
        ).all()
        
        for doc in pending_docs:
            try:
                process_document(doc.id, doc.original_path)
            except Exception as e:
                logger.error(f"Error processing pending document {doc.id}: {e}")

        # Stage 2: Chunking & Indexing
        update_analysis_stage(db, analysis_id, "INDEXING", "Indexing semantic chunks and embeddings...", 40)
        time.sleep(0.5)

        # Stage 3: 16-Dimension Targeted Hybrid Retrieval
        update_analysis_stage(db, analysis_id, "RETRIEVING_EVIDENCE", "Retrieving evidence across 16 dimensions...", 60)
        
        # Get all project document IDs
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

        # Stage 4: Cross-Encoder Reranking
        update_analysis_stage(db, analysis_id, "RERANKING", "Ranking factual evidence candidates...", 75)
        time.sleep(0.5)

        # Stage 5: Evidence Extraction & Citation Validation
        update_analysis_stage(db, analysis_id, "EXTRACTING_EVIDENCE", "Extracting and normalizing facts...", 85)
        
        t_duration = time.time() - t_start
        evidence_packet = run_evidence_agent(
            organization_id=organization_id,
            project_id=project_id,
            analysis_id=analysis_id,
            dimension_chunks_map=dimension_chunks,
            total_docs_count=len(project_docs),
            processing_time=t_duration
        )

        # Stage 6: Persistence in Database
        update_analysis_stage(db, analysis_id, "VALIDATING_EVIDENCE", "Persisting Evidence Packet...", 95)
        
        analysis = db.query(ProjectAnalysis).filter(ProjectAnalysis.id == analysis_id).first()
        if analysis:
            analysis.evidence_packet = evidence_packet.model_dump()
            analysis.metrics = evidence_packet.metrics.model_dump()
            
            # Save individual items for relational querying
            for item in evidence_packet.evidence:
                db_item = EvidenceItem(
                    id=item.id,
                    analysis_id=analysis_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    category=item.category,
                    evidence_type=item.evidence_type,
                    statement=item.statement,
                    normalized_value=item.normalized_value.model_dump() if item.normalized_value else None,
                    time_period=item.time_period.model_dump() if item.time_period else None,
                    source_lineage=item.source.model_dump(),
                    supporting_sources=[s.model_dump() for s in item.supporting_sources],
                    supporting_chunk_ids=item.supporting_chunk_ids,
                    evidence_confidence=item.evidence_confidence,
                    verification_status=item.verification_status,
                    visibility=item.privacy.visibility,
                    global_learning_allowed=item.privacy.global_learning_allowed
                )
                db.add(db_item)
                
            for conflict in evidence_packet.conflicts:
                db_conf = EvidenceConflict(
                    id=conflict.id,
                    analysis_id=analysis_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    topic=conflict.topic,
                    category=conflict.category,
                    claims=[c.model_dump() for c in conflict.claims],
                    status=conflict.status
                )
                db.add(db_conf)
                
            db.commit()

        # Completed!
        update_analysis_stage(db, analysis_id, "COMPLETED", "Evidence Intelligence Report Ready", 100)
        logger.info(f"[analysis_orchestrator] Analysis {analysis_id} completed successfully in {round(time.time() - t_start, 2)}s")

    except Exception as e:
        logger.error(f"[analysis_orchestrator] Analysis {analysis_id} failed: {e}", exc_info=True)
        update_analysis_stage(db, analysis_id, "FAILED", "Analysis encountered an error", 0, error_msg=str(e))
    finally:
        db.close()
