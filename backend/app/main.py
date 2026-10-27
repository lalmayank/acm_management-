import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.db.base import Base
from app.db.session import async_engine
from app.db.init_db import init_database
from app.services.realtime import ws_manager

from app.api.v1.auth import router as auth_router
from app.api.v1.participants import router as participants_router
from app.api.v1.teams import router as teams_router
from app.api.v1.tickets import router as tickets_router
from app.api.v1.verification import router as verification_router
from app.api.v1.stage import router as stage_router
from app.api.v1.announcements import router as announcements_router
from app.api.v1.tasks import router as tasks_router
from app.api.v1.volunteers import router as volunteers_router
from app.api.v1.reports import router as reports_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("acm_shark_tank")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    logger.info("Starting ACM Shark Tank Event Operations Platform...")
    logger.info(f"Database target: {'Neon DB (Serverless SSL)' if settings.is_neon_db else 'PostgreSQL'}")

    # Auto-initialize database tables and baseline seeds if needed
    try:
        await init_database()
        logger.info("Database schema and baseline seed ready.")
    except Exception as e:
        logger.warning(f"Database schema auto-init encountered an issue (can be rerun manually): {e}")

    yield

    logger.info("Shutting down operations platform...")
    await async_engine.dispose()


app = FastAPI(
    title="ACM Shark Tank Operations Platform API",
    version="1.0.0",
    description="Unified event operations API for participants, volunteers, and organizers.",
    lifespan=lifespan,
)

# Dynamic CORS Configuration from Settings (.env)
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [str(settings.CORS_ORIGINS)]
cors_origin_regex = getattr(settings, "CORS_ORIGIN_REGEX", None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(auth_router, prefix=api_v1_prefix)
app.include_router(participants_router, prefix=api_v1_prefix)
app.include_router(teams_router, prefix=api_v1_prefix)
app.include_router(tickets_router, prefix=api_v1_prefix)
app.include_router(verification_router, prefix=api_v1_prefix)
app.include_router(stage_router, prefix=api_v1_prefix)
app.include_router(announcements_router, prefix=api_v1_prefix)
app.include_router(tasks_router, prefix=api_v1_prefix)
app.include_router(volunteers_router, prefix=api_v1_prefix)
app.include_router(reports_router, prefix=api_v1_prefix)


# Realtime WebSocket Endpoint for Live Stage & Announcement Synchronization
@app.websocket("/ws/live")
async def websocket_live_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; client may send ping or messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)


@app.get("/health")
async def health_check():
    """Health check endpoint that tests database connectivity."""
    db_status = "ok"
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"unreachable: {str(e)}"

    return {
        "status": "healthy" if db_status == "ok" else "degraded",
        "database": db_status,
        "is_neon_db": settings.is_neon_db,
        "environment": settings.ENVIRONMENT,
    }
