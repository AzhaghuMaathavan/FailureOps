import time
import uuid
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

        # Stage 2: Chunking & Indexing (real work already ran during ingest)
        update_analysis_stage(db, analysis_id, "INDEXING", "Indexing semantic chunks and embeddings...", 30)

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

        retrieval_count = sum(len(v or []) for v in (dimension_chunks or {}).values())
        logger.info("[RETRIEVAL] query_id=%s chunks=%s", analysis_id, retrieval_count)

        pipeline_flags = {
            "total_chunks_searched": retrieval_count,
            "retrieval_status": "COMPLETED" if retrieval_count > 0 else "BLOCKED",
            "retrieval_reason": None if retrieval_count > 0 else "No retrieved chunks",
            "evidence_agent_status": "PENDING",
            "signal_agent_status": "PENDING",
        }

        # Stage 4: Evidence Extraction — cannot run without retrieved chunks
        if retrieval_count == 0:
            logger.warning("[EVIDENCE_AGENT] status=BLOCKED reason=no retrieved evidence analysis_id=%s", analysis_id)
            t_duration = time.time() - t_start
            evidence_packet = run_evidence_agent(
                organization_id=organization_id,
                project_id=project_id,
                analysis_id=analysis_id,
                dimension_chunks_map={},
                total_docs_count=len(project_docs),
                processing_time=t_duration
            )
            pipeline_flags["evidence_agent_status"] = "BLOCKED"
            pipeline_flags["evidence_agent_reason"] = "BLOCKED — no retrieved evidence"
            pipeline_flags["signal_agent_status"] = "BLOCKED"
            pipeline_flags["signal_agent_reason"] = "BLOCKED — no grounded evidence"
            logger.warning("[SIGNAL_AGENT] status=BLOCKED reason=no grounded evidence analysis_id=%s", analysis_id)
            from app.schemas.signal_packet import SignalPacket, OverallSignalSummary
            signal_packet = SignalPacket(
                project_id=project_id,
                analysis_id=analysis_id,
                organization_id=organization_id,
                signals=[],
                summary=OverallSignalSummary(),
            )
            from app.services.dna_engine import calculate_failure_dna
            from app.services.failure_chain_engine import generate_failure_chain_and_prediction
            from app.services.memory_engine import search_historical_failure_cases
            from app.services.simulation_engine import run_what_if_simulations
            from app.services.intervention_engine import generate_intervention_plan
            from app.services.experiment_engine import generate_initial_experiments_from_plan
            from app.services.outcome_engine import verify_all_project_experiments
            from app.services.radar_engine import synthesize_failure_radar_snapshot
            dna_packet = calculate_failure_dna(signal_packet=signal_packet, evidence_packet=evidence_packet)
            chain_packet = generate_failure_chain_and_prediction(signal_packet=signal_packet, dna_packet=dna_packet)
            memory_packet = search_historical_failure_cases(
                project_id=project_id,
                organization_id=organization_id,
                signal_packet=signal_packet,
                dna_packet=dna_packet,
            )
            simulation_packet = run_what_if_simulations(
                project_id=project_id,
                organization_id=organization_id,
                signal_packet=signal_packet,
                dna_packet=dna_packet,
            )
            intervention_plan = generate_intervention_plan(
                signal_packet=signal_packet,
                dna_packet=dna_packet,
                chain_packet=chain_packet,
                memory_packet=memory_packet,
                simulation_packet=simulation_packet,
            )
            experiment_list = generate_initial_experiments_from_plan(intervention_plan)
            outcome_packet = verify_all_project_experiments(experiment_list.experiments)
            radar_snapshot = synthesize_failure_radar_snapshot(
                signal_packet=signal_packet,
                dna_packet=dna_packet,
                chain_packet=chain_packet,
                intervention_plan=intervention_plan,
                experiment_list=experiment_list,
                memory_packet=memory_packet,
            )
        else:
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
            evidence_count = len(evidence_packet.evidence or [])
            logger.info("[EVIDENCE_AGENT] input_chunks=%s evidence_items=%s", retrieval_count, evidence_count)

            if evidence_count == 0:
                pipeline_flags["evidence_agent_status"] = "COMPLETED"
                pipeline_flags["evidence_agent_reason"] = None
                pipeline_flags["signal_agent_status"] = "BLOCKED"
                pipeline_flags["signal_agent_reason"] = "BLOCKED — no grounded evidence"
                logger.warning("[SIGNAL_AGENT] status=BLOCKED reason=no grounded evidence analysis_id=%s", analysis_id)
                from app.schemas.signal_packet import SignalPacket, OverallSignalSummary
                signal_packet = SignalPacket(
                    project_id=project_id,
                    analysis_id=analysis_id,
                    organization_id=organization_id,
                    signals=[],
                    summary=OverallSignalSummary(),
                )
            else:
                pipeline_flags["evidence_agent_status"] = "COMPLETED"
                update_analysis_stage(db, analysis_id, "GROUPING_EVIDENCE", "Validating input packet and clustering evidence...", 80)
                signal_input_context = consume_evidence_packet(
                    packet_input=evidence_packet,
                    authorized_org_id=organization_id,
                    expected_project_id=project_id
                )
                evidence_groups = group_verified_evidence(signal_input_context)
                update_analysis_stage(db, analysis_id, "CORRELATING_PATTERNS", "Detecting numerical trends and cross-source patterns...", 88)
                detected_trends = detect_trends_from_groups(evidence_groups)
                relationships = detect_evidence_relationships(evidence_groups, detected_trends)
                update_analysis_stage(db, analysis_id, "SYNTHESIZING_SIGNALS", "Synthesizing operational signals and strength metrics...", 88)
                signal_packet = generate_signal_packet(
                    context=signal_input_context,
                    groups=evidence_groups,
                    trends=detected_trends,
                    relationships=relationships
                )
                pipeline_flags["signal_agent_status"] = "COMPLETED"
                logger.info(
                    "[SIGNAL_AGENT] input_evidence=%s signals=%s",
                    evidence_count,
                    len(signal_packet.signals or []),
                )

            from app.services.dna_engine import calculate_failure_dna
            from app.services.failure_chain_engine import generate_failure_chain_and_prediction
            from app.services.memory_engine import search_historical_failure_cases
            from app.services.simulation_engine import run_what_if_simulations
            from app.services.intervention_engine import generate_intervention_plan
            from app.services.experiment_engine import generate_initial_experiments_from_plan
            from app.services.outcome_engine import verify_all_project_experiments
            from app.services.radar_engine import synthesize_failure_radar_snapshot

            update_analysis_stage(db, analysis_id, "CALCULATING_FAILURE_DNA", "Computing multi-dimensional Failure DNA & Health...", 92)
            dna_packet = calculate_failure_dna(
                signal_packet=signal_packet,
                evidence_packet=evidence_packet
            )
            update_analysis_stage(db, analysis_id, "BUILDING_FAILURE_CHAIN", "Modeling causal failure trajectory & predictions...", 95)
            chain_packet = generate_failure_chain_and_prediction(
                signal_packet=signal_packet,
                dna_packet=dna_packet
            )
            update_analysis_stage(db, analysis_id, "RUNNING_SIMULATIONS", "Matching historical memory & simulating what-if scenarios...", 97)
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
            update_analysis_stage(db, analysis_id, "SYNTHESIZING_DECISIONS", "Formulating prioritized interventions & failure radar...", 98)
            intervention_plan = generate_intervention_plan(
                signal_packet=signal_packet,
                dna_packet=dna_packet,
                chain_packet=chain_packet,
                memory_packet=memory_packet,
                simulation_packet=simulation_packet
            )
            experiment_list = generate_initial_experiments_from_plan(intervention_plan)
            outcome_packet = verify_all_project_experiments(experiment_list.experiments)
            radar_snapshot = synthesize_failure_radar_snapshot(
                signal_packet=signal_packet,
                dna_packet=dna_packet,
                chain_packet=chain_packet,
                intervention_plan=intervention_plan,
                experiment_list=experiment_list,
                memory_packet=memory_packet
            )

        # Stage 12: Relational Database Persistence
        update_analysis_stage(db, analysis_id, "PERSISTING_ANALYSIS", "Persisting Intelligence & Decision Packets...", 99)
        
        analysis = db.query(ProjectAnalysis).filter(ProjectAnalysis.id == analysis_id).first()
        if analysis:
            analysis.evidence_packet = evidence_packet.model_dump()
            analysis.signal_packet = signal_packet.model_dump()
            analysis.failure_dna = dna_packet.model_dump()
            analysis.failure_chain = chain_packet.model_dump()
            analysis.historical_matches = memory_packet.model_dump()
            analysis.simulations = simulation_packet.model_dump()
            analysis.interventions = intervention_plan.model_dump()
            analysis.experiments = experiment_list.model_dump()
            analysis.outcomes = outcome_packet.model_dump()
            analysis.radar_snapshot = radar_snapshot.model_dump()
            merged_metrics = evidence_packet.metrics.model_dump() if evidence_packet.metrics else {}
            merged_metrics.update(pipeline_flags)
            analysis.metrics = merged_metrics
            
            # Clear any existing items for this analysis_id to ensure idempotency
            db.query(EvidenceItem).filter(EvidenceItem.analysis_id == analysis_id).delete()
            db.query(EvidenceConflict).filter(EvidenceConflict.analysis_id == analysis_id).delete()
            db.query(SignalItem).filter(SignalItem.analysis_id == analysis_id).delete()
            db.flush()

            # Save individual evidence items for relational querying
            for item in evidence_packet.evidence:
                db_item = EvidenceItem(
                    id=f"{analysis_id}_{item.id}_{uuid.uuid4().hex[:6]}",
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
                    id=f"{analysis_id}_{conflict.id}_{uuid.uuid4().hex[:6]}",
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
                    id=f"{analysis_id}_{sig.signal_id}_{uuid.uuid4().hex[:6]}",
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
        try:
            db.rollback()
            update_analysis_stage(db, analysis_id, "FAILED", "Analysis encountered an error", 0, error_msg=str(e))
        except Exception as update_err:
            logger.error(f"[analysis_orchestrator] Failed to record failure state for {analysis_id}: {update_err}")
    finally:
        db.close()


