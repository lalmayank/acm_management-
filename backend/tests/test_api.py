import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


@pytest_asyncio.fixture(scope="session")
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]


@pytest.mark.asyncio
async def test_admin_login(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={
            "email_or_registration_id": "admin@acmsharktank.org",
            "password": "admin123",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["primary_role"] == "admin"


@pytest.mark.asyncio
async def test_participant_login_and_tickets(client):
    res = await client.post(
        "/api/v1/auth/login",
        json={
            "email_or_registration_id": "ACM-001",
            "password": "participant123",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["primary_role"] == "participant"
    token = data["access_token"]

    tick_res = await client.get(
        "/api/v1/participants/me/tickets",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert tick_res.status_code == 200
    tickets = tick_res.json()
    assert len(tickets) > 0


@pytest.mark.asyncio
async def test_stage_current(client):
    res = await client.get("/api/v1/stage/current")
    assert res.status_code == 200
    data = res.json()
    assert "current_presentation" in data
    assert "upcoming_presentations" in data
