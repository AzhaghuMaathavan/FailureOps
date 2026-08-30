import re
from typing import Dict, Any, List


# Regex patterns for sensitive information detection
SECRET_PATTERNS = [
    (r'(?i)(nvapi-[A-Za-z0-9_\-]{30,})', 'NVIDIA_API_KEY', 'NVIDIA API Key detected'),
    (r'(?i)(sk-[A-Za-z0-9_\-]{20,})', 'OPENAI_API_KEY', 'OpenAI / Anthropic API Key detected'),
    (r'(?i)(ghp_[A-Za-z0-9]{36})', 'GITHUB_TOKEN', 'GitHub Personal Access Token detected'),
    (r'(?i)(AKIA[0-9A-Z]{16})', 'AWS_ACCESS_KEY', 'AWS Access Key ID detected'),
    (r'(?i)(bearer\s+[a-zA-Z0-9_\-\.]{25,})', 'BEARER_TOKEN', 'Authorization Bearer Token detected'),
    (r'(?i)(password|passwd|pwd|secret)\s*[:=]\s*["\']?([^"\'\s\n]{6,})["\']?', 'CREDENTIAL_ASSIGNMENT', 'Hardcoded credential or password assignment detected'),
    (r'\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|127\.0\.0\.1)\b', 'PRIVATE_IP', 'Internal/Private IP address detected'),
    (r'(?i)\bhttps?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|.*\.local|.*\.internal|.*\.corp)\b[^\s]*', 'INTERNAL_URL', 'Internal URL or intranet address detected'),
    (r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', 'PHONE_NUMBER', 'Personal telephone number detected'),
]


def scan_sensitive_information(text: str) -> Dict[str, Any]:
    """
    Performs automated security and PII screening on user content prior to publishing.
    Returns findings and actionable warnings.
    """
    if not text or not isinstance(text, str):
        return {
            "has_sensitive_data": False,
            "findings": [],
            "warning": None
        }

    findings: List[Dict[str, str]] = []
    seen_categories = set()

    for pattern, category, description in SECRET_PATTERNS:
        matches = re.finditer(pattern, text)
        for match in matches:
            matched_str = match.group(0)
            # Mask the sample snippet
            if len(matched_str) > 8:
                masked_sample = f"{matched_str[:3]}...{matched_str[-3:]}"
            else:
                masked_sample = "••••••••"

            findings.append({
                "category": category,
                "description": description,
                "sample": masked_sample
            })
            seen_categories.add(description)

    has_sensitive = len(findings) > 0
    warning_text = None
    if has_sensitive:
        category_list = ", ".join(list(seen_categories)[:3])
        warning_text = f"Potential sensitive information detected ({category_list}). Please review before publishing."

    return {
        "has_sensitive_data": has_sensitive,
        "findings": findings,
        "warning": warning_text
    }
