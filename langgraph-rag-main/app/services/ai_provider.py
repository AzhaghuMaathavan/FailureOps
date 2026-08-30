import abc
import time
import httpx
import logging
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security_crypto import decrypt_secret
from app.core.ssrf_guard import validate_custom_endpoint_url
from app.services.agent_service import key_manager

logger = logging.getLogger(__name__)


class BaseAIProvider(abc.ABC):
    @abc.abstractmethod
    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        timeout: float = 60.0
    ) -> Tuple[str, float]:
        """
        Executes server-side chat completion. Returns (content, latency_ms).
        """
        pass

    @abc.abstractmethod
    def test_connection(self, timeout: float = 15.0) -> Dict[str, Any]:
        """
        Validates credentials and endpoint connectivity with minimal ping payload.
        """
        pass


class NvidiaRotaryProvider(BaseAIProvider):
    def __init__(self):
        self.model = settings.NVIDIA_LLM_MODEL
        self.base_url = settings.NVIDIA_BASE_URL

    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        timeout: float = 60.0
    ) -> Tuple[str, float]:
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        api_key = key_manager.get_next_key()
        if not api_key:
            raise ValueError("No valid NVIDIA API key available for LLM.")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        t_start = time.time()
        with httpx.Client(timeout=timeout) as client:
            resp = client.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
        latency_ms = round((time.time() - t_start) * 1000, 2)

        content = data["choices"][0]["message"].get("content", "")
        return content, latency_ms

    def test_connection(self, timeout: float = 15.0) -> Dict[str, Any]:
        try:
            content, latency_ms = self.generate_chat_completion(
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=10,
                timeout=timeout
            )
            return {
                "success": True,
                "provider": "nvidia",
                "model": self.model,
                "latency_ms": latency_ms
            }
        except Exception as e:
            return {
                "success": False,
                "code": "CONNECTION_FAILED",
                "message": f"NVIDIA provider test failed: {e}"
            }


class OpenAICompatibleCustomProvider(BaseAIProvider):
    def __init__(self, endpoint_url: str, model_name: str, encrypted_api_key: str):
        self.raw_endpoint = endpoint_url.rstrip("/")
        # If user didn't include /v1 or /chat/completions, normalize endpoint
        if self.raw_endpoint.endswith("/chat/completions"):
            self.completion_url = self.raw_endpoint
        elif self.raw_endpoint.endswith("/v1"):
            self.completion_url = f"{self.raw_endpoint}/chat/completions"
        else:
            self.completion_url = f"{self.raw_endpoint}/v1/chat/completions"

        self.model = model_name
        self.encrypted_key = encrypted_api_key

    def _get_headers(self) -> Dict[str, str]:
        decrypted_key = decrypt_secret(self.encrypted_key)
        return {
            "Authorization": f"Bearer {decrypted_key}",
            "Content-Type": "application/json"
        }

    def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        json_mode: bool = False,
        temperature: float = 0.1,
        max_tokens: int = 2048,
        timeout: float = 60.0
    ) -> Tuple[str, float]:
        # 1. SSRF Validation
        is_safe, code, msg = validate_custom_endpoint_url(
            self.completion_url,
            allow_dev_localhost=(settings.ENVIRONMENT == "development")
        )
        if not is_safe:
            raise PermissionError(f"SSRF Security Violation: {msg} ({code})")

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        headers = self._get_headers()

        t_start = time.time()
        try:
            with httpx.Client(timeout=timeout, follow_redirects=False) as client:
                resp = client.post(self.completion_url, headers=headers, json=payload)
                resp.raise_for_status()
                data = resp.json()
            latency_ms = round((time.time() - t_start) * 1000, 2)

            content = data["choices"][0]["message"].get("content", "")
            return content, latency_ms
        except httpx.HTTPStatusError as e:
            logger.error(f"[CUSTOM_AI] HTTP {e.response.status_code} from provider: {e.response.text[:200]}")
            if e.response.status_code in (401, 403):
                raise ValueError("Custom AI Provider authentication failed: Invalid API credentials.") from e
            raise RuntimeError(f"Custom AI Provider returned HTTP error {e.response.status_code}.") from e
        except httpx.TimeoutException as e:
            raise TimeoutError(f"Custom AI Provider request timed out after {timeout}s.") from e
        except Exception as e:
            logger.error(f"[CUSTOM_AI] Request failed: {e}")
            raise RuntimeError(f"Custom AI Provider request failed: {e}") from e

    def test_connection(self, timeout: float = 15.0) -> Dict[str, Any]:
        try:
            # Send lightweight test message
            content, latency_ms = self.generate_chat_completion(
                messages=[
                    {"role": "system", "content": "You are a test connection assistant."},
                    {"role": "user", "content": "Respond with 'ok'."}
                ],
                max_tokens=15,
                timeout=timeout
            )
            return {
                "success": True,
                "provider": "custom",
                "model": self.model,
                "latency_ms": latency_ms,
                "message": "Connection handshake successful."
            }
        except PermissionError as e:
            return {
                "success": False,
                "code": "SSRF_BLOCKED",
                "message": str(e)
            }
        except ValueError as e:
            return {
                "success": False,
                "code": "INVALID_CREDENTIALS",
                "message": str(e)
            }
        except TimeoutError as e:
            return {
                "success": False,
                "code": "REQUEST_TIMEOUT",
                "message": str(e)
            }
        except Exception as e:
            return {
                "success": False,
                "code": "PROVIDER_ERROR",
                "message": f"Connection test failed: {e}"
            }


def get_active_ai_provider(db: Session, organization_id: str) -> BaseAIProvider:
    """
    Resolves the active AI provider for the given tenant.
    Falls back gracefully to the default Nvidia rotary provider if custom is not configured.
    """
    from app.models.custom_ai import CustomAIConfig
    custom_cfg = db.query(CustomAIConfig).filter(
        CustomAIConfig.organization_id == organization_id,
        CustomAIConfig.is_active == True,
        CustomAIConfig.status == "CONNECTED"
    ).first()

    if custom_cfg and custom_cfg.endpoint_url and custom_cfg.encrypted_api_key:
        return OpenAICompatibleCustomProvider(
            endpoint_url=custom_cfg.endpoint_url,
            model_name=custom_cfg.model_name,
            encrypted_api_key=custom_cfg.encrypted_api_key
        )

    return NvidiaRotaryProvider()
