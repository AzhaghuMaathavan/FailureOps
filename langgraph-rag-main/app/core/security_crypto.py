import os
import base64
import hashlib
from typing import Optional
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

def _get_derived_key() -> bytes:
    """
    Derives a deterministic 256-bit (32-byte) key for AES-GCM from the application SECRET_KEY.
    """
    raw_key = getattr(settings, "ENCRYPTION_KEY", None) or getattr(settings, "SECRET_KEY", "failureops-default-secure-secret-key-2026")
    return hashlib.sha256(raw_key.encode("utf-8")).digest()


def encrypt_secret(secret_text: str) -> str:
    """
    Encrypts sensitive text using AES-GCM-256 with a unique 12-byte initialization vector.
    Returns URL-safe base64 encoded string containing nonce + ciphertext + auth tag.
    """
    if not secret_text:
        return ""
    key = _get_derived_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce
    ciphertext = aesgcm.encrypt(nonce, secret_text.encode("utf-8"), None)
    payload = nonce + ciphertext
    return base64.urlsafe_b64encode(payload).decode("utf-8")


def decrypt_secret(encrypted_b64: str) -> str:
    """
    Decrypts a base64 encoded payload with AES-GCM-256.
    """
    if not encrypted_b64:
        return ""
    try:
        payload = base64.urlsafe_b64decode(encrypted_b64.encode("utf-8"))
        if len(payload) < 13:
            raise ValueError("Invalid encrypted payload size")
        nonce = payload[:12]
        ciphertext = payload[12:]
        key = _get_derived_key()
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except Exception as e:
        raise ValueError(f"Secret decryption failed: {e}") from e


def mask_secret(secret_text: Optional[str]) -> str:
    """
    Masks a secret for display without exposing any intermediate or full tokens.
    Example: '••••••••••••••••' or '••••••••5a2f'
    """
    if not secret_text:
        return ""
    if len(secret_text) <= 6:
        return "••••••••••••••••"
    return f"••••••••••••{secret_text[-4:]}"
