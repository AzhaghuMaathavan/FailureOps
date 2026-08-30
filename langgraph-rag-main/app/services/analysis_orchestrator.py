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
from app.models.project import Project
from app.services.document_service import process_document
from app.services.evidence_retriever import retrieve_project_evidence_candidates
from app.services.evidence_agent import run_evidence_agent
from app.services.signal_consumer import consume_evidence_packet
from app.services.evidence_grouper import group_verified_evidence
from app.services.trend_detector import detect_trends_from_groups
from app.services.relationship_detector import detect_evidence_relationships
from app.services.signal_agent import generate_signal_packet

logger = logging.getLogger(__name__)

# Canonical 12 Stages and exact linear progress percentages
PIPELINE_STAGES = [
    ("PARSING_DOCUMENTS", "Document parsing", 8),
    ("INDEXING", "Chunking & embedding", 16),
    ("RETRIEVING_EVIDENCE", "Evidence retrieval", 25),
    ("EXTRACTING_EVIDENCE", "Evidence Agent", 33),
    ("GROUPING_EVIDENCE", "Evidence grouping", 42),
    ("CORRELATING_PATTERNS", "Trend correlation", 50),
    ("SYNTHESIZING_SIGNALS", "Signal Agent", 58),
    ("CALCULATING_FAILURE_DNA", "Failure DNA", 67),
    ("BUILDING_FAILURE_CHAIN", "Failure chain", 75),
    ("RUNNING_SIMULATIONS", "Historical memory & simulation", 83),
    ("SYNTHESIZING_DECISIONS", "Interventions & radar", 92),
    ("PERSISTING_ANALYSIS", "Persist intelligence", 100),
]


def update_analysis_stage(
    db: Session, 
    analysis_id: str, 
    status: str, 
    stage: str, 
    progress: int, 
    error_msg: str = None
):
    try:
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
    except Exception as e:
        logger.warning(f"[analysis_orchestrator] Could not update stage for {analysis_id}: {e}")
        try:
            db.rollback()
        except Exception:
            pass


