from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.user import User
from app.models.participant import Participant
from app.models.team import Team, TeamMember
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
    Authenticate user via:
    1. Direct Email or Participant Registration Code
    2. Team Name or Team Code + Member's Individual Password
    Sets secure HTTP-only cookie and returns Bearer token with primary role.
    """
    identifier = request.email_or_registration_id.strip()

    # 1. Direct lookup by Email or Registration Code
    stmt = (
        select(User)
        .outerjoin(Participant, User.id == Participant.user_id)
        .where(
            (func.lower(User.email) == identifier.lower())
            | (func.lower(Participant.registration_code) == identifier.lower())
        )
        .options(selectinload(User.roles), selectinload(User.participant))
    )
    res = await db.execute(stmt)
    candidate_user = res.scalar_one_or_none()

    user = None
    if candidate_user and verify_password(request.password, candidate_user.password_hash):
        user = candidate_user
    else:
        # 2. Team lookup by Team Name or Team Code (case-insensitive)
        # Login ID is Team Name / Code, and password matches the individual member's unique password
        team_stmt = (
            select(Team)
            .where(
                (func.lower(Team.name) == identifier.lower())
                | (func.lower(Team.team_code) == identifier.lower())
            )
            .options(
                selectinload(Team.members)
                .selectinload(TeamMember.participant)
                .selectinload(Participant.user)
                .selectinload(User.roles)
            )
        )
        team_res = await db.execute(team_stmt)
        team = team_res.scalar_one_or_none()

        if team:
            for tm in team.members:
                if tm.status == "ACTIVE" and tm.participant and tm.participant.user:
                    cand = tm.participant.user
                    if verify_password(request.password, cand.password_hash):
                        user = cand
                        break

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Sign in with your Team Name, Email, or Registration Code, and your individual password.",
        )

    # Ensure user roles and participant relation are loaded
    refresh_stmt = (
        select(User)
        .where(User.id == user.id)
        .options(selectinload(User.roles), selectinload(User.participant))
    )
    user = (await db.execute(refresh_stmt)).scalar_one()

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
