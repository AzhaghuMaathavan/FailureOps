"""Signal Agent: Detects weak signals, metrics anomalies, and trajectory drift from evidence."""
from app.agents.interfaces import SignalAgentInput, SignalAgentInterface
from app.services.signal_agent import SignalAgent

__all__ = ["SignalAgentInput", "SignalAgentInterface", "SignalAgent"]
