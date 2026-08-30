import ipaddress
import socket
import urllib.parse
import logging
from typing import Tuple, Optional, Union

logger = logging.getLogger(__name__)

# Disallowed IPv4 and IPv6 Networks
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),         # RFC 1918 private
    ipaddress.ip_network("100.64.0.0/10"),      # Carrier-grade NAT
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),     # Link-local / AWS / GCP Metadata
    ipaddress.ip_network("172.16.0.0/12"),      # RFC 1918 private
    ipaddress.ip_network("192.0.0.0/24"),       # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),       # TEST-NET-1
    ipaddress.ip_network("192.168.0.0/16"),     # RFC 1918 private
    ipaddress.ip_network("198.18.0.0/15"),      # Network benchmark tests
    ipaddress.ip_network("198.51.100.0/24"),    # TEST-NET-2
    ipaddress.ip_network("203.0.113.0/24"),     # TEST-NET-3
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved
    ipaddress.ip_network("::1/128"),            # IPv6 Loopback
    ipaddress.ip_network("fc00::/7"),           # IPv6 Unique local
    ipaddress.ip_network("fe80::/10"),          # IPv6 Link-local
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
}


def is_ip_blocked(ip: Union[ipaddress.IPv4Address, ipaddress.IPv6Address]) -> bool:
    """Checks if an IP address belongs to any blocked/private network range."""
    return any(ip in net for net in BLOCKED_NETWORKS)


def validate_custom_endpoint_url(
    url: str,
    allow_dev_localhost: bool = False
) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Validates a user-supplied external AI endpoint against SSRF attacks.
    Returns (is_valid, error_code, error_message).
    """
    if not url or not isinstance(url, str):
        return False, "EMPTY_URL", "Endpoint URL cannot be empty."

    url = url.strip()
    parsed = urllib.parse.urlparse(url)

    # 1. Scheme Check: HTTPS required (or HTTP in dev with explicit flag)
    if parsed.scheme.lower() not in ("https", "http"):
        return False, "INVALID_SCHEME", "Endpoint URL must start with https://"
    if parsed.scheme.lower() == "http" and not allow_dev_localhost:
        return False, "INSECURE_SCHEME", "HTTPS is strictly required for external AI endpoints in production."

    # 2. Hostname Check
    hostname = parsed.hostname
    if not hostname:
        return False, "INVALID_HOST", "Invalid endpoint hostname."

    hostname_lower = hostname.lower()
    if hostname_lower in BLOCKED_HOSTNAMES and not allow_dev_localhost:
        return False, "RESTRICTED_HOST", f"Connecting to restricted host '{hostname}' is not permitted."

    # 3. Direct IP Address Check
    try:
        ip_obj = ipaddress.ip_address(hostname)
        if is_ip_blocked(ip_obj) and not (allow_dev_localhost and ip_obj.is_loopback):
            return False, "RESTRICTED_IP", f"Access to private/internal IP address '{ip_obj}' is forbidden."
        return True, None, None
    except ValueError:
        # Not a raw IP address; proceed to DNS resolution check
        pass

    # 4. DNS Resolution & Rebinding Prevention Check
    try:
        addr_infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), socket.AF_UNSPEC, socket.SOCK_STREAM)
        if not addr_infos:
            return False, "DNS_RESOLUTION_FAILED", f"Could not resolve domain '{hostname}'."

        for addr_info in addr_infos:
            sockaddr = addr_info[4]
            resolved_ip_str = sockaddr[0]
            resolved_ip = ipaddress.ip_address(resolved_ip_str)

            if is_ip_blocked(resolved_ip) and not (allow_dev_localhost and resolved_ip.is_loopback):
                logger.warning(f"[SSRF_GUARD] Blocked endpoint '{hostname}' resolving to internal IP '{resolved_ip}'")
                return False, "RESTRICTED_RESOLVED_IP", f"Domain '{hostname}' resolves to restricted internal IP address."

    except socket.gaierror as e:
        return False, "DNS_LOOKUP_ERROR", f"Domain name lookup failed for '{hostname}': {e}"
    except Exception as e:
        return False, "VALIDATION_ERROR", f"Failed to validate endpoint '{hostname}': {e}"

    return True, None, None
