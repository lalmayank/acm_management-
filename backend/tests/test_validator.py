import asyncio
import uuid
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.user import User, Role
from app.models.ticket import TicketType, TicketEntitlement
from app.models.participant import Participant
from app.services.ticket_redemption import redeem_ticket

async def run_test():
    async with AsyncSessionLocal() as db:
        print("[1] Checking DB connection and roles...")
        res = await db.execute(select(Role))
        roles = res.scalars().all()
        print(f"    Available roles: {[r.name for r in roles]}")
        
        # Find or create a test validator user
        admin_res = await db.execute(select(User).join(User.roles).where(Role.name == "admin"))
        admin = admin_res.scalars().first()
        if not admin:
            user_res = await db.execute(select(User))
            admin = user_res.scalars().first()
            if not admin:
                role_res = await db.execute(select(Role).where(Role.name == "admin"))
                admin_role = role_res.scalar_one()
                admin = User(email="validator_test@acm.org", name="Validator Test", password_hash="dummy", is_active=True)
                admin.roles.append(admin_role)
                db.add(admin)
                await db.flush()
        
        print(f"    Using validator user ID: {admin.id}")

        # Create a ticket type
        tt = TicketType(name="Demo Meal Voucher", category="FOOD", allowed_uses_per_member=1, is_active=True)
        db.add(tt)
        await db.flush()

        # Create a participant
        test_code = f"VAL-{uuid.uuid4().hex[:6].upper()}"
        # Create a user for the participant
        part_user = User(
            email=f"{test_code.lower()}@test.org",
            name="Validation Test Participant",
            password_hash="dummy",
            is_active=True,
        )
        db.add(part_user)
        await db.flush()

        p = Participant(
            user_id=part_user.id,
            name="Validation Test Participant",
            registration_code=test_code,
        )
        db.add(p)
        await db.flush()

        # Create a ticket entitlement
        secret = f"QR-{uuid.uuid4().hex}"
        ent = TicketEntitlement(
            ticket_type_id=tt.id,
            participant_id=p.id,
            secret_code=secret,
            allowed_uses=1,
            used_count=0,
            status="AVAILABLE",
        )
        db.add(ent)
        await db.commit()
        print(f"[2] Created Entitlement for {p.name} ({p.registration_code}) with secret: {secret}")

        # Test Scan 1: Valid
        print("[3] Attempting First Scan...")
        res1 = await redeem_ticket(db, validator_id=admin.id, ticket_reference=secret)
        print(f"    Result 1 -> Outcome: {res1.get('outcome')}, Msg: {res1.get('message')}")
        assert res1["outcome"] == "VALID"
        assert res1["used_count"] == 1
        assert res1["participant_name"] == "Validation Test Participant"

        # Test Scan 2: Duplicate
        print("[4] Attempting Duplicate Second Scan...")
        res2 = await redeem_ticket(db, validator_id=admin.id, ticket_reference=secret)
        print(f"    Result 2 -> Outcome: {res2.get('outcome')}, Msg: {res2.get('message')}")
        assert res2["outcome"] == "ALREADY_REDEEMED"

        # Test Scan 3: Invalid code
        print("[5] Attempting Bogus Reference...")
        res3 = await redeem_ticket(db, validator_id=admin.id, ticket_reference="TOTALLY-FAKE-CODE")
        print(f"    Result 3 -> Outcome: {res3.get('outcome')}, Msg: {res3.get('message')}")
        assert res3["outcome"] == "VERIFICATION_FAILED"

        print("\nAll ticket validator checks PASSED successfully!")

if __name__ == '__main__':
    asyncio.run(run_test())
