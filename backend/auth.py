"""Minimal shared-password auth for the POS.

A single admin password (env var ADMIN_PASSWORD) protects the whole API.
On login the server hands back a stable bearer token derived from the
password; the frontend stores it and sends it on every request. This is
intentionally simple — one operator, one password — not multi-user auth.
"""

import hashlib
import hmac
import os

from fastapi import Header, HTTPException

# The password required to log in. Set this in the hosting dashboard.
# Falls back to a placeholder ONLY so local dev works without config —
# never rely on the fallback in production.
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")

# Optional independent secret for signing the token. Defaults to the
# password so a single env var is enough to get started.
_AUTH_SECRET = os.environ.get("AUTH_SECRET", ADMIN_PASSWORD)


def _expected_token() -> str:
    """Deterministic token for the current password/secret."""
    return hmac.new(
        _AUTH_SECRET.encode("utf-8"), b"pos-auth-v1", hashlib.sha256
    ).hexdigest()


def verify_password(password: str) -> bool:
    return hmac.compare_digest(password or "", ADMIN_PASSWORD)


def issue_token() -> str:
    return _expected_token()


def require_auth(authorization: str = Header(default="")) -> None:
    """FastAPI dependency: reject requests without a valid bearer token."""
    prefix = "Bearer "
    token = authorization[len(prefix):] if authorization.startswith(prefix) else ""
    if not token or not hmac.compare_digest(token, _expected_token()):
        raise HTTPException(status_code=401, detail="Not authenticated.")
