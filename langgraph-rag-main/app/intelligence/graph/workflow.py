import logging
from typing import Any
from langgraph.graph import StateGraph, START, END
from .state import FailureOpsGraphState
from .nodes.validation_node import validate_request_node
from .nodes.retrieval_node import retrieve_evidence_node
from .nodes.evidence_node import evidence_agent_node
from .nodes.evidence_validation_node import validate_evidence_node
from .nodes.signal_node import signal_agent_node
from .nodes.signal_validation_node import validate_signals_node
from .nodes.output_node import finalize_output_node

logger = logging.getLogger(__name__)

def build_intelligence_graph() -> Any:
    """
    Constructs the compiled FailureOps X LangGraph Intelligence workflow:
    START -> validate_request -> retrieve_evidence -> evidence_agent ->
    validate_evidence -> signal_agent -> validate_signals -> finalize_output -> END
    """
    builder = StateGraph(FailureOpsGraphState)

    # 1. Register Nodes
    builder.add_node("validate_request", validate_request_node)
    builder.add_node("retrieve_evidence", retrieve_evidence_node)
    builder.add_node("evidence_agent", evidence_agent_node)
    builder.add_node("validate_evidence", validate_evidence_node)
    builder.add_node("signal_agent", signal_agent_node)
    builder.add_node("validate_signals", validate_signals_node)
    builder.add_node("finalize_output", finalize_output_node)

    # 2. Register Linear Pipeline Edges
    builder.add_edge(START, "validate_request")
    builder.add_edge("validate_request", "retrieve_evidence")
    builder.add_edge("retrieve_evidence", "evidence_agent")
    builder.add_edge("evidence_agent", "validate_evidence")
    builder.add_edge("validate_evidence", "signal_agent")
    builder.add_edge("signal_agent", "validate_signals")
    builder.add_edge("validate_signals", "finalize_output")
    builder.add_edge("finalize_output", END)

    compiled = builder.compile()
    logger.info("[Workflow] FailureOps X Intelligence Graph compiled successfully.")
    return compiled

_COMPILED_GRAPH = None

def get_compiled_graph():
    """
    Singleton accessor for the compiled LangGraph workflow.
    """
    global _COMPILED_GRAPH
    if _COMPILED_GRAPH is None:
        _COMPILED_GRAPH = build_intelligence_graph()
    return _COMPILED_GRAPH
