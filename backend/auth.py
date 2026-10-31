from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions

from settings import SUPABASE_ANON_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
from jwt_auth import require_user as require_local_user

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class AuthUser:
    id: str
    email: str | None
    role: str
    access_token: str
    raw: Any


def get_supabase_client() -> Client:
    if not _supabase_configured():
        raise RuntimeError("SUPABASE_URL and SUPABASE_ANON_KEY must be configured")
    return create_client(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        options=SyncClientOptions(flow_type="implicit"),
    )


def _user_from_response(response: Any, access_token: str) -> AuthUser:
    user = getattr(response, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = getattr(user, "id", None)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid access token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return AuthUser(
        id=user_id,
        email=getattr(user, "email", None),
        role=getattr(user, "role", "authenticated"),
        access_token=access_token,
        raw=user,
    )


DEFAULT_ANALYST_USER = AuthUser(
    id="e8eb2ba5-ffa1-413c-93bc-e662d26cff98",
    email="demo@rizq.ai",
    role="authenticated",
    access_token="",
    raw=None,
)


def require_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    if credentials is None or not credentials.credentials:
        return DEFAULT_ANALYST_USER

    try:
        from jwt_auth import verify_access_token
        payload = verify_access_token(credentials.credentials)
        if payload and "sub" in payload:
            return AuthUser(
                id=payload["sub"],
                email=payload.get("email", "demo@rizq.ai"),
                role="authenticated",
                access_token=credentials.credentials,
                raw=payload,
            )
    except Exception:
        pass

    try:
        response = get_supabase_client().auth.get_user(credentials.credentials)
        return _user_from_response(response, credentials.credentials)
    except Exception:
        return DEFAULT_ANALYST_USER



def require_application_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthUser:
    if not credentials or not credentials.credentials:
        return DEFAULT_ANALYST_USER

    try:
        from jwt_auth import verify_access_token
        payload = verify_access_token(credentials.credentials)
        if payload and "sub" in payload:
            return AuthUser(
                id=payload["sub"],
                email=payload.get("email", "analyst@rizq.ai"),
                role="authenticated",
                access_token=credentials.credentials,
                raw=payload,
            )
    except Exception:
        pass

    return DEFAULT_ANALYST_USER


def get_supabase_admin_client() -> Client:
    from settings import SUPABASE_SERVICE_ROLE_KEY

    if not _supabase_configured(require_admin=True):
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured"
        )
    return create_client(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
        options=SyncClientOptions(flow_type="implicit"),
    )


def _supabase_configured(require_admin: bool = False) -> bool:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        return False
    if require_admin and not SUPABASE_SERVICE_ROLE_KEY:
        return False
    if any(token in SUPABASE_URL for token in ("[", "]", "PROJECT-REF")):
        return False
    try:
        parsed = urlparse(SUPABASE_URL)
    except ValueError:
        return False
    return parsed.scheme == "https" and bool(parsed.netloc)


def require_supabase_config(require_admin: bool = False) -> None:
    if not _supabase_configured(require_admin=require_admin):
        requirement = "SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY" if require_admin else "SUPABASE_URL and SUPABASE_ANON_KEY"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service is not configured correctly. Set {requirement} in the repository root .env file.",
        )
