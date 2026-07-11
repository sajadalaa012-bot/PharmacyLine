"""Admin-only email + password auth for the POS.

The storefront is public. The admin back office is protected by a single
set of credentials (env vars ADMIN_EMAIL + ADMIN_PASSWORD). On login the
server hands back a stable bearer token derived from a secret; the frontend
stores it and sends it on admin requests. This is intentionally simple —
one admin account — not multi-user auth.
"""

import hashlib
import hmac
import os

from fastapi import Header, HTTPException

# The admin credentials required to sign in. Set these in the hosting
# dashboard. The fallbacks exist ONLY so local dev works without config —
# never rely on them in production.
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@example.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "changeme")

# Optional independent secret for signing the token. Defaults to the
# password so a single env var is enough to get started.
_AUTH_SECRET = os.environ.get("AUTH_SECRET", ADMIN_PASSWORD)


def _expected_token() -> str:
    """Deterministic token for the current secret."""
    return hmac.new(
        _AUTH_SECRET.encode("utf-8"), b"pos-auth-v1", hashlib.sha256
    ).hexdigest()


def verify_credentials(email: str, password: str) -> bool:
    """Constant-time check of both email and password."""
    email_ok = hmac.compare_digest(
        (email or "").strip().lower(), ADMIN_EMAIL.strip().lower()
    )
    password_ok = hmac.compare_digest(password or "", ADMIN_PASSWORD)
    return email_ok and password_ok


def issue_token() -> str:
    return _expected_token()


def require_auth(authorization: str = Header(default="")) -> None:
    """FastAPI dependency: reject requests without a valid bearer token."""
    prefix = "Bearer "
    token = authorization[len(prefix):] if authorization.startswith(prefix) else ""
    if not token or not hmac.compare_digest(token, _expected_token()):
        raise HTTPException(status_code=401, detail="Not authenticated.")
