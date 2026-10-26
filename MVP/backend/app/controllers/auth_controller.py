"""Admin Authentication Controller (US 02.1)."""

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    username: str
    password: str


@router.post("/login", summary="Admin Login")
def login(payload: LoginRequest, response: Response):
    """Authenticate administrator credentials and issue HttpOnly session cookie."""
    uname = payload.username.strip()
    if not uname or not payload.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Issue session cookie
    response.set_cookie(
        key="admin_session",
        value=uname,
        httponly=True,
        samesite="lax",
        max_age=3600 * 24,
    )

    return {
        "admin": {
            "id": 1,
            "username": uname,
            "email": "admin@cuchi.gov.vn",
        }
    }


@router.get("/me", summary="Get Current Admin Profile")
def get_current_admin(request: Request):
    """Retrieve authenticated admin profile from active session cookie."""
    session = request.cookies.get("admin_session")
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return {
        "admin": {
            "id": 1,
            "username": session,
            "email": "admin@cuchi.gov.vn",
        }
    }


@router.post("/logout", summary="Admin Logout")
def logout(response: Response):
    """Terminate administrator session and clear cookie."""
    response.delete_cookie("admin_session")
    return {"message": "Logged out successfully"}
