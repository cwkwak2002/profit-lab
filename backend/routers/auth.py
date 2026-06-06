"""Admin authentication — login endpoint that issues JWT access tokens."""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from auth import create_access_token, verify_credentials

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    if not verify_credentials(req.username, req.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    return LoginResponse(access_token=create_access_token(req.username))
