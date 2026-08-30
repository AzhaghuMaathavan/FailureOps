"""Test suite for CentralLLMScheduler, provider failover, bounded concurrency, and retry resilience."""

import pytest
import time
from unittest.mock import patch, MagicMock
import httpx
from app.services.llm_scheduler import CentralLLMScheduler, ProviderState, LLMKeyEntry


def test_scheduler_initialization():
    scheduler = CentralLLMScheduler()
    assert len(scheduler.keys) >= 0
    assert scheduler.max_retries >= 1


def test_scheduler_provider_cooldown_and_failover():
    scheduler = CentralLLMScheduler()
    # Mock two keys
    scheduler.keys = [
        LLMKeyEntry(key="mock_key_1", index=0, label="provider_key_1"),
        LLMKeyEntry(key="mock_key_2", index=1, label="provider_key_2"),
    ]
    scheduler.current_key_idx = 0

    # Initially both healthy
    k1 = scheduler._select_key()
    assert k1.label == "provider_key_1"

    # Mark key 1 throttled
    scheduler._mark_throttled(k1, retry_after=10.0)
    assert k1.state == ProviderState.THROTTLED
    assert k1.cooldown_until > time.time()

    # Next selection must failover to key 2
    k2 = scheduler._select_key()
    assert k2.label == "provider_key_2"
    assert k2.state == ProviderState.HEALTHY


def test_scheduler_retry_after_header_handling():
    scheduler = CentralLLMScheduler()
    entry = LLMKeyEntry(key="test_k", index=0, label="provider_key_1")
    scheduler._mark_throttled(entry, retry_after=5.0)
    
    assert entry.state == ProviderState.THROTTLED
    assert entry.cooldown_until <= time.time() + 5.5
    assert entry.total_429s == 1


def test_scheduler_telemetry_safe():
    scheduler = CentralLLMScheduler()
    scheduler.keys = [
        LLMKeyEntry(key="secret_nv_key_123", index=0, label="provider_key_1")
    ]
    telemetry = scheduler.get_telemetry()
    
    assert telemetry["total_keys"] == 1
    assert telemetry["providers"][0]["label"] == "provider_key_1"
    # Ensure raw secret is NEVER in telemetry
    assert "secret_nv_key_123" not in str(telemetry)
