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

            verified_items.append(
                VerifiedEvidenceContextItem(
                    evidence_id=it.id,
                    category=it.category,
                    type=it.evidence_type,
                    statement=it.statement,
                    normalized_value=it.normalized_value,
                    time_period=it.time_period,
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
