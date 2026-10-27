import io
import csv
import re
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.team import Team, TeamMember
from app.models.participant import Participant
from app.models.user import User, Role
from app.schemas.team import (
    TeamCreate,
    TeamUpdate,
    TeamResponse,
    TeamMemberResponse,
    TeamCSVImportResult,
)
from app.core.security import hash_password
from app.core.permissions import RoleEnum
from app.api.deps import require_roles

router = APIRouter(prefix="/teams", tags=["Teams"])


def generate_clean_team_code(name: str, count: int) -> str:
    """Generate a simple, clean, non-fuzzy code like ALPHA-01 or TEAM-01."""
    clean_name = re.sub(r"[^A-Za-z0-9]", "", name).upper()
    prefix = clean_name[:6] if clean_name else "TEAM"
    return f"{prefix}-{count + 1:02d}"


@router.get("/", response_model=List[TeamResponse])
async def list_teams(db: AsyncSession = Depends(get_db)):
    """List all registered teams with member lists."""
    stmt = (
        select(Team)
        .options(
            selectinload(Team.members)
            .selectinload(TeamMember.participant)
            .selectinload(Participant.user)
        )
        .order_by(Team.presentation_order.asc().nulls_last(), Team.name.asc())
    )
    res = await db.execute(stmt)
    teams = res.scalars().all()

    results = []
    for t in teams:
        members_resp = []
        college_name = None
        for m in t.members:
            if m.participant and m.participant.college and not college_name:
                college_name = m.participant.college
            members_resp.append(
                TeamMemberResponse(
                    id=m.id,
                    participant_id=m.participant_id,
                    name=m.participant.name if m.participant else "Member",
                    email=m.participant.user.email if m.participant and m.participant.user else "",
                    registration_code=m.participant.registration_code if m.participant else "",
                    college=m.participant.college if m.participant else None,
                    status=m.status,
                )
            )

        results.append(
            TeamResponse(
                id=t.id,
                name=t.name,
                team_code=t.team_code,
                project_title=t.project_title,
                description=t.description,
                college=college_name,
                leader_id=t.leader_id,
                presentation_order=t.presentation_order,
                members=members_resp,
            )
        )
    return results


