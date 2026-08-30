"""Centralized LLM Request Scheduler, Concurrency Controller & Provider Failover Manager.

Provides bounded concurrency, token rate-pacing, provider state tracking (HEALTHY, THROTTLED, COOLDOWN),
automatic failover, and exponential backoff with jitter and Retry-After support.
"""

import os
import re
import time
import random
import logging
import threading
from typing import Dict, Any, Optional, List, Tuple
from enum import Enum
import httpx
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ProviderState(str, Enum):
    HEALTHY = "HEALTHY"
    THROTTLED = "THROTTLED"
    COOLDOWN = "COOLDOWN"
    DISABLED = "DISABLED"


class LLMKeyEntry:
    def __init__(self, key: str, index: int, label: str):
        self.key = key
        self.index = index
        self.label = label
        self.state = ProviderState.HEALTHY
        self.cooldown_until = 0.0
        self.consecutive_429s = 0
        self.total_requests = 0
        self.total_successes = 0
        self.total_429s = 0
        self.total_errors = 0
        self.last_used_at = 0.0


class CentralLLMScheduler:
    """
    Singleton central scheduler for all LLM calls across EvidenceAgent, SignalAgent,
    and LangGraph nodes. Guarantees bounded concurrency and zero uncontrolled thread bursts.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self.keys: List[LLMKeyEntry] = []
        self.current_key_idx = 0
        
        # Concurrency control
        max_concurrency = int(os.getenv("LLM_MAX_CONCURRENCY", "2"))
        self._semaphore = threading.BoundedSemaphore(value=max(1, max_concurrency))
        
        # Configuration
        self.max_retries = int(os.getenv("LLM_MAX_RETRIES", "4"))
        self.base_delay = float(os.getenv("LLM_RETRY_BASE_DELAY", "2.0"))
        self.max_delay = float(os.getenv("LLM_RETRY_MAX_DELAY", "30.0"))
        self.default_cooldown = float(os.getenv("LLM_COOLDOWN_SECONDS", "15.0"))
        
        self._load_keys()

    def _load_keys(self):
        raw_keys = []
        env_vars = sorted(os.environ.keys())
        pattern = re.compile(r"^NVIDIA_LLM_API_KEY_(\d+)$")
        
        numbered = []
        for var in env_vars:
            match = pattern.match(var)
            if match:
                idx = int(match.group(1))
                val = os.getenv(var)
                if val and val.strip():
                    numbered.append((idx, val.strip()))
        
        numbered.sort(key=lambda x: x[0])
        for idx, val in numbered:
            raw_keys.append(val)
            
        if not raw_keys:
            fallback = os.getenv("NVIDIA_LLM_API_KEY") or os.getenv("NVIDIA_API_KEY")
            if fallback and fallback.strip():
                raw_keys.append(fallback.strip())
                
        self.keys = [
            LLMKeyEntry(key=k, index=i, label=f"provider_key_{i+1}")
            for i, k in enumerate(raw_keys)
        ]
        logger.info(f"[LLMScheduler] Loaded {len(self.keys)} provider key(s) with max_concurrency={self.max_retries}.")

    def _select_key(self) -> Optional[LLMKeyEntry]:
        now = time.time()
        with self._lock:
            if not self.keys:
                return None
                
            # First pass: Look for an already HEALTHY key
            for _ in range(len(self.keys)):
                entry = self.keys[self.current_key_idx]
                self.current_key_idx = (self.current_key_idx + 1) % len(self.keys)
                
                if entry.state == ProviderState.DISABLED:
                    continue
                if entry.cooldown_until <= now:
                    entry.state = ProviderState.HEALTHY
                    return entry
                    
            # Second pass: If all keys are in cooldown, pick the one expiring soonest
            eligible = [k for k in self.keys if k.state != ProviderState.DISABLED]
            if not eligible:
                return None
                
            best = min(eligible, key=lambda k: k.cooldown_until)
            return best

    def _mark_throttled(self, entry: LLMKeyEntry, retry_after: Optional[float] = None):
        with self._lock:
            entry.total_429s += 1
            entry.consecutive_429s += 1
            cooldown = retry_after if retry_after is not None else (self.default_cooldown * min(entry.consecutive_429s, 4))
            entry.cooldown_until = time.time() + cooldown
            entry.state = ProviderState.THROTTLED
            logger.warning(
                f"[LLMScheduler] Marked {entry.label} as THROTTLED for {cooldown:.1f}s "
                f"(consecutive_429s={entry.consecutive_429s})."
            )

    def _mark_success(self, entry: LLMKeyEntry):
        with self._lock:
            entry.total_successes += 1
            entry.consecutive_429s = 0
            entry.state = ProviderState.HEALTHY
            entry.last_used_at = time.time()

    def _mark_disabled(self, entry: LLMKeyEntry):
        with self._lock:
            entry.state = ProviderState.DISABLED
            logger.error(f"[LLMScheduler] Marked {entry.label} as DISABLED (Invalid Key/Auth Failed).")

    def execute_chat_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        json_mode: bool = False,
        timeout: float = 60.0,
        max_tokens: int = 4096,
        model: Optional[str] = None,
        base_url: Optional[str] = None
    ) -> str:
        """
        Thread-safe, rate-paced execution with automatic key failover and backoff.
        """
        from app.core.config import settings
        
        target_model = model or settings.NVIDIA_LLM_MODEL
        target_url = (base_url or settings.NVIDIA_BASE_URL).rstrip("/") + "/chat/completions"
        
        payload: Dict[str, Any] = {
            "model": target_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.1,
            "max_tokens": max_tokens,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        last_error = None
        attempt = 0
        
        while attempt < self.max_retries:
            attempt += 1
            entry = self._select_key()
            if not entry:
                raise RuntimeError("LLM_PROVIDER_UNAVAILABLE: No valid LLM provider keys available.")
                
            # If the selected key is in cooldown, calculate wait
            now = time.time()
            if entry.cooldown_until > now:
                wait_sec = min(entry.cooldown_until - now, self.max_delay)
                logger.info(f"[LLMScheduler] All keys in cooldown. Pacing request by {wait_sec:.2f}s...")
                time.sleep(wait_sec)

            # Acquire bounded concurrency slot
            acquired = self._semaphore.acquire(timeout=timeout)
            if not acquired:
                raise TimeoutError("LLM_TIMEOUT: Concurrency slot acquisition timed out.")
                
            try:
                headers = {
                    "Authorization": f"Bearer {entry.key}",
                    "Content-Type": "application/json"
                }
                
                with httpx.Client(timeout=timeout) as client:
                    resp = client.post(target_url, headers=headers, json=payload)
                    
                    if resp.status_code == 200:
                        self._mark_success(entry)
                        data = resp.json()
                        content = data["choices"][0]["message"].get("content", "")
                        return content
                        
                    elif resp.status_code == 429:
                        retry_after_hdr = resp.headers.get("retry-after")
                        retry_after = None
                        if retry_after_hdr:
                            try:
                                retry_after = float(retry_after_hdr)
                            except ValueError:
                                pass
                        self._mark_throttled(entry, retry_after=retry_after)
                        last_error = f"LLM_RATE_LIMITED on {entry.label} (HTTP 429)"
                        
                    elif resp.status_code in (401, 403):
                        self._mark_disabled(entry)
                        last_error = f"LLM_AUTH_FAILED on {entry.label} (HTTP {resp.status_code})"
                        
                    else:
                        entry.total_errors += 1
                        last_error = f"LLM_ERROR HTTP {resp.status_code}: {resp.text[:200]}"
                        
            except httpx.RequestError as req_err:
                entry.total_errors += 1
                last_error = f"LLM_NETWORK_ERROR: {str(req_err)}"
            finally:
                self._semaphore.release()
                
            # Exponential backoff with jitter before next retry
            jitter = random.uniform(0.5, 1.5)
            delay = min(self.base_delay * (2 ** (attempt - 1)) * jitter, self.max_delay)
            logger.info(f"[LLMScheduler] Attempt {attempt}/{self.max_retries} failed ({last_error}). Retrying in {delay:.2f}s...")
            time.sleep(delay)
            
        raise RuntimeError(f"LLM_MAX_RETRIES_EXCEEDED: Failed after {self.max_retries} attempts. Last error: {last_error}")

    def get_telemetry(self) -> Dict[str, Any]:
        """Returns safe provider telemetry without secret leakage."""
        with self._lock:
            return {
                "total_keys": len(self.keys),
                "providers": [
                    {
                        "label": k.label,
                        "state": k.state.value,
                        "cooldown_remaining_sec": max(0.0, round(k.cooldown_until - time.time(), 1)),
                        "total_requests": k.total_requests,
                        "total_successes": k.total_successes,
                        "total_429s": k.total_429s,
                        "total_errors": k.total_errors,
                    }
                    for k in self.keys
                ]
            }


# Singleton Global Scheduler
llm_scheduler = CentralLLMScheduler()
