from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.participant import Participant
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user via Email OR Participant Registration Code.
    Sets secure HTTP-only cookie and returns Bearer token with primary role.
    """
    identifier = request.email_or_registration_id.strip()

    # Find user by email or registration code
    stmt = (
        select(User)
        .outerjoin(Participant, User.id == Participant.user_id)
        .where((User.email == identifier) | (Participant.registration_code == identifier))
        .options(selectinload(User.roles), selectinload(User.participant))
    )
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact event organizers.",
        )

    roles = [r.name.lower() for r in user.roles]

    # Authoritative primary role resolution: admin > volunteer > participant
    if "admin" in roles:
        primary_role = "admin"
    elif "volunteer" in roles:
        primary_role = "volunteer"
    else:
        primary_role = "participant"

    access_token = create_access_token(
        subject=str(user.id),
        roles=roles,
        extra_claims={"email": user.email, "primary_role": primary_role},
    )

    # Set HTTP-only cookie for secure browser sessions
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="lax",
        secure=False,  # Can be True in production HTTPS
        max_age=86400,
    )

    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        roles=roles,
        registration_code=user.participant.registration_code if user.participant else None,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp,
        primary_role=primary_role,
    )


@router.post("/logout")
async def logout(response: Response):
    """Clear session cookie."""
    response.delete_cookie(key="access_token")
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated identity and role info."""
    roles = [r.name.lower() for r in current_user.roles]
    reg_code = current_user.participant.registration_code if current_user.participant else None
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        is_active=current_user.is_active,
        roles=roles,
        registration_code=reg_code,
    )
