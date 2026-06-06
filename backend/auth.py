"""Admin authentication: bcrypt password check + JWT access tokens.

Secrets are read from the environment at call time (main.py loads .env before
routers import this module):
  - ADMIN_USERNAME       admin login id
  - ADMIN_PASSWORD_HASH  bcrypt hash of the admin password (see scripts/hash_password.py)
  - JWT_SECRET           signing key for access tokens
"""
import os
import time

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 12 * 60 * 60  # 12 hours

_bearer = HTTPBearer(auto_error=False)


def _jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET", "")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set — cannot issue or verify tokens")
    return secret


def verify_credentials(username: str, password: str) -> bool:
    """Return True only if username matches and password verifies against the bcrypt hash."""
    expected_user = os.environ.get("ADMIN_USERNAME", "")
    pw_hash = os.environ.get("ADMIN_PASSWORD_HASH", "")
    if not expected_user or not pw_hash:
        return False
    if username != expected_user:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), pw_hash.encode("utf-8"))
    except ValueError:
        # Malformed hash in env
        return False


def create_access_token(username: str, now: int | None = None) -> str:
    issued = now if now is not None else int(time.time())
    payload = {"sub": username, "iat": issued, "exp": issued + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)


def require_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    """FastAPI dependency: enforce a valid Bearer token. Returns the subject (username)."""
    if credentials is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Authentication required")
    try:
        payload = jwt.decode(
            credentials.credentials, _jwt_secret(), algorithms=[JWT_ALGORITHM]
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return payload.get("sub", "")
