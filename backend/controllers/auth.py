"""Signed bearer token creation and verification for authenticated API routes."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from settings import get_settings


ACCESS_TOKEN_TTL = timedelta(minutes=15)
_bearer_scheme = HTTPBearer(auto_error=False)


class AuthConfigurationError(RuntimeError):
    """Authentication is unavailable because its signing secret is unset."""


def get_signing_secret() -> str:
    configured = get_settings().auth_token_secret
    if configured is None or not configured.get_secret_value().strip():
        raise AuthConfigurationError("AUTH_TOKEN_SECRET is not configured")
    return configured.get_secret_value()


def issue_access_token(user_id: str, secret: str) -> tuple[str, datetime]:
    issued_at = datetime.now(timezone.utc).replace(microsecond=0)
    expires_at = issued_at + ACCESS_TOKEN_TTL
    token = jwt.encode(
        {
            "sub": user_id,
            "iat": int(issued_at.timestamp()),
            "exp": int(expires_at.timestamp()),
        },
        secret,
        algorithm="HS256",
    )
    return token, expires_at


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _user_id_from_credentials(
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    if credentials is None:
        return None

    try:
        secret = get_signing_secret()
    except AuthConfigurationError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured",
        ) from error

    try:
        claims = jwt.decode(
            credentials.credentials,
            secret,
            algorithms=["HS256"],
            options={"require": ["sub", "iat", "exp"]},
        )
    except jwt.InvalidTokenError as error:
        raise _unauthorized() from error

    user_id = claims.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise _unauthorized()
    return user_id


def get_optional_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
) -> str | None:
    """Return a verified bearer identity when supplied, otherwise None."""
    return _user_id_from_credentials(credentials)


def get_current_user_id(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)
    ],
) -> str:
    """Verify a bearer token and return its authenticated account UUID."""
    user_id = _user_id_from_credentials(credentials)
    if user_id is None:
        raise _unauthorized()
    return user_id
