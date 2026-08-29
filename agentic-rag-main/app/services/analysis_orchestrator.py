import time
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.document import Document
from app.models.analysis import ProjectAnalysis
from app.models.evidence import EvidenceItem, EvidenceConflict
from app.models.signal import SignalItem
from app.services.document_service import process_document
from app.services.evidence_retriever import retrieve_project_evidence_candidates
from app.services.evidence_agent import run_evidence_agent
from app.services.signal_consumer import consume_evidence_packet
from app.services.evidence_grouper import group_verified_evidence
from app.services.trend_detector import detect_trends_from_groups
from app.services.relationship_detector import detect_evidence_relationships
from app.services.signal_agent import generate_signal_packet

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
    Asynchronous worker task that executes the complete FailureOps Intelligence lifecycle:
    Member 1 (RAG + Evidence Intelligence) -> Member 2 (Signal Engine).
    """
    db: Session = SessionLocal()
    t_start = time.time()
    
    try:
        # Stage 1: Document Processing Check
        update_analysis_stage(db, analysis_id, "PARSING_DOCUMENTS", "Processing and normalizing project artifacts...", 15)
        
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
        update_analysis_stage(db, analysis_id, "INDEXING", "Indexing semantic chunks and embeddings...", 30)
        time.sleep(0.3)

        # Stage 3: 16-Dimension Targeted Hybrid Retrieval (with Acceptance Gating)
        update_analysis_stage(db, analysis_id, "RETRIEVING_EVIDENCE", "Executing 16-dimension hybrid retrieval...", 50)
        
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

        # Stage 4: Evidence Extraction & Citation Validation (Member 1)
        update_analysis_stage(db, analysis_id, "EXTRACTING_EVIDENCE", "Extracting verified facts and citations...", 70)
        
        t_duration = time.time() - t_start
        evidence_packet = run_evidence_agent(
            organization_id=organization_id,
            project_id=project_id,
            analysis_id=analysis_id,
            dimension_chunks_map=dimension_chunks,
            total_docs_count=len(project_docs),
            processing_time=t_duration
        )

        # Stage 5: Signal Input Validation & Evidence Grouping (Member 2 Stage 1 & 2)
        update_analysis_stage(db, analysis_id, "GROUPING_EVIDENCE", "Validating input packet and clustering evidence...", 80)
        signal_input_context = consume_evidence_packet(
            packet_input=evidence_packet,
            authorized_org_id=organization_id,
            expected_project_id=project_id
        )
        evidence_groups = group_verified_evidence(signal_input_context)

        # Stage 6: Trend & Relationship Detection (Member 2 Stage 3 & 4)
        update_analysis_stage(db, analysis_id, "CORRELATING_PATTERNS", "Detecting numerical trends and cross-source patterns...", 88)
        detected_trends = detect_trends_from_groups(evidence_groups)
        relationships = detect_evidence_relationships(evidence_groups, detected_trends)

        # Stage 7: Signal Agent Synthesis & Grounding (Member 2 Stage 5)
        update_analysis_stage(db, analysis_id, "SYNTHESIZING_SIGNALS", "Synthesizing operational signals and strength metrics...", 88)
        signal_packet = generate_signal_packet(
            context=signal_input_context,
            groups=evidence_groups,
            trends=detected_trends,
            relationships=relationships
        )

        # Stage 8: Failure DNA & Multi-Dimensional Health (Member 3 Feature 4)
        update_analysis_stage(db, analysis_id, "CALCULATING_FAILURE_DNA", "Computing multi-dimensional Failure DNA & Health...", 92)
        from app.services.dna_engine import calculate_failure_dna
        dna_packet = calculate_failure_dna(
            signal_packet=signal_packet,
            evidence_packet=evidence_packet
        )

        # Stage 9: Failure Chain & Trajectory Prediction (Member 3 Feature 1)
        update_analysis_stage(db, analysis_id, "BUILDING_FAILURE_CHAIN", "Modeling causal failure trajectory & predictions...", 95)
        from app.services.failure_chain_engine import generate_failure_chain_and_prediction
        chain_packet = generate_failure_chain_and_prediction(
            signal_packet=signal_packet,
            dna_packet=dna_packet
        )

        # Stage 10: Historical Failure Memory & What-if Simulation (Member 3 Features 2 & 3)
        update_analysis_stage(db, analysis_id, "RUNNING_SIMULATIONS", "Matching historical memory & simulating what-if scenarios...", 97)
        from app.services.memory_engine import search_historical_failure_cases
        from app.services.simulation_engine import run_what_if_simulations
        
        memory_packet = search_historical_failure_cases(
            project_id=project_id,
            organization_id=organization_id,
            signal_packet=signal_packet,
            dna_packet=dna_packet
        )
        simulation_packet = run_what_if_simulations(
            project_id=project_id,
            organization_id=organization_id,
            signal_packet=signal_packet,
            dna_packet=dna_packet
        )

        # Stage 11: Relational Database Persistence
        update_analysis_stage(db, analysis_id, "PERSISTING_ANALYSIS", "Persisting Intelligence Packets...", 99)
        
        analysis = db.query(ProjectAnalysis).filter(ProjectAnalysis.id == analysis_id).first()
        if analysis:
            analysis.evidence_packet = evidence_packet.model_dump()
            analysis.signal_packet = signal_packet.model_dump()
            analysis.failure_dna = dna_packet.model_dump()
            analysis.failure_chain = chain_packet.model_dump()
            analysis.historical_matches = memory_packet.model_dump()
            analysis.simulations = simulation_packet.model_dump()
            analysis.metrics = evidence_packet.metrics.model_dump()
            
            # Save individual evidence items for relational querying
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

            # Save individual signal items
            for sig in signal_packet.signals:
                db_sig = SignalItem(
                    id=sig.signal_id,
                    analysis_id=analysis_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    name=sig.name,
                    category=sig.category,
                    signal_type=sig.signal_type,
                    polarity=sig.polarity,
                    status=sig.status,
                    severity=sig.severity,
                    summary=sig.summary,
                    metric_change=sig.metric_change,
                    signal_strength=sig.signal_strength,
                    signal_confidence=sig.signal_confidence,
                    historical_prevalence=sig.historical_prevalence,
                    supporting_evidence_ids=sig.supporting_evidence_ids,
                    supporting_relationship_ids=sig.supporting_relationship_ids
                )
                db.add(db_sig)
                
            db.commit()

        # Completed!
        update_analysis_stage(db, analysis_id, "COMPLETED", "Full Intelligence Pipeline Complete", 100)
        logger.info(f"[analysis_orchestrator] Analysis {analysis_id} completed successfully in {round(time.time() - t_start, 2)}s with Member 1, 2, and 3 intelligence models.")


    except Exception as e:
        logger.error(f"[analysis_orchestrator] Analysis {analysis_id} failed: {e}", exc_info=True)
        update_analysis_stage(db, analysis_id, "FAILED", "Analysis encountered an error", 0, error_msg=str(e))
    finally:
        db.close()

