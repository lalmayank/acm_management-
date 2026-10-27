import asyncio
import logging
from sqlalchemy import select
from app.db.base import Base
from app.db.session import async_engine, AsyncSessionLocal
from app.models.user import Role
from app.models.stage import StageState
from app.core.permissions import RoleEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def init_database():
    """Create all database tables, seed system roles, and initialize stage state."""
    logger.info("Initializing database schema...")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables verified.")

    async with AsyncSessionLocal() as session:
        # Seed foundational roles
        for role_enum in [RoleEnum.ADMIN, RoleEnum.VOLUNTEER, RoleEnum.PARTICIPANT]:
            stmt = select(Role).where(Role.name == role_enum.value)
            result = await session.execute(stmt)
            role_obj = result.scalar_one_or_none()
            if not role_obj:
                role_obj = Role(name=role_enum.value, description=f"{role_enum.value.capitalize()} access role")
                session.add(role_obj)
                logger.info(f"Initialized role: {role_enum.value}")

        # Seed Singleton Stage State if not present
        stmt = select(StageState).where(StageState.id == "default_stage")
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            stage_state = StageState(id="default_stage", current_presentation_id=None, version=1)
            session.add(stage_state)
            logger.info("Initialized stage state.")

        await session.commit()
    logger.info("Database baseline schema and roles ready (clean, no mock data).")


if __name__ == "__main__":
    asyncio.run(init_database())
