"""Prediction Agent: Forecasts failure probability, velocity, timeline, and next breakdown points."""
from app.agents.interfaces import PredictionAgentInput, PredictionAgentInterface
from app.services.radar_engine import synthesize_failure_radar_snapshot

__all__ = ["PredictionAgentInput", "PredictionAgentInterface", "synthesize_failure_radar_snapshot"]
