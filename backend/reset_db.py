import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import async_engine
from app.db.init_db import init_database


async def reset_database():
    print("WARNING: This will delete ALL mock data, tickets, teams, and users.")
    async with async_engine.begin() as conn:
        print("Dropping all existing database tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("All tables dropped.")

    print("Re-creating clean database schema and baseline roles...")
    await init_database()
    print("SUCCESS: Database is now completely clean and empty.")
    print("Run `python backend/create_admin.py` to create your initial administrator account.")


if __name__ == "__main__":
    asyncio.run(reset_database())
