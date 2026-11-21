"""
app/auth.py — P08-T01
FastAPI dependency for internal service-to-service authentication.
Laravel → ai-service calls must include X-Internal-Secret header.
"""
import os

from fastapi import Header, HTTPException


def require_internal_auth(
    x_internal_secret: str = Header(..., alias="X-Internal-Secret"),
) -> None:
    """FastAPI dependency: validates X-Internal-Secret against env var."""
    expected = os.getenv("LARAVEL_INTERNAL_SECRET", "changeme-dev-secret")
    if not x_internal_secret or x_internal_secret != expected:
        raise HTTPException(status_code=401, detail="Invalid internal secret")
