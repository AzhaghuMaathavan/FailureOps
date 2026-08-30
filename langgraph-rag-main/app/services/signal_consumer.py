import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime, timezone
from pydantic import ValidationError
from app.schemas.evidence_packet import EvidencePacket
from app.schemas.signal_input import SignalInputContext, VerifiedEvidenceContextItem

logger = logging.getLogger(__name__)

class EvidencePacketValidationError(Exception):
    def __init__(self, code: str, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}

class EvidencePacketValidator:
    @staticmethod
    def validate_and_normalize(
        packet_input: Union[Dict[str, Any], EvidencePacket],
        authorized_org_id: str,
        expected_project_id: Optional[str] = None
    ) -> SignalInputContext:
        """
        Validates an incoming Evidence Packet against schema, multi-tenant boundaries,
        and verification integrity rules.
        """
        if packet_input is None:
            raise EvidencePacketValidationError("MISSING_PACKET", "Evidence packet payload is required.")

        # 1. Parse into typed EvidencePacket model
        if isinstance(packet_input, EvidencePacket):
            packet = packet_input
        elif isinstance(packet_input, dict):
            try:
                packet = EvidencePacket(**packet_input)
            except ValidationError as e:
                raise EvidencePacketValidationError(
                    "INVALID_SCHEMA", 
                    f"Evidence packet schema validation failed: {e.errors()}",
                    details={"validation_errors": e.errors()}
                )
            except Exception as e:
                raise EvidencePacketValidationError("MALFORMED_PACKET", f"Malformed evidence packet: {str(e)}")
        else:
            raise EvidencePacketValidationError("UNSUPPORTED_TYPE", "Evidence packet must be a dict or EvidencePacket instance.")

        # 2. Required identifier presence
        if not packet.project_id or not packet.project_id.strip():
            raise EvidencePacketValidationError("MISSING_PROJECT_ID", "Evidence packet missing valid project_id.")
            
        if not packet.analysis_id or not packet.analysis_id.strip():
            raise EvidencePacketValidationError("MISSING_ANALYSIS_ID", "Evidence packet missing valid analysis_id.")

        # 3. Multi-Tenant Security Check
        if not authorized_org_id or packet.organization_id != authorized_org_id:
            logger.warning(
                f"[tenant_isolation] Unauthorized packet access. Packet org: '{packet.organization_id}', Authenticated org: '{authorized_org_id}'"
            )
            raise EvidencePacketValidationError(
                "UNAUTHORIZED_ORGANIZATION", 
                "Cross-tenant access violation: authenticated session does not own this evidence packet."
            )

        if expected_project_id and packet.project_id != expected_project_id:
            raise EvidencePacketValidationError(
                "PROJECT_MISMATCH",
                f"Project mismatch: packet is for '{packet.project_id}' but expected '{expected_project_id}'."
            )

        # 4. Filter and validate evidence items
        verified_items: list[VerifiedEvidenceContextItem] = []
        rejected_count = 0
        total_input = len(packet.evidence)

        for it in packet.evidence:
            # Rule: only VERIFIED evidence enters the Signal Engine
            if it.verification_status != "VERIFIED":
                rejected_count += 1
                continue

            # Rule: source lineage must be preserved and non-empty
            if not it.source or not it.source.document_name:
                rejected_count += 1
                logger.info(f"[signal_consumer] Evidence {it.id} rejected due to missing source lineage.")
                continue

            norm = it.normalized_value
            time_per = it.time_period
            m_name = it.metric_name or (norm.metric if norm else None)
            base_v = it.baseline_value if it.baseline_value is not None else (norm.before if norm else None)
            prev_v = it.previous_value
            curr_v = it.current_value if it.current_value is not None else (norm.after if norm else None)
            u = it.unit or (norm.unit if norm else None)
            d = it.direction or (norm.direction if norm else None)
            b_ts = it.baseline_timestamp or (time_per.start if time_per else None)
            p_ts = it.previous_timestamp
            c_ts = it.current_timestamp or (time_per.end if time_per else None)
            b_to_c = it.baseline_to_current_change_percent
            if b_to_c is None and base_v is not None and curr_v is not None and base_v != 0:
                b_to_c = round(((curr_v - base_v) / base_v) * 100, 2)
            p_to_c = it.previous_to_current_change_percent
            if p_to_c is None and prev_v is not None and curr_v is not None and prev_v != 0:
                p_to_c = round(((curr_v - prev_v) / prev_v) * 100, 2)

            verified_items.append(
                VerifiedEvidenceContextItem(
                    evidence_id=it.id,
                    category=it.category,
                    type=it.evidence_type,
                    statement=it.statement,
                    fact_type=it.fact_type,
                    metric_name=m_name,
                    baseline_value=base_v,
                    previous_value=prev_v,
                    current_value=curr_v,
                    unit=u,
                    direction=d,
                    baseline_timestamp=b_ts,
                    previous_timestamp=p_ts,
                    current_timestamp=c_ts,
                    baseline_to_current_change_percent=b_to_c,
                    previous_to_current_change_percent=p_to_c,
                    normalized_value=norm,
                    time_period=time_per,
                    source=it.source,
                    supporting_sources=it.supporting_sources,
                    supporting_chunk_ids=it.supporting_chunk_ids,
                    confidence=it.evidence_confidence,
                    privacy=it.privacy
                )
            )

        return SignalInputContext(
            project_id=packet.project_id,
            analysis_id=packet.analysis_id,
            organization_id=packet.organization_id,
            received_at=datetime.now(timezone.utc).isoformat(),
            verified_evidence=verified_items,
            conflicts=packet.conflicts,
            coverage=packet.coverage,
            total_input_count=total_input,
            verified_count=len(verified_items),
            rejected_unverified_count=rejected_count,
            metrics=packet.metrics.model_dump() if packet.metrics else {}
        )

def consume_evidence_packet(
    packet_input: Union[Dict[str, Any], EvidencePacket],
    authorized_org_id: str,
    expected_project_id: Optional[str] = None
) -> SignalInputContext:
    """
    Clean service entry-point for Feature 1 (Signal Input / Evidence Packet Consumer).
    """
    return EvidencePacketValidator.validate_and_normalize(
        packet_input=packet_input,
        authorized_org_id=authorized_org_id,
        expected_project_id=expected_project_id
    )