@router.get("/{team_id}", response_model=TeamResponse)
async def get_team_detail(team_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Fetch details of a specific team."""
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(
            selectinload(Team.members)
            .selectinload(TeamMember.participant)
            .selectinload(Participant.user)
        )
    )
    res = await db.execute(stmt)
    team = res.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    members_resp = []
    college_name = None
    for m in team.members:
        if m.participant and m.participant.college and not college_name:
            college_name = m.participant.college
        members_resp.append(
            TeamMemberResponse(
                id=m.id,
                participant_id=m.participant_id,
                name=m.participant.name if m.participant else "Member",
                email=m.participant.user.email if m.participant and m.participant.user else "",
                registration_code=m.participant.registration_code if m.participant else "",
                college=m.participant.college if m.participant else None,
                status=m.status,
            )
        )

    return TeamResponse(
        id=team.id,
        name=team.name,
        team_code=team.team_code,
        project_title=team.project_title,
        description=team.description,
        college=college_name,
        leader_id=team.leader_id,
        presentation_order=team.presentation_order,
        members=members_resp,
    )


@router.post("/", response_model=TeamResponse, dependencies=[Depends(require_roles("admin"))])
async def create_team(data: TeamCreate, db: AsyncSession = Depends(get_db)):
    """Admin creates a team and optionally registers members directly."""
    existing_count = (await db.execute(select(func.count(Team.id)))).scalar_one()

    # Simple auto-generated team code if not supplied
    team_code = data.team_code.strip().upper() if data.team_code else generate_clean_team_code(data.name, existing_count)

    # Check duplicate team name or code
    chk = await db.execute(
        select(Team).where((Team.name == data.name) | (Team.team_code == team_code))
    )
    if chk.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Team name or team code already exists")

    part_role = (await db.execute(select(Role).where(Role.name == RoleEnum.PARTICIPANT.value))).scalar_one()

    team = Team(
        name=data.name.strip(),
        team_code=team_code,
        project_title=data.project_title or data.name,
        description=data.description,
    )
    db.add(team)
    await db.flush()

    leader_id = None

    # Handle direct members creation
    if data.members_data:
        for idx, m_in in enumerate(data.members_data, start=1):
            email = m_in.email.strip().lower()
            name = m_in.name.strip()
            member_college = m_in.college or data.college

            reg_code = f"{team_code}-M{idx}"

            # Check if user already exists
            u_stmt = select(User).where(User.email == email)
            user = (await db.execute(u_stmt)).scalar_one_or_none()
            user_pwd = m_in.password.strip() if m_in.password and m_in.password.strip() else "participant123"
            if not user:
                user = User(
                    email=email,
                    name=name,
                    password_hash=hash_password(user_pwd),
                    is_active=True,
                    roles=[part_role],
                )
                db.add(user)
                await db.flush()
            elif m_in.password and m_in.password.strip():
                user.password_hash = hash_password(user_pwd)

            # Check or create participant
            p_stmt = select(Participant).where(Participant.user_id == user.id)
            part = (await db.execute(p_stmt)).scalar_one_or_none()
            if not part:
                part = Participant(
                    user_id=user.id,
                    registration_code=reg_code,
                    name=name,
                    college=member_college,
                )
                db.add(part)
                await db.flush()

            if idx == 1:
                leader_id = part.id

            db.add(TeamMember(team_id=team.id, participant_id=part.id, status="ACTIVE"))

    # Link any pre-existing registration codes if supplied
    all_codes = set(data.member_registration_codes or [])
    if data.leader_registration_code:
        all_codes.add(data.leader_registration_code)

    for code in all_codes:
        p_res = await db.execute(select(Participant).where(Participant.registration_code == code))
        p = p_res.scalar_one_or_none()
        if p:
            if not leader_id and code == data.leader_registration_code:
                leader_id = p.id
            existing_mem = await db.execute(
                select(TeamMember).where(TeamMember.participant_id == p.id, TeamMember.status == "ACTIVE")
            )
            if not existing_mem.scalar_one_or_none():
                db.add(TeamMember(team_id=team.id, participant_id=p.id, status="ACTIVE"))

    team.leader_id = leader_id
    await db.commit()
    return await get_team_detail(team.id, db)


@router.post("/import-csv", response_model=TeamCSVImportResult, dependencies=[Depends(require_roles("admin"))])
async def import_teams_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Import Teams and Members from CSV.
    Headers supported: team_name, college, member_name, member_email, phone (optional).
    Rows with the same team_name are grouped together automatically.
    """
    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    # Normalize fieldnames to lowercase
    normalized_rows = []
    for r in reader:
        norm = {k.strip().lower(): v.strip() for k, v in r.items() if k}
        normalized_rows.append(norm)

    part_role = (await db.execute(select(Role).where(Role.name == RoleEnum.PARTICIPANT.value))).scalar_one()

    # Group by team_name
    teams_dict = {}
    for row in normalized_rows:
        t_name = row.get("team_name") or row.get("team")
        if not t_name:
            continue
        if t_name not in teams_dict:
            teams_dict[t_name] = {
                "college": row.get("college") or row.get("college_name") or "",
                "members": [],
            }
        m_name = row.get("member_name") or row.get("name")
        m_email = (row.get("member_email") or row.get("email") or "").lower()
        m_phone = row.get("member_phone") or row.get("phone") or None
        m_password = (
            row.get("password")
            or row.get("pass")
            or row.get("member_password")
            or row.get("login_pass")
            or row.get("user_password")
            or ""
        )

        if m_name and m_email:
            teams_dict[t_name]["members"].append({
                "name": m_name,
                "email": m_email,
                "phone": m_phone,
                "password": m_password.strip(),
                "college": row.get("college") or teams_dict[t_name]["college"],
            })

    total_rows = len(normalized_rows)
    teams_created = 0
    members_created = 0
    errors = []

    for t_name, t_data in teams_dict.items():
        # Check if team already exists
        chk = await db.execute(select(Team).where(Team.name == t_name))
        existing_team = chk.scalar_one_or_none()

        if existing_team:
            team = existing_team
        else:
            team_count = (await db.execute(select(func.count(Team.id)))).scalar_one()
            clean_code = generate_clean_team_code(t_name, team_count)
            team = Team(
                name=t_name,
                team_code=clean_code,
                project_title=f"{t_name} Project",
            )
            db.add(team)
            await db.flush()
            teams_created += 1

        leader_id = team.leader_id

        for idx, m in enumerate(t_data["members"], start=1):
            email = m["email"]
            name = m["name"]
            college = m["college"] or t_data["college"]
            member_pwd = m.get("password") or "participant123"

            reg_code = f"{team.team_code}-M{idx}"

            # Check User
            u_res = await db.execute(select(User).where(User.email == email))
            user = u_res.scalar_one_or_none()
            if not user:
                user = User(
                    email=email,
                    name=name,
                    password_hash=hash_password(member_pwd),
                    is_active=True,
                    roles=[part_role],
                )
                db.add(user)
                await db.flush()
            else:
                # Update password if explicitly provided in CSV
                if m.get("password"):
                    user.password_hash = hash_password(member_pwd)

            # Check Participant
            p_res = await db.execute(select(Participant).where(Participant.user_id == user.id))
            part = p_res.scalar_one_or_none()
            if not part:
                part = Participant(
                    user_id=user.id,
                    registration_code=reg_code,
                    name=name,
                    phone=m["phone"],
                    college=college,
                )
                db.add(part)
                await db.flush()
            else:
                if not part.college and college:
                    part.college = college

            if not leader_id and idx == 1:
                leader_id = part.id

            # Add to team membership
            mem_chk = await db.execute(
                select(TeamMember).where(TeamMember.team_id == team.id, TeamMember.participant_id == part.id)
            )
            if not mem_chk.scalar_one_or_none():
                db.add(TeamMember(team_id=team.id, participant_id=part.id, status="ACTIVE"))
                members_created += 1

        if leader_id and not team.leader_id:
            team.leader_id = leader_id

    await db.commit()
    return TeamCSVImportResult(
        total_rows=total_rows,
        teams_created=teams_created,
        members_created=members_created,
        errors=errors,
    )
