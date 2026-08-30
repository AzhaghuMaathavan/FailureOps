"""Prediction Agent: Forecasts failure probability, velocity, timeline, and next breakdown points."""
from app.agents.interfaces import PredictionAgentInput, PredictionAgentInterface
from app.services.radar_engine import FailureRadarEngine

__all__ = ["PredictionAgentInput", "PredictionAgentInterface", "FailureRadarEngine"]
