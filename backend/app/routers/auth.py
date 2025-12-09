"""
Authentication router.
Handles login and token management.
"""
import logging
from fastapi import APIRouter, HTTPException, status

from app.auth import verify_access_token, create_jwt
from app.config import get_settings
from app.models.auth import LoginRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest) -> TokenResponse:
    """
    Login with access token from .env.
    Returns JWT for subsequent API calls.
    """
    if not verify_access_token(request.token):
        logger.warning("Failed login attempt with invalid token")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token"
        )

    # Create JWT
    settings = get_settings()
    jwt_token = create_jwt()

    # Calculate expiration in seconds
    expires_in = settings.JWT_EXPIRE_DAYS * 24 * 60 * 60

    logger.info("Successful login")

    return TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        expires_in=expires_in
    )
