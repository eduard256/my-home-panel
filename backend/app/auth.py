"""
Authentication module with JWT support.
Provides token verification and JWT creation/validation.
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.config import get_settings, get_jwt_secret

logger = logging.getLogger(__name__)

# HTTP Bearer security scheme
security = HTTPBearer(auto_error=False)


def verify_access_token(token: str) -> bool:
    """
    Verify access token against the one in .env.
    Used for initial login.
    """
    settings = get_settings()
    return token == settings.ACCESS_TOKEN


def create_jwt(data: dict | None = None) -> str:
    """
    Create a JWT token.

    Args:
        data: Additional claims to include in the token

    Returns:
        Encoded JWT token string
    """
    settings = get_settings()
    jwt_secret = get_jwt_secret()

    # Calculate expiration
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRE_DAYS)

    # Prepare payload
    to_encode = {
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access"
    }

    if data:
        to_encode.update(data)

    # Encode token
    encoded_jwt = jwt.encode(
        to_encode,
        jwt_secret,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt


def verify_jwt(token: str) -> dict | None:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        Decoded payload dict if valid, None otherwise
    """
    settings = get_settings()
    jwt_secret = get_jwt_secret()

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError as e:
        logger.debug(f"JWT verification failed: {e}")
        return None


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]
) -> dict:
    """
    FastAPI dependency to get and verify the current user from JWT.

    Raises:
        HTTPException: If token is missing or invalid
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = credentials.credentials
    payload = verify_jwt(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return payload


# Type alias for dependency injection
CurrentUser = Annotated[dict, Depends(get_current_user)]


async def get_current_user_or_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    token: str | None = None
) -> dict:
    """
    FastAPI dependency that supports both Authorization header and query token.
    Useful for SSE endpoints where EventSource doesn't support custom headers.

    Raises:
        HTTPException: If no valid token provided
    """
    # Try Authorization header first
    if credentials is not None:
        payload = verify_jwt(credentials.credentials)
        if payload is not None:
            return payload

    # Fall back to query parameter token
    if token is not None:
        payload = verify_jwt(token)
        if payload is not None:
            return payload

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authorization required",
        headers={"WWW-Authenticate": "Bearer"}
    )


# Type alias for SSE endpoints that need query token support
CurrentUserOrToken = Annotated[dict, Depends(get_current_user_or_token)]


def optional_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)]
) -> dict | None:
    """
    Optional authentication - returns None if no valid token provided.
    Useful for endpoints that work differently for authenticated/unauthenticated users.
    """
    if credentials is None:
        return None

    return verify_jwt(credentials.credentials)


OptionalUser = Annotated[dict | None, Depends(optional_auth)]
