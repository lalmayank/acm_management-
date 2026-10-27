import asyncio
import sys
import os
import argparse
import getpass
from sqlalchemy import select
from sqlalchemy.orm import selectinload

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import Base
from app.db.session import async_engine, AsyncSessionLocal
from app.models.user import User, Role
from app.core.security import hash_password
from app.core.permissions import RoleEnum
from app.db.init_db import init_database


async def create_admin(email: str, name: str, password: str):
    # Ensure tables and roles exist
    await init_database()

    async with AsyncSessionLocal() as session:
        # Check if user already exists
        stmt = select(User).where(User.email == email.strip().lower()).options(selectinload(User.roles))
        res = await session.execute(stmt)
        user = res.scalar_one_or_none()

        role_stmt = select(Role).where(Role.name == RoleEnum.ADMIN.value)
        admin_role = (await session.execute(role_stmt)).scalar_one()

        if user:
            print(f"User with email '{email}' already exists. Updating to Admin role and resetting password...")
            user.name = name
            user.password_hash = hash_password(password)
            user.is_active = True
            if admin_role not in user.roles:
                user.roles.append(admin_role)
            await session.commit()
            print(f"SUCCESS: Admin account '{email}' updated successfully.")
            return

        new_admin = User(
            email=email.strip().lower(),
            name=name.strip(),
            password_hash=hash_password(password),
            is_active=True,
            roles=[admin_role],
        )
        session.add(new_admin)
        await session.commit()
        print(f"SUCCESS: Admin account created successfully!")
        print(f"  Name:     {name}")
        print(f"  Email:    {email}")
        print(f"  Role:     ADMIN")


def main():
    parser = argparse.ArgumentParser(description="Create or bootstrap an Admin account for ACM Shark Tank.")
    parser.add_argument("--email", type=str, help="Admin email address")
    parser.add_argument("--name", type=str, help="Admin full name")
    parser.add_argument("--password", type=str, help="Admin password")

    args = parser.parse_args()

    email = args.email
    name = args.name
    password = args.password

    if not email:
        email = input("Enter Admin Email: ").strip()
    if not name:
        name = input("Enter Admin Full Name: ").strip()
    if not password:
        password = getpass.getpass("Enter Admin Password: ").strip()
        confirm = getpass.getpass("Confirm Admin Password: ").strip()
        if password != confirm:
            print("ERROR: Passwords do not match.")
            sys.exit(1)

    if not email or not password or not name:
        print("ERROR: Name, email, and password cannot be empty.")
        sys.exit(1)

    asyncio.run(create_admin(email, name, password))


if __name__ == "__main__":
    main()
