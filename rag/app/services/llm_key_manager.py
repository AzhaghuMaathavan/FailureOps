import os
import re
import time
import threading
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class LLMKeyManager:
    def __init__(self):
        self.keys = []
        self.lock = threading.Lock()
        self.current_index = 0
        self.key_status = {}
        
        self._load_keys()

    def _load_keys(self):
        # 1. Discover sequential keys: NVIDIA_LLM_API_KEY_1, _2, etc.
        # Find all matching environment variables
        env_vars = os.environ.keys()
        
        # We need to sort them numerically to ensure key_1, key_2 are in order
        pattern = re.compile(r'^NVIDIA_LLM_API_KEY_(\d+)$')
        
        matched_keys = []
        for var in env_vars:
            match = pattern.match(var)
            if match:
                idx = int(match.group(1))
                matched_keys.append((idx, var))
                
        matched_keys.sort(key=lambda x: x[0])
        
        for idx, var in matched_keys:
            val = os.getenv(var)
            if val and val.strip():
                self.keys.append(val.strip())
                
        # Fallbacks if no numbered keys found
        if not self.keys:
            fallback = os.getenv("NVIDIA_LLM_API_KEY") or os.getenv("NVIDIA_API_KEY")
            if fallback and fallback.strip():
                self.keys.append(fallback.strip())
                
        for k in self.keys:
            self.key_status[k] = {"available_after": 0.0, "is_invalid": False}
            
        logger.info(f"LLMKeyManager initialized with {len(self.keys)} key(s).")

    def get_next_key(self) -> Optional[str]:
        with self.lock:
            if not self.keys:
                return None
                
            now = time.time()
            
            # Check for an available key in round-robin order
            for _ in range(len(self.keys)):
                k = self.keys[self.current_index]
                self.current_index = (self.current_index + 1) % len(self.keys)
                
                status = self.key_status[k]
                if not status["is_invalid"] and now >= status["available_after"]:
                    return k
                    
            # If all valid keys are rate-limited, find the one that will be available soonest
            valid_keys = [k for k in self.keys if not self.key_status[k]["is_invalid"]]
            if not valid_keys:
                return None
                
            best_key = min(valid_keys, key=lambda k: self.key_status[k]["available_after"])
            self.current_index = (self.keys.index(best_key) + 1) % len(self.keys)
            
            wait_time = self.key_status[best_key]["available_after"] - now
            if wait_time > 0:
                from app.core.config import settings
                if settings.DEMO_MODE:
                    logger.warning(f"[DEMO_MODE] All keys rate-limited. Failing fast, no backoff sleep.")
                    return None
                    
                logger.warning(f"[LLMKeyManager] All keys rate-limited. Sleeping for {wait_time:.2f}s before reusing {self._get_key_label(best_key)}")
                time.sleep(wait_time)
                
            return best_key

    def mark_rate_limited(self, key: str, backoff_seconds: float = 10.0):
        with self.lock:
            if key in self.key_status:
                self.key_status[key]["available_after"] = time.time() + backoff_seconds
                logger.warning(f"[LLMKeyManager] Marked {self._get_key_label(key)} as rate-limited for {backoff_seconds}s.")

    def mark_invalid(self, key: str):
        with self.lock:
            if key in self.key_status:
                self.key_status[key]["is_invalid"] = True
                logger.error(f"[LLMKeyManager] Marked {self._get_key_label(key)} as INVALID (401/403).")

    def _get_key_label(self, key: str) -> str:
        if key in self.keys:
            return f"key_{self.keys.index(key) + 1}"
        return "unknown_key"

    def get_key_label(self, key: str) -> str:
        with self.lock:
            return self._get_key_label(key)

# Global instance
key_manager = LLMKeyManager()