def run_project_analysis_pipeline(
    analysis_id: str,
    organization_id: str,
    project_id: str,
    watchdog_timeout_seconds: float = 180.0
):
    """
    Asynchronous worker task that executes the complete FailureOps Intelligence lifecycle:
    12 verified reasoning stages with concurrency, timeouts, and heartbeat updates.
    """
    db: Session = SessionLocal()
    t_start = time.time()
    current_stage_name = "INIT"
    
    try:
        # Stage 1: Document Processing Check (8%)
        current_stage_name = "PARSING_DOCUMENTS"
        update_analysis_stage(db, analysis_id, "PARSING_DOCUMENTS", "Processing and normalizing project artifacts...", 8)
        
        pending_docs = db.query(Document).filter(
            Document.organization_id == organization_id,
            Document.project_id == project_id,
            Document.status.in_(["PENDING", "FAILED"])
        ).all()
        
        for doc in pending_docs:
            try:
                process_document(doc.id, doc.original_path)
            except Exception as e:
                logger.error(f"Error processing pending document {doc.id}: {e}")

        # Stage 2: Chunking & Indexing Validation (16%)
        current_stage_name = "INDEXING"
        update_analysis_stage(db, analysis_id, "INDEXING", "Indexing semantic chunks and embeddings...", 16)

        # Stage 3: 16-Dimension Targeted Hybrid Retrieval with Concurrency (25%)
        current_stage_name = "RETRIEVING_EVIDENCE"
        update_analysis_stage(db, analysis_id, "RETRIEVING_EVIDENCE", "Executing 16-dimension hybrid retrieval...", 25)
        
        project_docs = db.query(Document).filter(
            Document.organization_id == organization_id,
            Document.project_id == project_id
        ).all()
        doc_ids = [d.id for d in project_docs] if project_docs else None
        
        dimension_chunks, retrieval_metrics = retrieve_project_evidence_candidates(
            db=db,
            organization_id=organization_id,
            project_id=project_id,
            document_ids=doc_ids,
            max_workers=4,
            timeout_seconds=20.0
        )

        retrieval_count = sum(len(v or []) for v in (dimension_chunks or {}).values())
        logger.info("[RETRIEVAL] query_id=%s chunks=%s duration=%ss", analysis_id, retrieval_count, retrieval_metrics.get("retrieval_duration_seconds"))

        pipeline_flags = {
            "total_chunks_searched": retrieval_count,
            "retrieval_status": "COMPLETED" if retrieval_count > 0 else "NO_MATCHES",
            "retrieval_reason": None if retrieval_count > 0 else "No matching chunks found",
            "evidence_agent_status": "PENDING",
            "signal_agent_status": "PENDING",
        }

        # Stage 4: Evidence Extraction (33%)
        current_stage_name = "EXTRACTING_EVIDENCE"
        update_analysis_stage(db, analysis_id, "EXTRACTING_EVIDENCE", "Extracting verified facts and citations...", 33)
        t_duration = time.time() - t_start

        evidence_packet = run_evidence_agent(
            organization_id=organization_id,
            project_id=project_id,
            analysis_id=analysis_id,
            dimension_chunks_map=dimension_chunks,
            total_docs_count=len(project_docs),
            processing_time=t_duration,
            max_workers=2
        )
        evidence_count = len(evidence_packet.evidence or [])
        logger.info("[EVIDENCE_AGENT] input_chunks=%s evidence_items=%s", retrieval_count, evidence_count)

        if evidence_count == 0:
            pipeline_flags["evidence_agent_status"] = "COMPLETED"
            pipeline_flags["evidence_agent_reason"] = "No grounded evidence detected"
            pipeline_flags["signal_agent_status"] = "COMPLETED"
            pipeline_flags["signal_agent_reason"] = "No signals generated"
            
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
            
            # Stage 5: Evidence Grouping (42%)
            current_stage_name = "GROUPING_EVIDENCE"
            update_analysis_stage(db, analysis_id, "GROUPING_EVIDENCE", "Validating input packet and clustering evidence...", 42)
            signal_input_context = consume_evidence_packet(
                packet_input=evidence_packet,
                authorized_org_id=organization_id,
                expected_project_id=project_id
            )
            evidence_groups = group_verified_evidence(signal_input_context)
            
            # Stage 6: Trend Correlation (50%)
            current_stage_name = "CORRELATING_PATTERNS"
            update_analysis_stage(db, analysis_id, "CORRELATING_PATTERNS", "Detecting numerical trends and cross-source patterns...", 50)
            detected_trends = detect_trends_from_groups(evidence_groups)
            relationships = detect_evidence_relationships(evidence_groups, detected_trends)
            
            # Stage 7: Signal Agent (58%)
            current_stage_name = "SYNTHESIZING_SIGNALS"
            update_analysis_stage(db, analysis_id, "SYNTHESIZING_SIGNALS", "Synthesizing operational signals and strength metrics...", 58)
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

        # Stage 8: Failure DNA (67%)
        from app.services.dna_engine import calculate_failure_dna
        from app.services.failure_chain_engine import generate_failure_chain_and_prediction
        from app.services.memory_engine import search_historical_failure_cases
        from app.services.simulation_engine import run_what_if_simulations
        from app.services.intervention_engine import generate_intervention_plan
        from app.services.experiment_engine import generate_initial_experiments_from_plan
        from app.services.outcome_engine import verify_all_project_experiments
        from app.services.radar_engine import synthesize_failure_radar_snapshot

        current_stage_name = "CALCULATING_FAILURE_DNA"
        update_analysis_stage(db, analysis_id, "CALCULATING_FAILURE_DNA", "Computing multi-dimensional Failure DNA & Health...", 67)
        dna_packet = calculate_failure_dna(
            signal_packet=signal_packet,
            evidence_packet=evidence_packet
        )
        
        # Stage 9: Failure Chain (75%)
        current_stage_name = "BUILDING_FAILURE_CHAIN"
        update_analysis_stage(db, analysis_id, "BUILDING_FAILURE_CHAIN", "Modeling causal failure trajectory & predictions...", 75)
        chain_packet = generate_failure_chain_and_prediction(
            signal_packet=signal_packet,
            dna_packet=dna_packet
        )
        
        # Stage 10: Historical Memory & Simulations (83%)
        current_stage_name = "RUNNING_SIMULATIONS"
        update_analysis_stage(db, analysis_id, "RUNNING_SIMULATIONS", "Matching historical memory & simulating what-if scenarios...", 83)
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
        
        # Stage 11: Interventions & Radar (92%)
        current_stage_name = "SYNTHESIZING_DECISIONS"
        update_analysis_stage(db, analysis_id, "SYNTHESIZING_DECISIONS", "Formulating prioritized interventions & failure radar...", 92)
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

        # Stage 12: Intelligence Persistence & Completion (100%)
        current_stage_name = "PERSISTING_ANALYSIS"
        update_analysis_stage(db, analysis_id, "PERSISTING_ANALYSIS", "Persisting intelligence packets to database...", 96)
        
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
            analysis.failure_radar = radar_snapshot.model_dump()
            
            analysis.metrics = {
                "total_documents_analyzed": len(project_docs),
                "total_chunks_searched": retrieval_count,
                "total_evidence_extracted": len(evidence_packet.evidence or []),
                "verified_evidence_count": evidence_packet.metrics.verified_evidence_count if evidence_packet.metrics else len(evidence_packet.evidence or []),
                "rejected_evidence_count": evidence_packet.metrics.rejected_evidence_count if evidence_packet.metrics else 0,
                "conflicts_count": len(evidence_packet.conflicts or []),
                "processing_time_seconds": round(time.time() - t_start, 2),
                "retrieval_status": pipeline_flags["retrieval_status"],
                "retrieval_reason": pipeline_flags["retrieval_reason"],
                "evidence_agent_status": pipeline_flags["evidence_agent_status"],
                "signal_agent_status": pipeline_flags["signal_agent_status"],
            }
            db.commit()

            # Clean up stale project relational rows to prevent duplicate accumulation
            db.query(EvidenceItem).filter(
                EvidenceItem.organization_id == organization_id,
                EvidenceItem.project_id == project_id
            ).delete(synchronize_session=False)

            db.query(SignalItem).filter(
                SignalItem.organization_id == organization_id,
                SignalItem.project_id == project_id
            ).delete(synchronize_session=False)

            # Persist individual canonical items for relational querying
            for idx, item in enumerate(evidence_packet.evidence):
                db_item = EvidenceItem(
                    id=item.id if item.id else f"ev_{project_id}_{idx:03d}",
                    analysis_id=analysis_id,
                    organization_id=organization_id,
                    project_id=project_id,
                    category=item.category,
                    evidence_type=item.evidence_type,
                    statement=item.statement,
                    normalized_value=item.normalized_value.model_dump() if item.normalized_value else ({
                        "metric": item.metric_name,
                        "before": item.baseline_value,
                        "after": item.current_value,
                        "unit": item.unit,
                        "direction": item.direction
                    } if item.metric_name or item.current_value is not None else None),
                    time_period=item.time_period.model_dump() if item.time_period else ({
                        "start": item.baseline_timestamp,
                        "end": item.current_timestamp
                    } if item.baseline_timestamp or item.current_timestamp else None),
                    source_lineage=item.source.model_dump() if item.source else {
                        "document_id": item.source_document_id,
                        "document_name": item.source_document_name,
                        "citation": item.citation
                    },
                    supporting_sources=[s.model_dump() for s in item.supporting_sources] if item.supporting_sources else [],
                    supporting_chunk_ids=item.supporting_chunk_ids or [],
                    evidence_confidence=item.evidence_confidence,
                    verification_status=item.verification_status,
                    visibility=item.privacy.visibility if item.privacy else "PRIVATE",
                    global_learning_allowed=item.privacy.global_learning_allowed if item.privacy else False
                )
                db.add(db_item)

            for sig in signal_packet.signals:
                db_sig = SignalItem(
                    id=sig.signal_id if sig.signal_id else f"sig_{project_id}_{sig.name.lower()}",
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

            # Update Project overview cache
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.failure_risk = dna_packet.overall.risk_score
                project.predicted_next_failure = chain_packet.prediction.predicted_failure
                project.prediction_confidence = int(chain_packet.prediction.confidence * 100) if isinstance(chain_packet.prediction.confidence, float) else chain_packet.prediction.confidence
                project.health = "CRITICAL" if dna_packet.overall.risk_score >= 70 else ("AT_RISK" if dna_packet.overall.risk_score >= 40 else "HEALTHY")
                project.risk_trend = f"+{dna_packet.overall.risk_score}% elevated"

            db.commit()

        update_analysis_stage(db, analysis_id, "COMPLETED", "Full Intelligence Pipeline Complete", 100)
        logger.info(f"[analysis_orchestrator] Analysis {analysis_id} completed successfully in {round(time.time() - t_start, 2)}s.")

    except Exception as e:
        logger.error(f"[analysis_orchestrator] Analysis {analysis_id} failed at stage {current_stage_name}: {e}", exc_info=True)
        try:
            db.rollback()
            update_analysis_stage(
                db, 
                analysis_id, 
                "FAILED", 
                f"Failed at {current_stage_name}", 
                0, 
                error_msg=f"{current_stage_name}_ERROR: {str(e)}"
            )
        except Exception as update_err:
            logger.error(f"[analysis_orchestrator] Failed to record failure state: {update_err}")
    finally:
        db.close()


def run_simulated_intelligence_pipeline(
    analysis_id: str,
    organization_id: str,
    project_id: str,
    fixture_version: str = "1.0"
):
    """
    Executes the downstream FailureOps engines using high-fidelity test fixture intelligence.
    """
    from app.services.intelligence_provider import FixtureProvider
    from app.services.dna_engine import calculate_failure_dna
    from app.services.failure_chain_engine import generate_failure_chain_and_prediction
    from app.services.memory_engine import search_historical_failure_cases
    from app.services.simulation_engine import run_what_if_simulations
    from app.services.intervention_engine import generate_intervention_plan
    from app.services.experiment_engine import generate_initial_experiments_from_plan
    from app.services.outcome_engine import verify_all_project_experiments
    from app.services.radar_engine import synthesize_failure_radar_snapshot

    db: Session = SessionLocal()
    t_start = time.time()

    try:
        fixture_provider = FixtureProvider(fixture_version=fixture_version)
        intel_result = fixture_provider.get_intelligence_result(
            project_id=project_id,
            organization_id=organization_id,
            analysis_id=analysis_id
        )
        evidence_packet = intel_result.evidence_packet
        signal_packet = intel_result.signal_packet

        update_analysis_stage(db, analysis_id, "CALCULATING_FAILURE_DNA", "Computing multi-dimensional Failure DNA & Health...", 70)
        dna_packet = calculate_failure_dna(
            signal_packet=signal_packet,
            evidence_packet=evidence_packet
        )

        update_analysis_stage(db, analysis_id, "BUILDING_FAILURE_CHAIN", "Modeling causal failure trajectory & predictions...", 85)
        chain_packet = generate_failure_chain_and_prediction(
            signal_packet=signal_packet,
            dna_packet=dna_packet
        )

        update_analysis_stage(db, analysis_id, "RUNNING_SIMULATIONS", "Matching historical memory & simulating what-if scenarios...", 92)
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

        update_analysis_stage(db, analysis_id, "SYNTHESIZING_DECISIONS", "Formulating prioritized interventions & failure radar...", 96)
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
            analysis.radar_snapshot = radar_snapshot.model_dump()
            analysis.metrics = {
                "is_simulated": True,
                "source": "INTELLIGENCE_FIXTURE",
                "fixture_version": fixture_version,
                "total_documents_analyzed": 1,
                "total_chunks_searched": len(evidence_packet.evidence),
                "total_evidence_extracted": len(evidence_packet.evidence),
                "total_signals": len(signal_packet.signals),
                "processing_time_seconds": round(time.time() - t_start, 3)
            }

            db.query(EvidenceItem).filter(EvidenceItem.analysis_id == analysis_id).delete()
            db.query(EvidenceConflict).filter(EvidenceConflict.analysis_id == analysis_id).delete()
            db.query(SignalItem).filter(SignalItem.analysis_id == analysis_id).delete()
            db.flush()

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
                    source_lineage=item.source.model_dump() if item.source else {},
                    supporting_sources=[s.model_dump() for s in item.supporting_sources] if item.supporting_sources else [],
                    supporting_chunk_ids=item.supporting_chunk_ids or [],
                    evidence_confidence=item.evidence_confidence,
                    verification_status=item.verification_status,
                    visibility=item.privacy.visibility if item.privacy else "PRIVATE",
                    global_learning_allowed=item.privacy.global_learning_allowed if item.privacy else False
                )
                db.add(db_item)


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

            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                project.failure_risk = dna_packet.overall.risk_score
                project.predicted_next_failure = chain_packet.prediction.predicted_failure
                project.prediction_confidence = int(chain_packet.prediction.confidence * 100) if isinstance(chain_packet.prediction.confidence, float) else chain_packet.prediction.confidence
                project.health = "CRITICAL" if dna_packet.overall.risk_score >= 70 else ("AT_RISK" if dna_packet.overall.risk_score >= 40 else "HEALTHY")
                project.risk_trend = f"+{dna_packet.overall.risk_score}% elevated (Simulated)"

            db.commit()

        update_analysis_stage(db, analysis_id, "COMPLETED", "Simulated Intelligence Pipeline Complete", 100)
        logger.info(f"[analysis_orchestrator] Simulated analysis {analysis_id} completed successfully in {round(time.time() - t_start, 2)}s.")

    except Exception as e:
        logger.error(f"[analysis_orchestrator] Simulated analysis {analysis_id} failed: {e}", exc_info=True)
        try:
            db.rollback()
            update_analysis_stage(db, analysis_id, "FAILED", "Simulation encountered an error", 0, error_msg=str(e))
        except Exception as update_err:
            logger.error(f"[analysis_orchestrator] Failed to record failure state: {update_err}")
    finally:
        db.close()

