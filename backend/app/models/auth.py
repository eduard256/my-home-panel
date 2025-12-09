"""Authentication models."""
from pydantic import BaseModel


class LoginRequest(BaseModel):
    """Login request with access token."""
    token: str


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds until expiration
